#!/usr/bin/env python3
"""
Extract Cozy Spring Asset Pack using Python's zipfile module.
Handles nested ZIP structure where inner ZIPs contain single sprite sheets.
"""

import zipfile
import io
import os
import json
from pathlib import Path

# Category mapping
CATEGORY_MAP = {
    'grass tiles': {'category': 'tilesets', 'biome': 'plains', 'tags': ['grass', 'tile', 'ground', 'spring', 'green']},
    'soil and dirt tiles': {'category': 'tilesets', 'biome': 'plains', 'tags': ['soil', 'dirt', 'tile', 'ground', 'brown']},
    'stone paths': {'category': 'tilesets', 'biome': 'plains', 'tags': ['stone', 'path', 'road', 'walkway']},
    'flower paths': {'category': 'tilesets', 'biome': 'plains', 'tags': ['flower', 'path', 'road', 'garden']},
    'water and ponds': {'category': 'tilesets', 'biome': 'coastal', 'tags': ['water', 'pond', 'lake', 'liquid']},
    'cherry blossom trees': {'category': 'props', 'biome': 'forest', 'tags': ['tree', 'cherry', 'blossom', 'pink', 'spring']},
    'trees (spring)': {'category': 'props', 'biome': 'forest', 'tags': ['tree', 'spring', 'green', 'nature']},
    'bushes and shrubs': {'category': 'props', 'biome': 'forest', 'tags': ['bush', 'shrub', 'plant', 'green']},
    'flowers and plants': {'category': 'props', 'biome': 'forest', 'tags': ['flower', 'plant', 'garden', 'nature']},
    'petals and ground details': {'category': 'props', 'biome': 'plains', 'tags': ['petal', 'ground', 'detail', 'decoration']},
    'fences and gates': {'category': 'props', 'biome': 'plains', 'tags': ['fence', 'gate', 'barrier', 'wooden']},
    'bridges and boardwalks': {'category': 'props', 'biome': 'forest', 'tags': ['bridge', 'boardwalk', 'wood', 'structure']},
    'garden beds': {'category': 'props', 'biome': 'plains', 'tags': ['garden', 'bed', 'planting', 'vegetable']},
    'garden furniture': {'category': 'props', 'biome': 'plains', 'tags': ['furniture', 'garden', 'bench', 'table']},
    'benches and seating': {'category': 'props', 'biome': 'plains', 'tags': ['bench', 'seat', 'furniture', 'rest']},
    'lamps and lights': {'category': 'props', 'biome': 'plains', 'tags': ['lamp', 'light', 'glow', 'decoration']},
    'mailboxes and birdhouses': {'category': 'props', 'biome': 'plains', 'tags': ['mailbox', 'birdhouse', 'house', 'bird']},
    'pots and planters': {'category': 'props', 'biome': 'plains', 'tags': ['pot', 'planter', 'flower', 'container']},
    'decor and homey items': {'category': 'props', 'biome': 'plains', 'tags': ['decor', 'home', 'decoration', 'cozy']},
    'extra cozy details': {'category': 'props', 'biome': 'plains', 'tags': ['detail', 'decoration', 'cozy', 'spring']},
}

def normalize_name(filename):
    """Normalize filename for category matching."""
    name = filename.lower()
    name = name.replace('.zip', '')
    # Remove leading number prefix like "1. " or "10. "
    import re
    name = re.sub(r'^\d+\.\s*', '', name)
    # Replace separators with spaces
    name = re.sub(r'[^a-z0-9\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def find_category(filename):
    """Find category mapping for a filename."""
    normalized = normalize_name(filename)
    
    for pattern, config in CATEGORY_MAP.items():
        if pattern in normalized or normalized in pattern:
            return config
    
    return {'category': 'props', 'biome': 'plains', 'tags': ['cozy', 'spring', 'decoration']}

def id_for(path):
    """Generate ID from path."""
    import re
    name = os.path.basename(path)
    name = re.sub(r'\.[^.]+$', '', name)  # Remove extension
    name = re.sub(r'[^a-zA-Z0-9]+', '_', name)  # Replace non-alnum with underscore
    name = re.sub(r'^_+|_+$', '', name)  # Trim underscores
    return name.lower()

def main():
    repo_root = Path(__file__).parent.parent
    inbox_dir = repo_root / '.asset-inbox' / 'cozy-spring'
    output_root = repo_root / 'apps' / 'client-2d' / 'public' / '2d-assets' / 'cozy-spring'
    
    print('=== Cozy Spring Asset Pack - Python Import ===')
    print(f'Inbox: {inbox_dir}')
    print(f'Output: {output_root}')
    print()
    
    output_root.mkdir(parents=True, exist_ok=True)
    
    all_entries = {}
    categories = {'tilesets': {}, 'props': {}}
    total_assets = 0
    
    # Find outer ZIP files
    outer_zips = sorted(inbox_dir.glob('*.zip'))
    
    print(f'Found {len(outer_zips)} outer ZIP files\n')
    
    for outer_zip in outer_zips:
        print(f'Processing outer ZIP: {outer_zip.name}')
        
        with zipfile.ZipFile(outer_zip, 'r') as outer:
            inner_names = [n for n in outer.namelist() if n.lower().endswith('.zip')]
            print(f'  Found {len(inner_names)} inner ZIP files')
            
            for inner_name in sorted(inner_names):
                config = find_category(inner_name)
                group_name = normalize_name(inner_name)
                
                print(f'  Processing: {inner_name}')
                print(f'    Category: {config["category"]}, Group: {group_name}')
                
                # Read inner ZIP from outer
                inner_data = outer.read(inner_name)
                
                with zipfile.ZipFile(io.BytesIO(inner_data), 'r') as inner:
                    png_files = [n for n in inner.namelist() if n.lower().endswith('.png')]
                    print(f'    Found {len(png_files)} PNG files')
                    
                    if not png_files:
                        continue
                    
                    # Create output directories
                    files_dir = output_root / config['category'] / group_name / 'files'
                    files_dir.mkdir(parents=True, exist_ok=True)
                    
                    manifest_entries = {}
                    all_ids = []
                    
                    for png_name in png_files:
                        png_data = inner.read(png_name)
                        
                        # Use numbered index for sprite sheets
                        for i, sprite_name in enumerate(png_files):
                            if sprite_name == png_name:
                                sprite_id = f'{id_for(group_name)}_{i+1}'
                                break
                        
                        safe_rel = png_name.replace(' ', '_')
                        out_path = files_dir / safe_rel
                        
                        # Determine kind
                        kind = config['category'] == 'tilesets' and 'tile' or 'prop'
                        for kw in ['grass', 'tile', 'ground', 'path', 'stone', 'water']:
                            if kw in png_name.lower():
                                kind = 'tile'
                                break
                        for kw in ['tree', 'bush', 'flower', 'fence', 'bridge', 'bench', 'lamp']:
                            if kw in png_name.lower():
                                kind = 'prop'
                                break
                        
                        src = f'/2d-assets/cozy-spring/{config["category"]}/{group_name}/files/{safe_rel}'
                        
                        import hashlib
                        file_hash = hashlib.sha256(png_data).hexdigest()
                        
                        manifest_entry = {
                            'id': sprite_id,
                            'src': src,
                            'source': 'SakPix_Cozy_Spring',
                            'sourcePath': png_name,
                            'sourceName': png_name,
                            'license': 'purchased-itchio-sakpix',
                            'kind': kind,
                            'group': group_name,
                            'biome': config['biome'],
                            'category': config['category'],
                            'biomeTags': [config['biome']] + config['tags'],
                            'cultureTags': ['cozy', 'spring'],
                            'tags': ['cozy-spring', config['category']] + config['tags'] + [kind],
                            'bytes': len(png_data),
                            'sha256': file_hash,
                            'deterministic': True,
                        }
                        
                        manifest_entries[sprite_id] = manifest_entry
                        all_ids.append(sprite_id)
                        
                        # Write PNG file
                        with open(out_path, 'wb') as f:
                            f.write(png_data)
                    
                    # Write manifest
                    manifest = {
                        'version': 1,
                        'id': f'cozy_spring_{group_name.replace(" ", "_")}',
                        'source': 'SakPix_Cozy_Spring_Asset_Pack',
                        'category': config['category'],
                        'biome': config['biome'],
                        'generatedAt': '2026-06-02T00:00:00.000Z',
                        'deterministic': True,
                        'expectedPngCount': len(png_files),
                        'pngCount': len(png_files),
                        'basePath': f'/2d-assets/cozy-spring/{config["category"]}/{group_name}',
                        'entries': manifest_entries,
                        'all': all_ids,
                        'validation': {
                            'noPngOmitted': True,
                            'importedPngCount': len(png_files),
                            'manifestEntryCount': len(manifest_entries),
                        },
                    }
                    
                    manifest_path = files_dir.parent / 'manifest.json'
                    with open(manifest_path, 'w') as f:
                        json.dump(manifest, f, indent=2)
                    
                    # Update totals
                    for sid, entry in manifest_entries.items():
                        all_entries[sid] = entry
                    
                    categories[config['category']][group_name] = {
                        'count': len(manifest_entries),
                        'biome': config['biome'],
                    }
                    total_assets += len(manifest_entries)
                    
                    print(f'    Imported {len(manifest_entries)} assets')
    
    # Create master manifest
    print('\n=== Creating Master Manifest ===')
    
    master_manifest = {
        'version': 1,
        'id': 'cozy_spring_master',
        'source': 'SakPix_Cozy_Spring_Asset_Pack',
        'generatedAt': '2026-06-02T00:00:00.000Z',
        'totalEntries': len(all_entries),
        'categories': categories,
        'entries': all_entries,
    }
    
    with open(output_root / 'manifest.json', 'w') as f:
        json.dump(master_manifest, f, indent=2)
    
    # Create README
    readme = f'''# Cozy Spring Asset Pack

Imported by `scripts/extract-cozy-spring.py`.

**Source:** [SakPix on itch.io](https://sakpix.itch.io/cozy-spring-asset-pack-top-down-pixel-art-tileset-300-assets)

**Contents:**
'''
    
    for cat, groups in categories.items():
        readme += f'\n### {cat}\n'
        for name, info in groups.items():
            readme += f'- {name}: {info["count"]} assets ({info["biome"]})\n'
    
    readme += f'''
**Total Assets:** {len(all_entries)}

**License:** Purchased from itch.io - SakPix
'''
    
    with open(output_root / 'README.md', 'w') as f:
        f.write(readme)
    
    print('\n=== Summary ===')
    print(f'Total assets imported: {len(all_entries)}')
    print(f'Output: {output_root}')

if __name__ == '__main__':
    main()