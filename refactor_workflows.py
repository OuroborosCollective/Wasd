import os
import re
import json
import requests
from pathlib import Path
from ruamel.yaml import YAML
from jsonschema import validate, ValidationError

class WorkflowRefactorer:
    def __init__(self):
        self.yaml = YAML()
        self.yaml.preserve_quotes = True
        self.yaml.indent(mapping=2, sequence=4, offset=2)
        self.yaml.width = 4096
        self.write_patterns = [
            re.compile(r'git\s+push'),
            re.compile(r'git\s+commit'),
            re.compile(r'gh\s+'),
            re.compile(r'npm\s+publish')
        ]
        self.checkout_pattern = re.compile(r'actions/checkout@v[1-3]')
        self.schema = self._load_github_schema()
        self.changed_files = []

    def _load_github_schema(self):
        try:
            url = "https://json.schemastore.org/github-workflow.json"
            response = requests.get(url, timeout=5)
            return response.json()
        except Exception:
            return None

    def _needs_write_permission(self, job):
        for step in job.get('steps', []):
            run_content = step.get('run', '')
            if any(pattern.search(run_content) for pattern in self.write_patterns):
                return True
        return False

    def _refactor_run_block(self, run_content):
        lines = run_content.splitlines()
        new_lines = []
        for line in lines:
            if 'git commit' in line and 'git add -A' not in run_content:
                new_lines.append('git add -A')
            new_lines.append(line)
        
        # Remove duplicates while preserving order for git add -A
        final_lines = []
        for i, line in enumerate(new_lines):
            stripped = line.strip()
            if stripped == 'git add -A':
                if i + 1 < len(new_lines) and 'git add -A' in new_lines[i+1]:
                    continue
            final_lines.append(line)
        
        return "\n".join(final_lines)

    def process_file(self, file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        data = self.yaml.load(original_content)
        if not data or 'jobs' not in data:
            return

        modified = False

        for job_id, job in data['jobs'].items():
            # 1. Permissions
            if self._needs_write_permission(job):
                permissions = job.get('permissions', {})
                if isinstance(permissions, str): # handle 'permissions: read-all' etc
                    if permissions != 'write-all':
                        job['permissions'] = {'contents': 'write'}
                        modified = True
                else:
                    if permissions.get('contents') != 'write':
                        permissions['contents'] = 'write'
                        job['permissions'] = permissions
                        modified = True

            # 2. Steps processing
            if 'steps' in job:
                for step in job['steps']:
                    # Checkout upgrade
                    if 'uses' in step:
                        if self.checkout_pattern.search(step['uses']):
                            step['uses'] = 'actions/checkout@v4'
                            modified = True
                    
                    # Git add injection
                    if 'run' in step:
                        old_run = step['run']
                        new_run = self._refactor_run_block(old_run)
                        if old_run != new_run:
                            step['run'] = new_run
                            modified = True

        if modified:
            output = Path('temp_val.yml')
            with open(output, 'w', encoding='utf-8') as f:
                self.yaml.dump(data, f)
            
            with open(output, 'r', encoding='utf-8') as f:
                new_content = f.read()
            
            os.remove(output)

            # Validation
            if self.schema:
                try:
                    validate(instance=data, schema=self.schema)
                except ValidationError as e:
                    print(f"Validation failed for {file_path}: {e.message}")
                    return

            if new_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                self.changed_files.append(file_path)

    def run(self):
        workflow_path = Path('.github/workflows')
        if not workflow_path.exists():
            print("No .github/workflows directory found.")
            return

        for yml_file in workflow_path.rglob('*.yml'):
            self.process_file(yml_file)
        
        for yaml_file in workflow_path.rglob('*.yaml'):
            self.process_file(yaml_file)

        self.generate_instructions()

    def generate_instructions(self):
        content = """# FIX_INSTRUCTIONS

## Erforderliche Repository-Einstellungen
Da die Workflows refactoriert wurden, um Schreiboperationen durchzuführen, müssen folgende Einstellungen im GitHub Repository überprüft werden:

1. **Workflow Permissions**:
   - Gehe zu `Settings` > `Actions` > `General`.
   - Stelle sicher, dass `Workflow permissions` auf `Read and write permissions` gesetzt ist (oder die im YAML explizit gesetzten Scopes verwendet werden).
   - Aktiviere `Allow GitHub Actions to create and approve pull requests`.

2. **Branch Protection**:
   - Falls `main` geschützt ist, stelle sicher, dass der GitHub Action Bot Schreibrechte hat oder Bypass-Regeln existieren.

3. **Inhalt der Änderungen**:
   - `actions/checkout` wurde auf `v4` aktualisiert (Node.js 20 Support).
   - `permissions: contents: write` wurde Jobs hinzugefügt, die `git push/commit` oder `gh` CLI nutzen.
   - `git add -A` wurde automatisch vor `git commit` eingefügt, falls es fehlte.

Betroffene Dateien:
"""
        for f in self.changed_files:
            content += f"- {f}\n"

        with open('FIX_INSTRUCTIONS.md', 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    refactorer = WorkflowRefactorer()
    refactorer.run()