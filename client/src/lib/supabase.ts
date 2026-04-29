import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl === undefined || supabaseUrl === "") {
    throw new Error("Critical Configuration Error: NEXT_PUBLIC_SUPABASE_URL is undefined.");
}

if (supabaseAnonKey === undefined || supabaseAnonKey === "") {
    throw new Error("Critical Configuration Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is undefined.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const createWarningOverlay = (message: string) => {
    if (typeof document === 'undefined') return;

    const overlay = document.createElement('div');
    overlay.id = 'supabase-connection-warning';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: '999999',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px'
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
        backgroundColor: '#1a1a1a',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #ff4b4b',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
    });

    content.innerHTML = `
        <h2 style="color: #ff4b4b; margin-top: 0;">Konnektivitätsfehler</h2>
        <p>Die Verbindung zu Supabase konnte nicht hergestellt werden. Bitte prüfe die API-Endpunkte und Netzwerkverbindung.</p>
        <div style="background: #2a2a2a; padding: 10px; border-radius: 4px; margin: 15px 0; font-size: 0.8rem; text-align: left; overflow-x: auto;">
            <code>${message}</code>
        </div>
        <button onclick="window.location.reload()" style="background: #ff4b4b; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Erneut versuchen
        </button>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);
};

export const validateSupabaseConnection = async (): Promise<boolean> => {
    try {
        const { error } = await supabase.from('_health_check_dummy').select('*').limit(1).maybeSingle();
        
        // PostgrestError with code 'PGRST116' or 404 is still a sign of life, 
        // we mainly check if the request times out or yields a network error.
        if (error && error.message === 'Failed to fetch') {
            throw new Error('Network error: Failed to fetch data from Supabase.');
        }
        return true;
    } catch (err: any) {
        console.error('Supabase Health Check Error:', err);
        createWarningOverlay(err.message || 'Unbekannter Netzwerkfehler');
        return false;
    }
};

if (typeof window !== 'undefined') {
    validateSupabaseConnection();
}