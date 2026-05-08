import os
import sys
import paramiko

def deploy():
    vps_ip = os.environ.get("PRODUCTION_IP")
    vps_password = os.environ.get("VPS_PASSWORD")
    vps_user = "root"
    deploy_path = "/opt/areloria"

    if not vps_ip:
        print("Error: PRODUCTION_IP environment variable not set.")
        sys.exit(1)

    if not vps_password:
        print("Error: VPS_PASSWORD environment variable not set.")
        sys.exit(1)

    print(f"Connecting to {vps_ip}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(vps_ip, username=vps_user, password=vps_password)
        print("Connected. Executing deployment commands...")

        commands = [
            f"cd {deploy_path}",
            "git fetch origin main",
            "git reset --hard origin/main",
            "export PATH=\"$HOME/.local/share/pnpm:$PATH\"",
            "pnpm install --frozen-lockfile",
            "pnpm run build",
            "pm2 restart all || pm2 start dist/index.js --name areloria-wasd"
        ]

        for cmd in commands:
            print(f"Running: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                print(f"Command failed with status {exit_status}")
                print(stderr.read().decode())
                if "pm2 restart" not in cmd:
                     sys.exit(1)
            else:
                print(stdout.read().decode())

        print("Deployment completed successfully.")
    except Exception as e:
        print(f"Deployment failed: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy()
