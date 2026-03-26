"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { IconMenu2, IconX, IconUser, IconCrown } from "@tabler/icons-react";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (data?.is_pro) {
          // Check if pro has expired
          if (data.pro_expires_at && new Date(data.pro_expires_at) <= new Date()) {
            setIsPro(false);
          } else {
            setIsPro(true);
          }
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setIsPro(false);

      if (session?.user) {
         const { data } = await supabase
          .from('user_usage')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
         if (data?.is_pro) {
           if (data.pro_expires_at && new Date(data.pro_expires_at) <= new Date()) {
             setIsPro(false);
           } else {
             setIsPro(true);
           }
         }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const timeout = new Promise(resolve => setTimeout(resolve, 1000)); 
    try {
      await Promise.race([supabase.auth.signOut(), timeout]);
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    localStorage.clear();
    sessionStorage.clear();
    
    setUser(null);
    setIsPro(false);
    setIsMenuOpen(false);
    window.location.href = "/"; 
  };

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-inner">
            <Link href="/" className="logo">
              <Image
                src="/logo.png"
                alt="Oddvision"
                width={36}
                height={36}
                className="logo-img"
              />
              <span>Oddvision</span>
            </Link>

            <nav className="nav">
              <Link href="/#features" className="nav-link">Features</Link>
              <Link href="/#how" className="nav-link">How it works</Link>
              <Link href="/#providers" className="nav-link">Providers</Link>
              <Link href="/#pricing" className="nav-link">Pricing</Link>
              
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    background: 'var(--black-lighter)',
                    border: '1px solid var(--border)',
                    borderRadius: '100px',
                    fontSize: '13px'
                  }}>
                    <IconUser size={16} style={{ color: 'var(--accent-2)' }} />
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--white-dim)' }}>
                      {user.email}
                    </span>
                    {isPro && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        background: 'var(--accent)',
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--black)',
                        textTransform: 'uppercase'
                      }}>
                        <IconCrown size={10} />
                        PRO
                      </span>
                    )}
                  </div>
                  <button onClick={handleSignOut} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/login" className="nav-link">Log In</Link>
              )}

              <Link href="/#install" className="nav-cta">Install Free</Link>
            </nav>

            <button className="mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <Link href="/#features" onClick={() => setIsMenuOpen(false)}>Features</Link>
        <Link href="/#how" onClick={() => setIsMenuOpen(false)}>How it works</Link>
        <Link href="/#providers" onClick={() => setIsMenuOpen(false)}>Providers</Link>
        <Link href="/#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</Link>
        {user ? (
          <>
            <span style={{ padding: '16px', color: 'var(--white-dim)', fontSize: '14px' }}>{user.email}</span>
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: 'var(--white)', fontSize: '24px', fontWeight: 600, padding: '16px', textAlign: 'left', cursor: 'pointer' }}>
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login" onClick={() => setIsMenuOpen(false)}>Log In</Link>
        )}
        <Link href="/#install" onClick={() => setIsMenuOpen(false)} style={{ background: 'var(--accent)', color: 'var(--black)', borderRadius: '12px', textAlign: 'center' }}>
          Install Free
        </Link>
      </nav>
    </>
  );
}
