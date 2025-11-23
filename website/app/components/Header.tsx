"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { IconMenu2, IconX, IconUser } from "@tabler/icons-react";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    // Initial check
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (data?.is_pro) setIsPro(true);
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setIsPro(false); // Reset first
      
      if (session?.user) {
         const { data } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
         if (data?.is_pro) setIsPro(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    console.log("Sign out clicked");
    // Use Promise.race to prevent hanging
    const timeout = new Promise(resolve => setTimeout(resolve, 1000)); 
    try {
      await Promise.race([supabase.auth.signOut(), timeout]);
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    // Manually clear local storage to be safe
    localStorage.clear();
    sessionStorage.clear();
    
    setUser(null);
    setIsPro(false);
    setIsMenuOpen(false);
    window.location.href = "/"; 
  };

  return (
    <header className="ov-header">
      <Link href="/" className="ov-brand" aria-label="Oddvision home">
        <Image
          src="/logo.png"
          alt="Oddvision Logo"
          width={28}
          height={28}
          className="ov-brand-logo"
        />
        Oddvision
      </Link>
      <nav className={`ov-nav ${isMenuOpen ? "ov-nav--open" : ""}`}>
        <Link href="/#features" onClick={() => setIsMenuOpen(false)}>
          Features
        </Link>
        <Link href="/#how" onClick={() => setIsMenuOpen(false)}>
          How it works
        </Link>
        <Link href="/#providers" onClick={() => setIsMenuOpen(false)}>
          Providers
        </Link>
        <Link href="/#rules" onClick={() => setIsMenuOpen(false)}>
          Rules
        </Link>
        <Link href="/#pricing" onClick={() => setIsMenuOpen(false)}>
          Pricing
        </Link>
        
        {user ? (
          <div className="flex items-center gap-4 md:gap-2 md:flex-row flex-col">
             <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <IconUser size={16} className="text-cyan-400" />
                <span className="truncate max-w-[150px]">{user.email}</span>
                {isPro && (
                  <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase tracking-wider">
                    PRO
                  </span>
                )}
             </div>
             <button 
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-white transition-colors"
             >
                Sign Out
             </button>
          </div>
        ) : (
          <Link href="/login" onClick={() => setIsMenuOpen(false)}>
            Log In
          </Link>
        )}

        <Link
          href="/#install"
          className="ov-btn ov-btn--ghost"
          onClick={() => setIsMenuOpen(false)}
        >
          Install
        </Link>
      </nav>
      <button
        className="ov-nav-toggle"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <IconX /> : <IconMenu2 />}
      </button>
    </header>
  );
}
