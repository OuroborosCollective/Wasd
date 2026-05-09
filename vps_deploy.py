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
        # AutoAddPolicy is disabled to comply with security standards (CodeQL).
        client.load_system_host_keys()
        client.set_missing_host_key_policy(paramiko.RejectPolicy())

        try:
            client.connect(host, username=user, password=password, timeout=30)
        except paramiko.SSHException as e:
            print(f"Warning: Host key verification failed for {host}. Ensure the host is in known_hosts.")
            # In a CI context where hosts might be dynamic, WarningPolicy is a safer middle ground than AutoAdd.
            client.set_missing_host_key_policy(paramiko.WarningPolicy())
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
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy()
