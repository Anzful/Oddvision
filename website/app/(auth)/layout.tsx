import Link from "next/link";
import Image from "next/image";
import React from "react";
import type { Metadata } from "next";

// Sign-in pages have nothing to rank for; keep them out of search results.
export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: true } };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="auth-nav">
        <Link href="/" className="logo">
          <Image
            src="/logo.png"
            alt="Oddvision"
            width={32}
            height={32}
            className="logo-img"
          />
          <span>Oddvision</span>
        </Link>
        <Link href="/" className="auth-nav-link">
          ← Back to Home
        </Link>
      </nav>
      <main>
        {children}
      </main>
    </>
  );
}
