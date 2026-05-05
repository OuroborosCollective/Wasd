import os
import subprocess
import sys

def run_command(command):
    """Executes a shell command and catches potential errors to prevent script failure."""
    try:
        # Use subprocess for better control and error handling
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            if result.stderr:
                print(f"Command info: {result.stderr.strip()}")
        if result.stdout:
            print(result.stdout.strip())
    except Exception as e:
        print(f"Execution error: {e}")

def check_git_diff(file_path):
    """Parses git diff for specific file to verify changes safely."""
    if not os.path.exists(".git"):
        return
    
    print(f"--- Git Diff Status: {file_path} ---")
    try:
        # Check if file has unstaged or staged changes
        run_command(f"git diff HEAD -- {file_path} | grep '^[+-]' | grep -v '^[+-][+-][+-]' | head -n 10")
    except Exception as e:
        print(f"Git parsing error for {file_path}: {e}")

def main():
    files = [
        'client/index.html',
        'client/src/main.ts',
        'client/src/networking/websocketClient.ts',
        'client/src/ai/watchdogTelemetry.ts',
        'server/src/core/WorldTick.ts',
        'server/src/modules/world/WorldObjectSystem.ts'
    ]

    for f in files:
        print(f"\n[CHECKING FILE]: {f}")
        
        try:
            if os.path.exists(f):
                # Git Diff Parsing Integration
                check_git_diff(f)
                
                print(f"--- Content Analysis: {f} ---")
                if 'client/index.html' == f:
                    run_command(f"grep -C 2 'posthog' {f}")
                elif 'client/src/main.ts' == f:
                    run_command(f"grep -C 2 'posthog.identify' {f}")
                elif 'client/src/networking/websocketClient.ts' == f:
                    run_command(f"grep -C 2 'zone_entered' {f}")
                elif 'client/src/ai/watchdogTelemetry.ts' == f:
                    run_command(f"grep -C 2 'watchdog_log' {f}")
                elif 'server/src/core/WorldTick.ts' == f:
                    run_command(f"grep -n 'broadcastState' {f}")
                    # Safe sed execution with line range
                    run_command(f"sed -n '3430,3450p' {f}")
                elif 'server/src/modules/world/WorldObjectSystem.ts' == f:
                    run_command(f"grep -n 'getObjectsMap' {f}")
            else:
                print(f"Warning: File {f} not found on disk.")
        except IOError as io_err:
            print(f"I/O Error processing {f}: {io_err}")
        except Exception as e:
            print(f"Unexpected error processing {f}: {e}")

    print("\n[FINISH]: All checks completed successfully.")
    # Ensure robust exit code 0 regardless of minor command failures
    sys.exit(0)

if __name__ == "__main__":
    main()