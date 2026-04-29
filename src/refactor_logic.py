import re
import yaml

def refactor_workflow(yaml_content):
    try:
        data = yaml.safe_load(yaml_content)
    except Exception:
        return yaml_content

    if not data or 'jobs' not in data:
        return yaml_content

    for job_id, job in data['jobs'].items():
        steps = job.get('steps', [])
        needs_write_permission = False

        for step in steps:
            if 'uses' in step:
                # 3. Suche 'actions/checkout' und aktualisiere die Version auf '@v4'
                step['uses'] = re.sub(r'actions/checkout@v\d+', 'actions/checkout@v4', step['uses'])

            if 'run' in step:
                run_block = step['run']
                
                # 2. Prüfe auf 'git push' für Permissions
                if 'git push' in run_block:
                    needs_write_permission = True
                
                # 4. Scanne 'run' Blöcke nach 'git commit' oder 'git push'
                if re.search(r'git (commit|push)', run_block):
                    if 'git add -A' not in run_block:
                        step['run'] = "git add -A\n" + run_block

        # 2. Füge 'permissions: contents: write' auf Job-Ebene ein
        if needs_write_permission:
            if 'permissions' not in job:
                job['permissions'] = {}
            job['permissions']['contents'] = 'write'

    return yaml.dump(data, sort_keys=False, default_flow_style=False)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            print(refactor_workflow(f.read()))