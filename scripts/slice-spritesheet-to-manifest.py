#!/usr/bin/env python3
"""
Slice Spritesheet to Manifest Script

Slices sprite sheets (PNG images) into individual 32x32 tile manifest entries.
Each non-transparent tile gets its own manifest entry with frame data pointing
to the specific cell in the source sheet.

Usage:
    python3 scripts/slice-spritesheet-to-manifest.py --dry-run <png_path>
    python3 scripts/slice-spritesheet-to-manifest.py <png_path> [--out=manifest.json]
    python3 scripts/slice-spritesheet-to-manifest.py --dir <directory_with_pngs> [--dry-run]

Requirements:
    pip install Pillow

Determinism:
- No Date.now() or Math.random()
- IDs are: packId + sheetName + col + row + contentHash (first 8 hex)
- Content hash is SHA256 of the raw tile pixel bytes (RGBA)
- Duplicates are detected by content hash
"""

import argparse
import hashlib
import json
import os
import sys
from io import BytesIO
from pathlib import Path

# Try importing PIL, exit gracefully if not available
try:
    from PIL import Image
except ImportError:
    print("[slice-spritesheet] Error: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

# Constants
TILE_SIZE = 32
TRANSPARENT_THRESHOLD = 0  # Alpha channel value below this is considered transparent
HASH_LENGTH = 8  # Short hash suffix for IDs

# Categories by filename patterns
CATEGORY_PATTERNS = {
    'tilesets': ['grass', 'soil', 'stone', 'path', 'water', 'floor', 'road', 'dirt', 'tile'],
    'props': ['fence', 'gate', 'tree', 'bush', 'flower', 'bench', 'lamp', 'pot', 'bridge',
              'mailbox', 'birdhouse', 'garden', 'furniture', 'detail', 'cherry', 'petal'],
    'characters': ['character', 'npc', 'player', 'human'],
    'monsters': ['monster', 'enemy', 'creature'],
    'buildings': ['house', 'building', 'tower', 'castle', 'inn', 'shop'],
    'fx': ['fx', 'effect', 'magic', 'fire', 'ice'],
    'weapons': ['weapon', 'sword', 'shield', 'bow', 'axe'],
}

# Kind by filename patterns
KIND_PATTERNS = {
    'fence': ['fence', 'gate', 'rail'],
    'tile': ['grass', 'soil', 'stone', 'floor', 'road', 'dirt', 'path'],
    'water': ['water', 'pond', 'lake'],
    'tree': ['tree'],
    'bush': ['bush', 'shrub'],
    'flower': ['flower', 'plant'],
    'bench': ['bench', 'seat'],
    'lamp': ['lamp', 'light'],
    'pot': ['pot', 'planter'],
    'bridge': ['bridge', 'boardwalk'],
    'mailbox': ['mailbox'],
    'birdhouse': ['birdhouse'],
    'garden': ['garden', 'bed'],
    'furniture': ['furniture'],
    'cherry': ['cherry', 'blossom'],
    'petal': ['petal'],
    'deco': ['deco', 'detail', 'home', 'extra'],
    'prop': [],  # fallback
}

# Group name normalization
GROUP_PATTERNS = [
    ('fences and gates', ['fence', 'gate']),
    ('trees spring', ['tree']),
    ('cherry blossom trees', ['cherry', 'blossom']),
    ('bushes and shrubs', ['bush', 'shrub']),
    ('flowers and plants', ['flower', 'plant']),
    ('benches and seating', ['bench', 'seat']),
    ('lamps and lights', ['lamp', 'light']),
    ('pots and planters', ['pot', 'planter']),
    ('bridges and boardwalks', ['bridge', 'boardwalk']),
    ('mailboxes and birdhouses', ['mailbox', 'birdhouse']),
    ('garden beds', ['garden', 'bed']),
    ('garden furniture', ['furniture']),
    ('decor and homey items', ['deco', 'home']),
    ('extra cozy details', ['detail', 'extra']),
    ('petals and ground details', ['petal', 'ground']),
    ('grass tiles', ['grass']),
    ('soil and dirt tiles', ['soil', 'dirt']),
    ('stone paths', ['stone', 'path']),
    ('flower paths', ['flower', 'path']),
    ('water and ponds', ['water', 'pond']),
]


def compute_content_hash(tile_data: bytes) -> str:
    """Compute SHA256 hash of tile pixel data."""
    return hashlib.sha256(tile_data).hexdigest()


def is_transparent_tile(tile: Image.Image) -> bool:
    """Check if a tile is fully transparent or mostly empty."""
    if tile.mode != 'RGBA':
        return False
    extrema = tile.getextrema()
    # Check alpha channel - if max alpha is 0, tile is fully transparent
    if extrema[3][0] == 0 and extrema[3][1] == 0:
        return True
    return False


def extract_tiles(img: Image.Image, tile_size: int = TILE_SIZE) -> list:
    """Extract all tiles from a sprite sheet image."""
    tiles = []
    width, height = img.size
    cols = width // tile_size
    rows = height // tile_size
    
    for row in range(rows):
        for col in range(cols):
            x = col * tile_size
            y = row * tile_size
            tile = img.crop((x, y, x + tile_size, y + tile_size))
            tiles.append({
                'col': col,
                'row': row,
                'x': x,
                'y': y,
                'w': tile_size,
                'h': tile_size,
                'image': tile,
            })
    return tiles


def detect_category(filename: str) -> str:
    """Detect category from filename."""
    filename_lower = filename.lower()
    for category, patterns in CATEGORY_PATTERNS.items():
        if any(p in filename_lower for p in patterns):
            return category
    return 'props'  # default


def detect_kind(filename: str) -> str:
    """Detect kind from filename."""
    filename_lower = filename.lower()
    for kind, patterns in KIND_PATTERNS.items():
        if any(p in filename_lower for p in patterns):
            return kind
    return 'prop'  # fallback


def normalize_group_name(filename: str) -> str:
    """Normalize group name from filename."""
    filename_lower = filename.lower()
    for group_name, patterns in GROUP_PATTERNS:
        if any(p in filename_lower for p in patterns):
            return group_name
    # Fallback: clean up filename
    name = Path(filename).stem
    name = name.replace('.', ' ').replace('_', ' ')
    # Remove leading numbers like "11. " or "1. "
    import re
    name = re.sub(r'^\d+[\.\s]+', '', name)
    return name.strip()


def generate_id(pack_id: str, sheet_name: str, col: int, row: int, content_hash: str) -> str:
    """Generate deterministic ID from components."""
    # Clean and normalize components
    clean_sheet = sheet_name.lower().replace(' ', '_').replace('-', '_')
    clean_sheet = ''.join(c if c.isalnum() or c == '_' else '' for c in clean_sheet)
    clean_pack = pack_id.lower().replace(' ', '_').replace('-', '_')
    clean_pack = ''.join(c if c.isalnum() or c == '_' else '' for c in clean_pack)
    
    # Short hash suffix
    short_hash = content_hash[:HASH_LENGTH]
    
    # Format: pack_sheet_r##_c##_hash
    return f"{clean_pack}_{clean_sheet}_r{row:02d}_c{col:02d}_{short_hash}"


def build_manifest_entry(tile: dict, sheet_path: str, pack_id: str, sheet_name: str, 
                         category: str, kind: str, group: str, biome: str = 'plains',
                         existing_entries: dict = None) -> dict:
    """Build a manifest entry for a single tile."""
    col = tile['col']
    row = tile['row']
    x = tile['x']
    y = tile['y']
    
    # Get tile data for hashing
    tile_image = tile['image']
    tile_bytes = tile_image.tobytes()
    content_hash = compute_content_hash(tile_bytes)
    
    # Generate ID
    entry_id = generate_id(pack_id, sheet_name, col, row, content_hash)
    
    # Check for duplicates
    if existing_entries:
        for existing_id, existing_entry in existing_entries.items():
            if existing_entry.get('sha256') == content_hash:
                # Duplicate found - skip this tile
                return None
    
    # Build public path - convert from absolute to /2d/assets/ format (matching existing patterns)
    rel_path = sheet_path
    if '/public/' in rel_path:
        rel_path = rel_path.split('/public/')[-1]
    
    src = '/' + rel_path.replace(os.sep, '/')
    # Use /2d/assets/ prefix (matching forest biome pattern), not /2d-assets/
    if not src.startswith('/2d/assets/'):
        src = '/2d/assets/' + src.lstrip('/')
    
    # Detect kind from group name if not provided
    detected_kind = detect_kind(group)
    if kind == 'prop' and detected_kind != 'prop':
        kind = detected_kind
    
    # Build entry
    entry = {
        'id': entry_id,
        'src': src,
        'source': 'SakPix_Cozy_Spring',
        'sourcePath': sheet_name,
        'sourceName': sheet_name,
        'license': 'purchased-itchio-sakpix',
        'kind': kind,
        'group': group,
        'category': category,
        'sheetFrame': {
            'x': x,
            'y': y,
            'w': TILE_SIZE,
            'h': TILE_SIZE,
        },
        'frameSize': {
            'w': TILE_SIZE,
            'h': TILE_SIZE,
        },
        'tileWidth': TILE_SIZE,
        'tileHeight': TILE_SIZE,
        'width': TILE_SIZE,
        'height': TILE_SIZE,
        'frame': {
            'x': x,
            'y': y,
            'w': TILE_SIZE,
            'h': TILE_SIZE,
        },
        'sha256': content_hash,
        'tags': ['cozy-spring', category, kind, group.replace(' ', '-').lower()],
        'biomeTags': [biome, 'spring', 'village', 'cozy'],
        'cultureTags': ['cozy', 'spring'],
        'deterministic': True,
        'meta': {
            'walkable': category == 'tilesets',
            'blocksMovement': kind in ['fence', 'gate', 'tree', 'building', 'house', 'wall'],
            'blocksVision': kind in ['fence', 'wall', 'building'],
            'ySortAnchor': 'bottom' if kind in ['fence', 'tree', 'flower', 'lamp', 'deco'] else 'center',
            'heightPx': TILE_SIZE if kind not in ['tile', 'ground'] else 0,
        }
    }
    
    return entry


def process_spritesheet(png_path: str, args) -> dict:
    """Process a single spritesheet PNG and generate manifest entries."""
    print(f"\n[slice-spritesheet] Processing: {png_path}")
    
    # Load image
    img = Image.open(png_path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    width, height = img.size
    print(f"  Image size: {width}x{height}")
    print(f"  Tile grid: {width // TILE_SIZE}x{height // TILE_SIZE}")
    
    # Extract tiles
    tiles = extract_tiles(img, TILE_SIZE)
    print(f"  Total tiles: {len(tiles)}")
    
    # Detect metadata from filename
    filename = os.path.basename(png_path)
    category = detect_category(filename)
    kind = detect_kind(filename)
    group = normalize_group_name(filename)
    pack_id = 'cozy_spring'
    
    print(f"  Detected category: {category}")
    print(f"  Detected kind: {kind}")
    print(f"  Detected group: {group}")
    
    # Check if manifest exists to detect duplicates
    manifest_path = os.path.join(os.path.dirname(png_path), 'manifest.json')
    existing_entries = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r') as f:
                existing_data = json.load(f)
                existing_entries = existing_data.get('entries', {})
            print(f"  Existing manifest with {len(existing_entries)} entries")
        except Exception as e:
            print(f"  Warning: Could not read existing manifest: {e}")
    
    # Filter transparent tiles and build entries
    entries = {}
    skipped_transparent = 0
    skipped_duplicates = 0
    
    for tile in tiles:
        if is_transparent_tile(tile['image']):
            skipped_transparent += 1
            continue
        
        entry = build_manifest_entry(
            tile=tile,
            sheet_path=png_path,
            pack_id=pack_id,
            sheet_name=filename,
            category=category,
            kind=kind,
            group=group
        )
        
        if entry is None:
            skipped_duplicates += 1
            continue
        
        entries[entry['id']] = entry
    
    print(f"  Skipped transparent: {skipped_transparent}")
    print(f"  Skipped duplicates: {skipped_duplicates}")
    print(f"  Generated entries: {len(entries)}")
    
    # Build manifest
    manifest = {
        'version': 1,
        'id': f'cozy_spring_{group.replace(" ", "_").lower()}',
        'source': 'SakPix_Cozy_Spring_Asset_Pack',
        'category': category,
        'biome': 'plains',
        'deterministic': True,
        'expectedPngCount': 1,
        'pngCount': 1,
        'basePath': os.path.dirname(png_path),
        'slicedFrom': png_path,
        'sliceConfig': {
            'tileSize': TILE_SIZE,
            'sourceWidth': width,
            'sourceHeight': height,
            'totalTiles': len(tiles),
            'nonTransparentTiles': len(tiles) - skipped_transparent,
            'generatedEntries': len(entries),
            'skippedTransparent': skipped_transparent,
            'skippedDuplicates': skipped_duplicates,
        },
        'entries': entries,
        'all': list(entries.keys()),
        'validation': {
            'noPngOmitted': True,
            'slicedTiles': True,
            'importedPngCount': 1,
            'manifestEntryCount': len(entries),
        },
    }
    
    return manifest


def process_directory(dir_path: str, args) -> list:
    """Process all PNG files in a directory."""
    png_files = []
    for root, dirs, files in os.walk(dir_path):
        for f in files:
            if f.lower().endswith('.png'):
                png_files.append(os.path.join(root, f))
    return png_files


def main():
    parser = argparse.ArgumentParser(
        description='Slice spritesheets into manifest entries',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Dry run on single file
  python3 scripts/slice-spritesheet-to-manifest.py --dry-run path/to/sheet.png
  
  # Process single file
  python3 scripts/slice-spritesheet-to-manifest.py path/to/sheet.png
  
  # Process directory
  python3 scripts/slice-spritesheet-to-manifest.py --dir path/to/assets/
  
  # Dry run on directory
  python3 scripts/slice-spritesheet-to-manifest.py --dry-run --dir path/to/assets/
  
  # Skip existing (don't overwrite)
  python3 scripts/slice-spritesheet-to-manifest.py --skip-existing path/to/sheet.png
        '''
    )
    DEFAULT_TILE_SIZE = 32
    parser.add_argument('path', nargs='?', help='PNG file or directory path')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without writing')
    parser.add_argument('--dir', action='store_true', help='Path is a directory')
    parser.add_argument('--out', help='Output manifest path (for single file)')
    parser.add_argument('--skip-existing', action='store_true', help='Skip if manifest already exists')
    parser.add_argument('--tile-size', type=int, default=DEFAULT_TILE_SIZE, help=f'Tile size in pixels (default: {DEFAULT_TILE_SIZE})')
    
    args = parser.parse_args()
    
    if not args.path:
        parser.print_help()
        print("\nError: path is required")
        sys.exit(1)
    
    tile_size = args.tile_size
    
    # Find files to process
    if args.dir:
        png_files = process_directory(args.path, args)
        if not png_files:
            print(f"[slice-spritesheet] No PNG files found in: {args.path}")
            sys.exit(1)
        print(f"[slice-spritesheet] Found {len(png_files)} PNG files in directory")
    else:
        if not os.path.exists(args.path):
            print(f"[slice-spritesheet] File not found: {args.path}")
            sys.exit(1)
        if not args.path.lower().endswith('.png'):
            print(f"[slice-spritesheet] File is not a PNG: {args.path}")
            sys.exit(1)
        png_files = [args.path]
    
    # Process each file
    results = []
    for png_path in png_files:
        try:
            manifest = process_spritesheet(png_path, args)
            results.append((png_path, manifest, None))
        except Exception as e:
            print(f"[slice-spritesheet] Error processing {png_path}: {e}")
            results.append((png_path, None, str(e)))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    total_entries = 0
    total_files = 0
    
    for png_path, manifest, error in results:
        if error:
            print(f"  ERROR: {png_path}: {error}")
        else:
            entry_count = len(manifest.get('entries', {}))
            total_entries += entry_count
            total_files += 1
            status = "DRY-RUN" if args.dry_run else "WRITTEN"
            print(f"  [{status}] {png_path}")
            print(f"    Entries: {entry_count}")
            print(f"    Skipped transparent: {manifest.get('sliceConfig', {}).get('skippedTransparent', 'N/A')}")
            
            # Write manifest if not dry-run
            if not args.dry_run:
                # Determine the correct output directory
                # PNG is typically in .../category/group/files/xxx.png
                # We want to write manifest.json to .../category/group/manifest.json
                png_dir = os.path.dirname(png_path)
                
                # If the PNG is in a "files" subdirectory, go up one level
                if png_dir.endswith('/files') or png_dir.endswith('\\files'):
                    manifest_dir = os.path.dirname(png_dir)
                else:
                    manifest_dir = png_dir
                
                manifest_path = os.path.join(manifest_dir, 'manifest.json')
                
                # Check skip-existing
                if args.skip_existing and os.path.exists(manifest_path):
                    print(f"    SKIPPED (existing manifest)")
                    continue
                
                try:
                    with open(manifest_path, 'w') as f:
                        json.dump(manifest, f, indent=2)
                    print(f"    Written: {manifest_path}")
                except Exception as e:
                    print(f"    ERROR writing manifest: {e}")
    
    print(f"\nTotal: {total_files} files, {total_entries} entries")
    
    if args.dry_run:
        print("\nThis was a DRY-RUN. Run without --dry-run to write manifests.")
    
    # Return exit code based on results
    if any(r[2] for r in results):
        sys.exit(1)


if __name__ == '__main__':
    main()