"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        <Link href="/login" onClick={() => setIsMenuOpen(false)}>
          Log In
        </Link>
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

