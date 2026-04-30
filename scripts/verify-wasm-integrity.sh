#!/bin/bash

# Configuration
WASM_SEARCH_DIR="${1:-./dist}"
CHECKSUM_STORAGE="./wasm-checksums.json"
NGINX_MIME_TYPES="/etc/nginx/mime.types"
LOCAL_NGINX_CONF="./nginx.conf"

echo "[1/3] Generating and verifying WASM checksums..."

if [ ! -d "$WASM_SEARCH_DIR" ]; then
    echo "Error: Directory $WASM_SEARCH_DIR does not exist."
    exit 1
fi

# Find all .wasm files
WASM_FILES=$(find "$WASM_SEARCH_DIR" -type f -name "*.wasm")

if [ -z "$WASM_FILES" ]; then
    echo "No WASM files found in $WASM_SEARCH_DIR."
else
    # Create temp file for current state
    CURRENT_STATE=$(mktemp)
    echo "{" > "$CURRENT_STATE"
    
    FIRST=true
    for FILE in $WASM_FILES; do
        if [ "$FIRST" = false ]; then echo "," >> "$CURRENT_STATE"; fi
        HASH=$(sha256sum "$FILE" | awk '{ print $1 }')
        BASENAME=$(basename "$FILE")
        echo "  \"$BASENAME\": \"$HASH\"" >> "$CURRENT_STATE"
        FIRST=false
        echo "Check: $BASENAME [SHA256: ${HASH:0:8}...]"
    done
    echo "}" >> "$CURRENT_STATE"

    # Comparison logic
    if [ -f "$CHECKSUM_STORAGE" ]; then
        if diff -q "$CHECKSUM_STORAGE" "$CURRENT_STATE" > /dev/null; then
            echo "Integrity check: SUCCESS (Checksums match)"
        else
            echo "Integrity check: FAILED (Checksums differ from stored reference)"
            diff "$CHECKSUM_STORAGE" "$CURRENT_STATE"
            rm "$CURRENT_STATE"
            exit 1
        fi
    else
        echo "No reference file found. Saving current state to $CHECKSUM_STORAGE."
        cp "$CURRENT_STATE" "$CHECKSUM_STORAGE"
    fi
    rm "$CURRENT_STATE"
fi

echo "[2/3] Validating Nginx MIME-type configuration..."

MIME_FOUND=false
# Check local config first, then system config
for CONF in "$LOCAL_NGINX_CONF" "$NGINX_MIME_TYPES"; do
    if [ -f "$CONF" ]; then
        if grep -q "application/wasm" "$CONF"; then
            echo "Validation: application/wasm found in $CONF"
            MIME_FOUND=true
            break
        fi
    fi
done

if [ "$MIME_FOUND" = false ]; then
    echo "Error: Nginx MIME-type 'application/wasm' not found in $LOCAL_NGINX_CONF or $NGINX_MIME_TYPES."
    echo "Ensure your Nginx configuration contains: types { application/wasm wasm; }"
    exit 1
fi

echo "[3/3] Deployment validation completed successfully."
exit 0