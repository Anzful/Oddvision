"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const signInWithGoogle = async () => {
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

