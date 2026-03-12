#!/bin/bash

# Test script for backup_postgres1.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Test Setup ---
# Store original backup script name
BACKUP_SCRIPT="./backup_postgres1.sh"

# Create a mock for pg_dump
PG_DUMP_MOCK_FILE="pg_dump"
touch $PG_DUMP_MOCK_FILE
chmod +x $PG_DUMP_MOCK_FILE
# Mock pg_dump to write a dummy backup
echo "echo 'dummy backup data' | gzip" > $PG_DUMP_MOCK_FILE
export PATH=.:$PATH

# Set a test database name
export DB_NAME="test_db"

# --- Test Case 1: Test backup creation ---
echo "Running Test Case 1: Backup Creation"

# Run the backup script
/bin/bash $BACKUP_SCRIPT

# Get the backup directory from the script
BACKUP_DIR=$(grep -oP 'BACKUP_DIR="\K[^"]+' $BACKUP_SCRIPT)

# Check if the backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Test Case 1 Failed: Backup directory '$BACKUP_DIR' not found."
    exit 1
fi

# Check if a backup file was created
if [ -z "$(ls -A $BACKUP_DIR)" ]; then
    echo "Test Case 1 Failed: No backup file found in '$BACKUP_DIR'."
    exit 1
fi
echo "Test Case 1 Passed: Backup file created successfully."

# --- Test Case 2: Test old backup deletion ---
echo "Running Test Case 2: Old Backup Deletion"

# Create some old backup files
touch -d "8 days ago" "$BACKUP_DIR/old_backup_1.sql.gz"
touch -d "10 days ago" "$BACKUP_DIR/old_backup_2.sql.gz"

# Run the backup script again
/bin/bash $BACKUP_SCRIPT

# Check that the old files are deleted
if [ -f "$BACKUP_DIR/old_backup_1.sql.gz" ] || [ -f "$BACKUP_DIR/old_backup_2.sql.gz" ]; then
    echo "Test Case 2 Failed: Old backup files were not deleted."
    exit 1
fi

# Check that the new backup files are not deleted
if [ -z "$(ls -A $BACKUP_DIR)" ]; then
    echo "Test Case 2 Failed: New backup files were deleted."
    exit 1
fi
echo "Test Case 2 Passed: Old backups deleted successfully."


# --- Cleanup ---
echo "Cleaning up test environment."
rm -f $PG_DUMP_MOCK_FILE
rm -rf $BACKUP_DIR

echo "All tests passed!"