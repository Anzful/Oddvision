"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useSearchParams, useRouter } from "next/navigation";
import { IconBrandGoogle, IconCheck, IconArrowRight, IconLogout, IconRefresh } from "@tabler/icons-react";

function LoginContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for errors in URL
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (error) {
      console.error("Auth Error:", error, errorDesc);
      setErrorMessage(errorDesc || "Authentication failed. Please try again.");
    }

    // Failsafe timeout
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Session check timed out, forcing loading false");
        setLoading(false);
      }
    }, 3000);

    // Initial Check
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Session check error:", error);
        }
        setUser(data.session?.user ?? null);
      } catch (err) {
        console.error("Unexpected session check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    // Listener
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
  }, [searchParams]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      console.error("Login error:", error.message);
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
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.reload();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Context */}
        <div className="hidden md:block">
          <h1 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Unlock the full power of Oddvision
          </h1>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <IconCheck className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Sync Across Devices</h3>
                <p className="text-gray-400">Access your subscription on any computer.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <IconCheck className="text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Unlimited AI Analysis</h3>
                <p className="text-gray-400">Go Pro to remove all limits.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                <IconCheck className="text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure & Private</h3>
                <p className="text-gray-400">Your data is encrypted and never sold.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-gray-400">Sign in to continue</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-gray-400 text-sm">Connecting...</span>
            </div>
          ) : user ? (
            <div className="text-center py-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                <p className="text-green-400 font-medium mb-1">Logged in as</p>
                <p className="text-white break-all">{user.email}</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02]"
                >
                  Continue to App <IconArrowRight size={18} />
                </button>
                
                <button 
                  onClick={signOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <span className="animate-pulse">Signing out...</span>
                  ) : (
                    <>
                      <IconLogout size={18} /> Sign Out
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
                <button
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <IconBrandGoogle size={20} />
                  Continue with Google
                </button>
                
                <button
                    onClick={clearBrowserData}
                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 mt-2"
                    title="Fix stuck login issues"
                >
                    <IconRefresh size={12} /> Reset Login Data
                </button>
            </div>
          )}
          
          <p className="text-center mt-6 text-xs text-gray-500">
            By continuing, you agree to our <a href="/privacy" className="underline hover:text-gray-300">Privacy Policy</a>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
