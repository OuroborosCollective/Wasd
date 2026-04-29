# Fehlerbehebung: GitHub Actions 403 Forbidden

## Ursache
Der HTTP-Fehler 403 (Forbidden) in einer GitHub Action tritt auf, wenn der Workflow versucht, eine Operation auszuführen, für die er keine ausreichenden Berechtigungen besitzt. Standardmäßig ist das automatisch generierte `GITHUB_TOKEN` in vielen Repositories auf "Read-only" gesetzt, was Schreibvorgänge wie `git push`, das Erstellen von Releases oder das Hochladen von Assets verhindert.

## Anleitung: Schreibrechte aktivieren

Um die Berechtigungen für GitHub Actions in Ihrem Repository anzupassen, folgen Sie diesen Schritten:

1. **Repository öffnen**: Navigieren Sie in Ihrem Browser zu Ihrem GitHub-Repository.
2. **Einstellungen**: Klicken Sie in der oberen Tab-Leiste auf den Punkt **Settings**.
3. **Actions-Konfiguration**: Suchen Sie in der linken Seitenleiste den Abschnitt **Actions** (unter "Code and automation") und klicken Sie auf **General**.
4. **Workflow permissions finden**: Scrollen Sie auf der Seite ganz nach unten bis zum Abschnitt **Workflow permissions**.
5. **Schreibrechte setzen**:
   - Wählen Sie die Option **Read and write permissions** aus.
   - Diese Einstellung erlaubt es dem `GITHUB_TOKEN`, Dateien im Repository zu verändern und neue Tags oder Releases zu pushen.
6. **Optional (Pull Requests)**: Falls Ihr Workflow Pull Requests erstellen oder automatisch mergen soll, aktivieren Sie zusätzlich das Kontrollkästchen **Allow GitHub Actions to create and approve pull requests**.
7. **Speichern**: Klicken Sie auf den Button **Save**, um die Änderungen zu übernehmen.

## Validierung
Nachdem die Einstellungen gespeichert wurden, führen Sie den Workflow erneut aus. Der Fehler 403 sollte nicht mehr auftreten, da der Workflow nun die notwendigen Autorisierungen besitzt, um Änderungen an die GitHub-Infrastruktur zu übertragen.