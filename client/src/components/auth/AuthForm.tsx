import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthFormProps {
  onSuccess?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);

  const mapAuthError = (err: any): string => {
    if (!err) return 'Ein unbekannter Fehler ist aufgetreten.';
    
    const status = err.status || err.code;
    const message = err.message?.toLowerCase() || '';

    if (message.includes('fetch') || message.includes('network error')) {
      return 'Datenbank-Verbindung fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.';
    }

    switch (status) {
      case 400:
        if (message.includes('invalid login credentials')) {
          return 'Ungültige Anmeldedaten. Bitte prüfen Sie E-Mail und Passwort.';
        }
        return 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.';
      case 422:
        if (message.includes('already registered')) {
          return 'Diese E-Mail-Adresse ist bereits registriert.';
        }
        return 'Validierungsfehler. Das Passwort ist möglicherweise zu kurz.';
      case 'PGRST301':
        return 'Datenbank-Verbindung konnte nicht hergestellt werden (API-Fehler).';
      default:
        return err.message || 'Authentifizierung fehlgeschlagen.';
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (signUpError) throw signUpError;
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>{isLogin ? 'Anmelden' : 'Registrieren'}</h2>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="email">E-Mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {error && (
          <div style={{ color: 'red', fontSize: '0.9rem', backgroundColor: '#fee', padding: '10px', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Verarbeite...' : isLogin ? 'Einloggen' : 'Konto erstellen'}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        style={{ marginTop: '20px', background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer' }}
      >
        {isLogin ? 'Noch kein Konto? Hier registrieren' : 'Bereits ein Konto? Hier anmelden'}
      </button>
    </div>
  );
};

export default AuthForm;