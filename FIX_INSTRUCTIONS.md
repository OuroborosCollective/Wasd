# FIX_INSTRUCTIONS

## Aktivierung von Schreibberechtigungen für GitHub Actions

Um sicherzustellen, dass automatisierte Workflows (z. B. für Releases oder Dokumentations-Updates) Änderungen am Repository vornehmen können, müssen die Workflow-Berechtigungen manuell angepasst werden.

### Anleitung:

1. Navigieren Sie zu den **Settings** (Einstellungen) Ihres GitHub-Repositorys.
2. Wählen Sie in der linken Seitenleiste unter dem Abschnitt **Automation** den Punkt **Actions** aus.
3. Klicken Sie auf den Unterpunkt **General**.
4. Scrollen Sie nach unten zum Bereich **Workflow permissions**.
5. Aktivieren Sie die Option **Read and write permissions**.
6. (Optional) Aktivieren Sie das Kontrollkästchen **Allow GitHub Actions to create and approve pull requests**, falls Ihr Workflow Pull Requests erstellen muss.
7. Klicken Sie auf die Schaltfläche **Save**, um die Änderungen zu speichern.

Nach Durchführung dieser Schritte verfügt der `GITHUB_TOKEN`, der in den Workflows verwendet wird, über die notwendigen Rechte, um Dateiänderungen zu committen und zu pushen.