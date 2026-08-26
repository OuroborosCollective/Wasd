import os
import subprocess
import json
import google.generativeai as genai
from datetime import datetime
from pathlib import Path

# Konfiguration
KNOWLEDGE_BASE_DIR = "llm_knowledge_base"
API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("Fehler: GEMINI_API_KEY ist nicht gesetzt. Beende Skript.")
    exit(1)

genai.configure(api_key=API_KEY)
# Nutze ein Flash-Modell für schnelle, strukturierte JSON-Antworten
model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})

def run_cmd(cmd):
    """Führt einen Shell-Befehl aus und gibt die Ausgabe zurück."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

def get_commits_to_process():
    """Bestimmt, welche Commits analysiert werden sollen (Neu oder Historie)."""
    analyze_history = os.environ.get("ANALYZE_HISTORY", "false").lower() == "true"
    
    if analyze_history:
        print("Analysiere die gesamte Historie...")
        # Holt alle Commits vom ältesten bis zum neuesten
        commits = run_cmd("git log --reverse --pretty=format:'%H'").split('\n')
        return [c for c in commits if c]
    else:
        print("Analysiere nur den neuesten Commit...")
        commit = run_cmd("git log -1 --pretty=format:'%H'")
        return [commit] if commit else []

def get_commit_data(commit_hash):
    """Sammelt Diff, Nachricht und Metadaten eines Commits."""
    msg = run_cmd(f"git log -1 --pretty=format:'%B' {commit_hash}")
    author_date = run_cmd(f"git log -1 --pretty=format:'%aI' {commit_hash}")
    
    # Versuche den Diff zum vorherigen Commit zu bekommen (falls vorhanden)
    parents = run_cmd(f"git log -1 --pretty=format:'%P' {commit_hash}").split()
    if parents:
        diff = run_cmd(f"git diff {parents[0]} {commit_hash}")
    else:
        # Erster Commit im Repo
        diff = run_cmd(f"git show {commit_hash}")
        
    return {
        "hash": commit_hash,
        "message": msg,
        "date": author_date,
        "diff": diff[:15000] # Limitiere auf 15k Zeichen für LLM Context
    }

def analyze_with_llm(commit_data):
    """Sendet die Daten an das LLM und erwartet ein strukturiertes JSON zurück."""
    
    prompt = f"""
    Du bist ein Experte für Software-Architektur und KI-gestützte Code-Analyse.
    Analysiere den folgenden Git Commit. Extrahiere die semantischen Daten für eine lokale LLM Coding Engine und formatiere sie als strukturiertes JSON.
    
    Commit Hash: {commit_data['hash']}
    Commit Nachricht: {commit_data['message']}
    
    Diff:
    {commit_data['diff']}
    
    Erstelle ein JSON-Objekt mit EXAKT folgender Struktur:
    {{
        "thema_kapitel": "Ein kurzer Ordnername für die Kategorisierung (z.B. 'Frontend_UI', 'Backend_API', 'DevOps_CI', 'Core_Logic', 'Grundlagen')",
        "kontext_architektur": "Zusammenhang des Commits zur Gesamtarchitektur und Zweck der Änderung.",
        "diff_summary": {{
            "new_files": ["liste neuer dateien"],
            "modified_files": ["liste geänderter dateien"]
        }},
        "workflows_status": "Status der CI/CD Workflows (vermutet basierend auf Änderungen, fehlerfrei oder fehlerhaft).",
        "fehler_analyse": {{
            "fehlerquelle": "Falls ein Fehler behoben wurde: Wo lag der Fehler?",
            "auswirkungen_auf_architektur": "Wie wirkte sich der Fehler aus?",
            "fix_details": "Wie wurde er gefixt (durch welchen Code, warum)?"
        }},
        "bewertung": "Zahl von 1 bis 10. (10 = extrem gut/sicher/elegant, 1 = extrem schlecht/hacky).",
        "bewertung_begruendung": "Warum diese Punktzahl?",
        "learnings_semantic": "Maschinenlesbare Erkenntnisse für zukünftige LLM-Generierungen (Regeln, Patterns, Best Practices aus diesem Commit)."
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        # LLM gibt validiertes JSON zurück
        return json.loads(response.text)
    except Exception as e:
        print(f"Fehler bei LLM-Analyse für {commit_data['hash']}: {e}")
        return None

def save_to_knowledge_base(commit_data, analysis):
    """Speichert das JSON semantisch und nach Themen sortiert."""
    if not analysis:
        return
        
    thema = analysis.get("thema_kapitel", "Uncategorized").replace(" ", "_").replace("/", "_")
    date_str = commit_data["date"][:10] # YYYY-MM-DD
    
    # Ordnerstruktur: llm_knowledge_base/<Thema>/
    target_dir = Path(KNOWLEDGE_BASE_DIR) / thema
    target_dir.mkdir(parents=True, exist_ok=True)
    
    file_name = f"{date_str}_{commit_data['hash'][:7]}.json"
    file_path = target_dir / file_name
    
    # Baue das finale Objekt für den R2 Bucket / Coding Engine
    final_object = {
        "metadata": {
            "commit_id": commit_data["hash"],
            "timestamp": commit_data["date"],
            "original_text": commit_data["message"]
        },
        "analysis": analysis
    }
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(final_object, f, indent=4, ensure_ascii=False)
        
    print(f"✅ Gespeichert: {file_path}")

def main():
    commits = get_commits_to_process()
    print(f"Gefundene Commits zur Verarbeitung: {len(commits)}")
    
    for commit_hash in commits:
        print(f"Verarbeite Commit {commit_hash[:7]}...")
        
        # 1. Daten extrahieren
        data = get_commit_data(commit_hash)
        
        # Wenn Diff leer ist, überspringen (z.B. bei leeren Merge Commits)
        if not data["diff"].strip():
            print("Kein Diff gefunden, überspringe.")
            continue
            
        # 2. LLM Analyse
        analysis = analyze_with_llm(data)
        
        # 3. Speichern in Themen-Ordnern
        save_to_knowledge_base(data, analysis)

if __name__ == "__main__":
    main()
