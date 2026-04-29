import os
import py_compile
import sys

def fix_indentation(file_path):
    """
    Versucht, grundlegende Einrückungsfehler zu beheben, indem Tabs durch 4 Leerzeichen
    ersetzt werden und inkonsistente Zeilenumbrüche normalisiert werden.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        fixed_lines = []
        for line in lines:
            # Ersetze Tabs durch 4 Spaces und entferne Trailing Whitespace
            new_line = line.replace('\t', '    ').rstrip()
            fixed_lines.append(new_line + '\n')
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(fixed_lines)
        return True
    except Exception as e:
        print(f"Fehler beim Bearbeiten von {file_path}: {e}")
        return False

def main():
    # Zielverzeichnis: projects/logistics/src/
    target_dir = os.path.dirname(os.path.abspath(__file__))
    
    print(f"Starte Syntax-Scan in: {target_dir}")
    
    files_to_check = []
    for root, _, files in os.walk(target_dir):
        for file in files:
            if file.endswith('.py') and file != 'fix_syntax_errors.py':
                files_to_check.append(os.path.join(root, file))

    errors_found = 0
    errors_fixed = 0

    for file_path in files_to_check:
        try:
            # Kompilierungsprüfung
            py_compile.compile(file_path, doraise=True)
        except py_compile.PyCompileError as e:
            errors_found += 1
            print(f"Syntax-Fehler identifiziert: {file_path}")
            
            # Automatischer Fix-Versuch (Indentation)
            if fix_indentation(file_path):
                try:
                    py_compile.compile(file_path, doraise=True)
                    print(f"Erfolgreich behoben: {file_path}")
                    errors_fixed += 1
                except py_compile.PyCompileError:
                    print(f"Automatischer Fix nicht ausreichend für: {file_path}")
        except Exception as e:
            print(f"Unerwarteter Fehler bei {file_path}: {e}")

    print("-" * 30)
    print(f"Scan beendet.")
    print(f"Identifizierte Dateien mit Fehlern: {errors_found}")
    print(f"Automatisch korrigierte Dateien: {errors_fixed}")
    if errors_found > errors_fixed:
        print(f"Verbleibende Probleme: {errors_found - errors_fixed}")

if __name__ == "__main__":
    main()