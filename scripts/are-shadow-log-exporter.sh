#!/bin/bash
# are-shadow-log-exporter.sh
# Export ARE Shadow Adapter logs with full ecosystem telemetry
# Usage: ./are-shadow-log-exporter.sh [lines]

set -euo pipefail

LOG_LINES="${1:-500}"
OUTPUT_DIR="/tmp/are-shadow-export-$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${OUTPUT_DIR}.tar.gz"

VPS_PATH="${VPS_PATH:-/opt/areloria}"

echo "=== ARE Shadow Adapter Log Exporter ==="
echo "Timestamp: $(date -Iseconds)"
echo "Log lines: $LOG_LINES"
echo "VPS Path: $VPS_PATH"
echo ""

mkdir -p "$OUTPUT_DIR"

# --- System Info ---
{
    echo "=== System Info ==="
    echo "exported_at=$(date -Iseconds)"
    echo "host=$(hostname)"
    echo "uptime=$(uptime -p 2>/dev/null || uptime)"
    echo "kernel=$(uname -r)"
} > "$OUTPUT_DIR/00-system.txt"

# --- PM2 Status ---
{
    echo "=== PM2 Status ==="
    pm2 jlist 2>/dev/null | jq -s '{
        processes: length,
        status: map(select(.pm2_env?.status == "online")) | length,
        memory_mb: (map(.monit?.memory) | add // 0) / 1024 / 1024,
        cpu_percent: (map(.monit?.cpu) | add // 0)
    }' 2>/dev/null || echo "{error: 'PM2 not available'}"
} > "$OUTPUT_DIR/01-pm2.json"

# --- Log Directory ---
{
    echo "=== Log Directory ==="
    if [ -d "$VPS_PATH/logs" ]; then
        find "$VPS_PATH/logs" -maxdepth 3 -type f 2>/dev/null | sort
    else
        echo "No logs directory found at $VPS_PATH/logs"
    fi
} > "$OUTPUT_DIR/02-log-directory.txt"

cd "$VPS_PATH" 2>/dev/null || {
    echo "ERROR: Cannot access $VPS_PATH"
    exit 1
}

# --- ARE Shadow JSONL (Main Log) ---
if [ -f "logs/are-shadow.jsonl" ]; then
    TOTAL_LINES=$(wc -l < logs/are-shadow.jsonl)
    echo "Found logs/are-shadow.jsonl ($TOTAL_LINES total lines)"
    
    tail -n "$LOG_LINES" logs/are-shadow.jsonl > "$OUTPUT_DIR/10-are-shadow-tail.jsonl"
    
    # Statistics
    {
        echo "=== ARE Shadow Log Statistics ==="
        echo "total_lines=$TOTAL_LINES"
        echo "sampled_lines=$LOG_LINES"
        echo "sampled_at=$(date -Iseconds)"
        echo ""
        
        # Tick range
        echo "--- Tick Range ---"
        TICKS=$(tail -n "$LOG_LINES" logs/are-shadow.jsonl | jq -r '.tick' 2>/dev/null | sort -n)
        echo "min_tick=$(echo "$TICKS" | head -1)"
        echo "max_tick=$(echo "$TICKS" | tail -1)"
        echo ""
        
        # Capacity distribution
        echo "--- Capacity Distribution ---"
        tail -n "$LOG_LINES" logs/are-shadow.jsonl | jq -r '.capacity' 2>/dev/null | sort | uniq -c | sort -rn
        echo ""
        
        # Latest entries
        echo "--- Latest 5 Entries ---"
        tail -n 5 logs/are-shadow.jsonl | jq '.' 2>/dev/null || cat
        echo ""
        
        # Ecosystem events
        echo "--- Ecosystem Events in Sample ---"
        tail -n "$LOG_LINES" logs/are-shadow.jsonl | jq -r '.ecosystem.capsules // empty' 2>/dev/null | wc -l | xargs -I{} echo "capsule_records={}"
        tail -n "$LOG_LINES" logs/are-shadow.jsonl | jq -r '.ecosystem.apexNpcs // empty' 2>/dev/null | wc -l | xargs -I{} echo "apex_npcs={}"
    } > "$OUTPUT_DIR/11-shadow-stats.txt"
    
    # Detailed entries with ecosystem data
    tail -n 50 logs/are-shadow.jsonl | jq -c '.ecosystem' 2>/dev/null | head -20 | while read -r entry; do
        echo "Entry: $entry"
    done > "$OUTPUT_DIR/12-ecosystem-sample.jsonl" || true
else
    echo "WARNING: logs/are-shadow.jsonl not found" | tee "$OUTPUT_DIR/10-are-shadow-tail.jsonl"
fi

# --- Server Logs ---
for logfile in logs/server*.log logs/*.log; do
    if [ -f "$logfile" ]; then
        safe_name="$(basename "$logfile" | tr '.' '_')"
        {
            echo "=== Server Log: $logfile ==="
            echo "file=$logfile"
            echo "size=$(stat -c%s "$logfile" 2>/dev/null || echo 'unknown')"
            echo "modified=$(stat -c%y "$logfile" 2>/dev/null || echo 'unknown')"
            echo ""
            tail -n 200 "$logfile"
        } > "$OUTPUT_DIR/20-server-$safe_name.txt"
    fi
done 2>/dev/null || true

# --- PM2 Logs ---
{
    echo "=== PM2 Process Logs ==="
    pm2 logs --nostream --lines 100 2>&1 | tail -100
} > "$OUTPUT_DIR/30-pm2-logs.txt" 2>/dev/null || true

# --- Configuration ---
{
    echo "=== ARE Configuration ==="
    if [ -f ".env" ]; then
        grep -E '^ARE_|^SHADOW_|^ENABLE_ARE|^ENABLE_SHADOW' .env 2>/dev/null | while read -r line; do
            key=$(echo "$line" | cut -d= -f1)
            echo "$key=[REDACTED]"
        done
    else
        echo "No .env found"
    fi
} > "$OUTPUT_DIR/40-are-config.txt"

# --- Health Endpoint ---
{
    echo "=== Server Health ==="
    curl -k --max-time 10 https://arelorian.de/health 2>&1 || echo "Health check failed"
} > "$OUTPUT_DIR/50-health.json"

# --- Archive ---
cd "$(dirname "$OUTPUT_DIR")"
tar -czf "$ARCHIVE" "$(basename "$OUTPUT_DIR")"
ls -lh "$ARCHIVE"

echo ""
echo "=== Export Complete ==="
echo "Archive: $ARCHIVE"
echo "Output dir: $OUTPUT_DIR"
echo ""
echo "To download from VPS:"
echo "  scp user@host:$ARCHIVE ."
echo ""
echo "To extract:"
echo "  tar -xzf $ARCHIVE"