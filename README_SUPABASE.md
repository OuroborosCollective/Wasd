# Supabase Integration für WASD

Diese Integration ermöglicht die Anbindung an den Supabase-Stack auf `arelogic.space`.

## Projektstruktur

### Client (Frontend / Babylon.js)
- `client/src/lib/supabase.ts`: Initialisierung des Supabase-Clients (Anon Key).
- `client/src/services/supabaseService.ts`: Zentrale Services für DB, Auth, Realtime und Storage.

### Server (Node.js)
- `server/src/lib/supabaseAdmin.ts`: Initialisierung des Supabase-Admin-Clients (Service Role Key).
- `server/src/services/adminService.ts`: Administrative Datenbank-Services.

## Konfiguration (VPS-seitig)
Die Umgebungsvariablen müssen in den `.env`-Dateien auf dem VPS gepflegt werden (nicht im GitHub-Repository):

**Client (.env):**
```env
VITE_SUPABASE_URL=http://supabase.arelogic.space:8000
VITE_SUPABASE_ANON_KEY=...
```

**Server (.env):**
```env
SUPABASE_URL=http://supabase.arelogic.space:8000
SUPABASE_SERVICE_ROLE_KEY=...
```

## Best Practices
- **Keine Secrets im Frontend:** Nutzen Sie den `supabaseAdmin`-Client nur serverseitig.
- **RLS:** Stellen Sie sicher, dass Row Level Security (RLS) in der Supabase-Datenbank für alle Tabellen aktiviert ist.
- **Render-Loop:** Vermeiden Sie direkte Datenbankaufrufe innerhalb der Babylon.js Render-Schleife. Nutzen Sie stattdessen asynchrone Services.
