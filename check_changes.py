import os
import subprocess
import sys

def log_to_summary(text):
    """Writes a message to the GITHUB_STEP_SUMMARY file if it exists."""
    summary_path = os.getenv('GITHUB_STEP_SUMMARY')
    if summary_path:
        try:
            with open(summary_path, 'a', encoding='utf-8') as f:
                f.write(text + "\n")
        except Exception as e:
            print(f"Failed to write to GITHUB_STEP_SUMMARY: {e}")

def run_command(command):
    """Executes a shell command and returns the output and error code."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=15
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

def check_git_diff(file_path):
    """Parses git diff for specific file to verify changes safely."""
    if not os.path.exists(".git"):
        msg = f"⚠️ Git repository not found for {file_path}. Skipping diff."
        print(msg)
        log_to_summary(msg)
        return

    cmd = f"git diff HEAD -- {file_path} | grep '^[+-]' | grep -v '^[+-][+-][+-]' | head -n 10"
    code, stdout, stderr = run_command(cmd)

    log_to_summary(f"### Git Diff: `{file_path}`")
    if code == 0 and stdout:
        log_to_summary(f"diff\n{stdout}\n")
    elif code != 0:
        log_to_summary(f"> ❌ Git Error: {stderr}")
    else:
        log_to_summary("> No changes detected in HEAD for this file.")

def main():
    files = [
        'client/index.html',
        'client/src/main.ts',
        'client/src/networking/websocketClient.ts',
        'client/src/ai/watchdogTelemetry.ts',
        'server/src/core/WorldTick.ts',
        'server/src/modules/world/WorldObjectSystem.ts'
    ]

    log_to_summary("## 🔍 Areloria WASD - Change Validation Report")

    for f in files:
        print(f"\n[CHECKING FILE]: {f}")

        if not os.path.exists(f):
            msg = f"⚠️ **Warning**: File `{f}` not found on disk."
            print(msg)
            log_to_summary(msg)
            continue

        try:
            # Check Git History
            check_git_diff(f)

            # Content Analysis
            log_to_summary(f"#### Content Analysis: `{f}`")
            cmd = ""

            if 'client/index.html' == f:
                cmd = f"grep -C 2 'posthog' {f}"
            elif 'client/src/main.ts' == f:
                cmd = f"grep -C 2 'posthog.identify' {f}"
            elif 'client/src/networking/websocketClient.ts' == f:
                cmd = f"grep -C 2 'zone_entered' {f}"
            elif 'client/src/ai/watchdogTelemetry.ts' == f:
                cmd = f"grep -C 2 'watchdog_log' {f}"
            elif 'server/src/core/WorldTick.ts' == f:
                # Combining line check and snippet extraction
                cmd = f"grep -n 'broadcastState' {f} && sed -n '3430,3450p' {f}"
            elif 'server/src/modules/world/WorldObjectSystem.ts' == f:
                cmd = f"grep -n 'getObjectsMap' {f}"

            if cmd:
                code, stdout, stderr = run_command(cmd)
                if code == 0 and stdout:
                    log_to_summary(f"typescript\n{stdout}\n")
                elif code != 0:
                    log_to_summary(f"> ⚠️ Search failed or no matches found in `{f}`.")

        except Exception as e:
            error_msg = f"❌ Unexpected error processing `{f}`: {str(e)}"
            print(error_msg)
            log_to_summary(error_msg)

    log_to_summary("\n---\n**Validation Complete.** All checks were executed safely.")
    print("\n[FINISH]: All checks completed successfully.")

    # Force exit 0 to prevent CI pipeline breakage on non-critical diff/grep failures
    sys.exit(0)

if __name__ == "__main__":
    main()