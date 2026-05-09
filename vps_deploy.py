import os
import paramiko

def deploy():
    print("Initiating VPS Deployment...")
    host = os.getenv("PRODUCTION_IP", "46.202.154.25")
    user = os.getenv("SSH_USER", "root")
    password = os.getenv("VPS_PASSWORD")

    if not password:
        print("Error: VPS_PASSWORD environment variable not set.")
        return

    try:
        client = paramiko.SSHClient()
        # Enforce host key verification by loading system keys.
        # RejectPolicy is the default and most secure.
        # AutoAddPolicy and WarningPolicy are disabled to comply with security standards (CodeQL).
        client.load_system_host_keys()
        client.set_missing_host_key_policy(paramiko.RejectPolicy())

        print(f"Connecting to {host}...")
        client.connect(host, username=user, password=password, timeout=30)

        commands = [
            "cd /opt/areloria && git fetch origin && git reset --hard origin/main",
            "cd /opt/areloria && pnpm install --frozen-lockfile && pnpm run build",
            "pm2 restart all || true"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            print(stdout.read().decode())
            err = stderr.read().decode()
            if err:
                print(f"Stderr: {err}")

        client.close()
        print("Deployment successful.")
    except paramiko.SSHException as e:
        print(f"SSH Error: {e}. Ensure the host key is in known_hosts.")
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy()
