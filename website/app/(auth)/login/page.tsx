"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  IconBrandGoogle, 
  IconCheck, 
  IconArrowRight, 
  IconLogout, 
  IconRefresh,
  IconDevices,
  IconInfinity,
  IconShield
} from "@tabler/icons-react";

function LoginContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (error) {
      setErrorMessage(errorDesc || "Authentication failed. Please try again.");
    }

    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 3000);

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("Session check error:", error);
        setUser(data.session?.user ?? null);
      } catch (err) {
        console.error("Unexpected session check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setUser(session?.user ?? null);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
    };
  }, [searchParams, loading]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setErrorMessage("Could not start Google login: " + error.message);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    const timeout = new Promise(resolve => setTimeout(resolve, 1000));
    try {
        await Promise.race([supabase.auth.signOut(), timeout]);
    } catch (err) {
        console.error("Sign out error:", err);
    }
    window.location.href = "/login";
  };

  const clearBrowserData = () => {
    if (confirm("This will clear your local session data and refresh the page. Continue?")) {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.reload();
    }
  };

  const features = [
    {
      icon: IconDevices,
      title: "Sync across devices",
      description: "Access your Pro subscription on any computer"
    },
    {
      icon: IconInfinity,
      title: "Unlimited AI analysis",
      description: "Go Pro to remove all usage limits"
    },
    {
      icon: IconShield,
      title: "Secure & private",
      description: "Your data is encrypted and never sold"
    }
  ];

  return (
    <div className="auth-page">
      {/* Left side - Visual */}
      <div className="auth-visual">
        <div className="auth-visual-content">
          <h1 className="auth-visual-title">
            Unlock the full<br />
            power of<br />
            <span style={{ color: 'var(--accent)' }}>Oddvision</span>
          </h1>
          
          <div>
            {features.map((feature, index) => (
              <div key={index} className="auth-feature">
                <div className="auth-feature-icon">
                  <feature.icon size={24} />
                </div>
                <div>
                  <h3 className="auth-feature-title">{feature.title}</h3>
                  <p className="auth-feature-text">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-header">
            <Link href="/" className="auth-logo">
              <Image
                src="/logo.png"
                alt="Oddvision"
                width={48}
                height={48}
                className="auth-logo-img"
              />
              <span className="auth-logo-text">Oddvision</span>
            </Link>
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to access your account</p>
          </div>

          {errorMessage && (
            <div className="auth-error">{errorMessage}</div>
          )}

          {loading ? (
            <div className="auth-loading">
              <div className="auth-spinner" />
              <span className="auth-loading-text">Connecting...</span>
            </div>
          ) : user ? (
            <div>
              <div className="auth-success">
                <p className="auth-success-label">Logged in as</p>
                <p className="auth-success-email">{user.email}</p>
              </div>
              
              <div className="auth-buttons">
                <button 
                  onClick={() => router.push('/')}
                  className="auth-btn auth-btn-primary"
                >
                  Continue to App
                  <IconArrowRight size={18} />
                </button>
                
                <button 
                  onClick={signOut}
                  disabled={isSigningOut}
                  className="auth-btn auth-btn-secondary"
                >
                  {isSigningOut ? "Signing out..." : (
                    <>
                      <IconLogout size={18} />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <button onClick={signInWithGoogle} className="auth-btn auth-btn-google">
                <IconBrandGoogle size={20} />
                Continue with Google
              </button>
              
              <button onClick={clearBrowserData} className="auth-reset">
                <IconRefresh size={14} />
                Reset login data
              </button>
            </div>
          )}
          
          <p className="auth-terms">
            By continuing, you agree to our{" "}
            <Link href="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--black)',
        color: 'var(--white-dim)'
      }}>
        <div className="auth-spinner" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
