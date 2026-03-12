# Deployment Firebase + AWS

## Firebase
- Hosting/Studio für UI- und Rekonstruktionsworkflow
- Firestore optional für persistente Welt-/Spielerdaten

## AWS
- PostgreSQL / RDS Adapter
- ElastiCache / Valkey für schnelle Zustände
- optional WebSocket Gateway Bridge

## Grundregel
Keine Secrets im Repo. Immer über Umgebungsvariablen oder Secret Stores.