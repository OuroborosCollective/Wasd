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
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(host, username=user, password=password)

        commands = [
            "cd /opt/areloria && git fetch origin && git reset --hard origin/main",
            "cd /opt/areloria && pnpm install --frozen-lockfile && pnpm run build",
            "pm2 restart all || true"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            print(stdout.read().decode())
            print(stderr.read().decode())

        client.close()
        print("Deployment successful.")
    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy()
