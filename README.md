# Dokumentation: Authentifizierung und Fehlerbehebung bei großen Commits

## 1. Personal Access Token (PAT) Einrichtung
Um Authentifizierungsfehler bei der Verwendung von HTTPS zu vermeiden, muss ein PAT anstelle eines Passworts verwendet werden.

1. Navigieren Sie zu den **Settings** Ihres Git-Hosters (z. B. GitHub).
2. Wählen Sie **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
3. Klicken Sie auf **Generate new token**.
4. Vergeben Sie einen Namen und wählen Sie die Scopes `repo`, `workflow` und `write:packages` aus.
5. Kopieren Sie den Token sofort (er wird später nicht mehr angezeigt).
6. Nutzen Sie den Token bei der nächsten Passwortabfrage im Terminal oder hinterlegen Sie ihn im Credential-Manager:
   bash
   git config --global credential.helper store
   
## 2. SSH-Key Konfiguration
SSH ist stabiler für große Datenmengen und erfordert keine manuelle Token-Eingabe.

1. **SSH-Key generieren:**
   bash
   ssh-keygen -t ed25519 -C "ihre_email@example.com"
   2. **SSH-Agent starten und Key hinzufügen:**
   bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   3. **Public Key zum Account hinzufügen:**
   - Kopieren Sie den Inhalt: `cat ~/.ssh/id_ed25519.pub`
   - Hinterlegen Sie diesen in den Account-Einstellungen unter **SSH and GPG keys**.
4. **Remote-URL von HTTPS auf SSH umstellen:**
   bash
   git remote set-url origin git@github.com:NUTZER/REPOSITORY.git
   
## 3. Behebung von 'Requires authentication' bei großen Commits
Sollte der Fehler trotz korrekter Credentials bei großen Dateien auftreten, liegt dies oft am HTTP-Buffer oder der Netzwerk-Verbindung.

**Konfiguration des Buffers:**
bash
git config --global http.postBuffer 524288000
git config --global core.compression 0

**Alternative bei anhaltenden Problemen:**
Stellen Sie sicher, dass keine Dateigrößen-Limits des Hosters überschritten werden (ggf. Git LFS verwenden). SSH ist gegenüber HTTPS bei großen Push-Operationen zu bevorzugen.