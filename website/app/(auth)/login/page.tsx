"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for errors in URL (from OAuth redirect)
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (error) {
      console.error("Auth Error:", error, errorDesc);
      setErrorMessage(errorDesc || "Authentication failed. Please try again.");
    }

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    };

    checkSession();
  }, [searchParams]);

  const signInWithGoogle = async () => {
    // This is for the WEBSITE login (not the extension popup)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/login",
      },
    });
    if (error) console.error("Login error:", error.message);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);
  };

  return (
    <div className="ov-privacy-container" style={{ textAlign: "center", paddingTop: "60px" }}>
      <h1>Welcome Back</h1>
      <p>Sign in to manage your subscription and view your usage stats.</p>

      {errorMessage && (
        <div style={{ 
          margin: "20px auto", 
          padding: "12px", 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid rgba(239, 68, 68, 0.2)", 
          borderRadius: "8px", 
          color: "#f87171",
          maxWidth: "400px" 
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        {loading ? (
          <button className="ov-btn ov-btn--primary" disabled>
            Loading...
          </button>
        ) : user ? (
          <>
            <p style={{ marginBottom: "20px", color: "var(--text)" }}>
              Signed in as: {user.email}
            </p>
            <button onClick={signOut} className="ov-btn ov-btn--primary">
              Sign Out
            </button>
          </>
        ) : (
          <button onClick={signInWithGoogle} className="ov-btn ov-btn--primary">
            Log In with Google
          </button>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div style={{ color: "white", textAlign: "center", padding: "40px" }}>Loading Login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
