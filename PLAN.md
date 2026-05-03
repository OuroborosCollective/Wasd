# Projekt-Roadmap: KI-Agenten-System (Orchestrator-Modell)

## Vision
Ein modulares Multi-Agenten-System, in dem ein zentraler **Supervisor-Agent** als "Gehirn" fungiert. Er empfängt komplexe Benutzeranfragen, zerlegt diese in atomare Aufgaben und delegiert sie an spezialisierte Sub-Agenten, um ein konsistentes Gesamtergebnis zu liefern.

## Phase 0: Infrastruktur & Refactoring (Grundlagen)
- [ ] **Verzeichnis-Konsolidierung**
    - [ ] Zusammenführung von `apps/web` und `client/` zu einer einheitlichen Frontend-Struktur.
    - [ ] Zusammenführung von `apps/api` und `backend/` zur Bereinigung redundanter API-Logik.
- [ ] **Build-Sicherheit**
    - [ ] Implementierung einer CI/CD-Sperre für `playtester-monitor.html`, um den Ausschluss aus Production-Builds zu garantieren.

## Phase 1: Kern-Architektur & Supervisor-Logik (Fokus)
- [ ] **Zentraler Supervisor-Agent**
    - [ ] Implementierung der Task-Decomposition (Aufgabenteilung).
    - [ ] Entwicklung des Orchestrierungs-Logalgorithmus (Planen -> Ausführen -> Validieren).
    - [ ] Verwaltung des globalen Zustands (Shared State) über den gesamten Lebenszyklus einer Anfrage.
- [ ] **Kommunikations-Protokoll**
    - [ ] Standardisierung der JSON-Schnittstellen zwischen Supervisor und Sub-Agenten.
    - [ ] Definition von Erfolgs- und Fehler-Rückmeldungen für den Supervisor.

## Phase 2: Spezialisierte Sub-Agenten (Worker)
- [ ] **Web-Researcher Agent**
    - [ ] Fokus auf Informationsbeschaffung und Quellenbewertung.
- [ ] **Developer Agent**
    - [ ] Fokus auf Code-Generierung (TypeScript, HTML, CSS).
    - [ ] Einhaltung von Coding-Standards.
- [ ] **Quality Assurance (QA) Agent**
    - [ ] Review-Instanz, die Code gegen die ursprünglichen Anforderungen prüft.
    - [ ] Rückmeldung an den Supervisor bei Nichterfüllung.

## Phase 3: Feedback-Loops & Selbstheilung
- [ ] **Iterative Verfeinerung**
    - [ ] Supervisor erkennt fehlerhaften Code der Sub-Agenten und stößt Korrekturzyklen an.
    - [ ] Implementierung von "Reflection"-Mechanismen (Agenten bewerten ihre eigene Arbeit).
- [ ] **Ressourcen-Management**
    - [ ] Token-Optimierung durch gezieltes Context-Pruning durch den Supervisor.

## Phase 4: Deployment & Interface
- [ ] **Agenten-Dashboard**
    - [ ] Visualisierung des Aufgabenbaums (Welcher Agent arbeitet an was?).
    - [ ] Anzeige der Supervisor-Entscheidungswege (Thought Process).
- [ ] **API-Schnittstelle**
    - [ ] Bereitstellung als zustandsloser Dienst für externe Integrationen.

## Status-Metriken
- **Genauigkeit der Aufgabenverteilung**: Wie treffsicher wählt der Supervisor den richtigen Sub-Agenten?
- **Erfolgsquote der Erstlösung**: Wie oft ist ein Feedback-Loop nötig?
- **Latenz**: Zeit von der Anfrage bis zum aggregierten Endergebnis.