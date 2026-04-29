import React, { useState, useEffect } from "react";
import { LoginScreen } from "./LoginScreen";
import { CharacterSelection } from "./CharacterSelection";
import { supabase, onSupabaseAuthStateChanged } from "../../auth/supabase";

interface AuthFlowProps {
  onComplete: (token: string, charName: string) => void;
}

type AuthStep = "login" | "character_selection";

export const AuthFlow: React.FC<AuthFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<AuthStep>("login");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setToken(data.session.access_token);
          setStep("character_selection");
        }
      } catch (err) {
        console.error("[AuthFlow] Failed to check initial session:", err);
      }
    };
    checkSession();

    return onSupabaseAuthStateChanged((session) => {
      if (session) {
        setToken(session.access_token);
        setStep("character_selection");
      } else {
        setToken(null);
        setStep("login");
      }
    });
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    setStep("character_selection");
  };

  const handleCharacterSelected = (charName: string) => {
    if (token) {
      onComplete(token, charName);
    }
  };

  return (
    <>
      {step === "login" && (
        <>
          {error && <div className='text-red-500'>{error}</div>}
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </>
      )}
      {step === "character_selection" && (
        <CharacterSelection onCharacterSelected={handleCharacterSelected} />
      )}
    </>
  );
};
