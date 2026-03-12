# Deployment Plan

## Zielumgebungen
- Firebase App Hosting
- Cloud Run / Cloud Functions
- AWS PostgreSQL / ElastiCache / API Gateway WebSocket

## Prinzipien
- Keine Secrets im Repo
- Server autoritativ
- Client nur Darstellung
- Beobachterzonen bestimmen Last

## Reihenfolge
1. Datenbankadapter konfigurieren
2. Server health endpoint prüfen
3. WebSocket-Verbindung prüfen
4. World Tick unter kleiner Last testen
5. Asset-Pfade validieren
6. Admin/GM-Zugriff absichern