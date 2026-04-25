import React, { useState } from "react";
import { supabase } from "../../auth/supabase";
import "./LoginScreen.css";

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.session) {
        onLoginSuccess(data.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      setError("Registration successful! Please check your email for verification.");
      setIsRegistering(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-container">
      <div className="login-overlay">
        <div className="login-card">
          <h1 className="game-logo">Arelorian</h1>
          <h2 className="subtitle">- ARE-Logic -</h2>

          <div className="form-container">
            <h3>{isRegistering ? "Create Account" : "Login"}</h3>
            
            <form onSubmit={isRegistering ? handleRegister : handleLogin}>
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Processing..." : isRegistering ? "Register" : "Enter Arelorian"}
              </button>
            </form>

            <div className="auth-toggle">
              {isRegistering ? (
                <p>
                  Already have an account?{" "}
                  <button onClick={() => setIsRegistering(false)}>Login</button>
                </p>
              ) : (
                <p>
                  New player?{" "}
                  <button onClick={() => setIsRegistering(true)}>Create Account</button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
