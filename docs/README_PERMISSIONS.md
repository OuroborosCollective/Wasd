# GitHub Workflow Permissions

Dieses Dokument beschreibt die Konfiguration der Berechtigungen für GitHub Actions, um Authentifizierungsfehler (HTTP 403) bei automatisierten Schreibvorgängen zu vermeiden.

## Problembeschreibung
Standardmäßig ist der `GITHUB_TOKEN` in neu erstellten Repositories oft auf "Read repository contents and packages permissions" (Nur Lesezugriff) eingestellt. Versucht ein Workflow, Änderungen am Code, an Tags oder Dokumentationen vorzunehmen, schlägt dies mit einem 403-Fehler fehl.

## Lösung: Workflow-Berechtigungen anpassen

Um die Berechtigungen final zu korrigieren, führen Sie folgende Schritte in Ihrem GitHub-Repository aus:

1.  **Repository Settings**: Öffnen Sie Ihr Repository auf GitHub und klicken Sie in der oberen Navigationsleiste auf den Reiter **Settings**.
2.  **Actions Menu**: Wählen Sie in der linken Seitenleiste den Menüpunkt **Actions** aus und klicken Sie auf den Unterpunkt **General**.
3.  **Workflow permissions**: Scrollen Sie nach unten zum Abschnitt **Workflow permissions**.
4.  **Berechtigungsstufe ändern**:
    *   Wählen Sie die Option **Read and write permissions** aus.
    *   Dies erlaubt Workflows das Lesen und Schreiben von Repository-Inhalten.
5.  **Zusatzoption**: Aktivieren Sie das Kontrollkästchen **Allow GitHub Actions to create and approve pull requests**, falls Ihre Workflows Pull Requests generieren müssen.
6.  **Speichern**: Klicken Sie auf den Button **Save**, um die Konfiguration zu übernehmen.

## Überprüfung
Nachdem diese Einstellung gespeichert wurde, verfügen alle nachfolgenden Workflow-Durchläufe über die notwendigen Berechtigungen, um automatisierte Commits, Releases oder Dokumentations-Updates ohne 403-Fehler durchzuführen.