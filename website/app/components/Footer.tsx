import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <Image
              src="/logo.png"
              alt="Oddvision"
              width={32}
              height={32}
              className="footer-logo"
            />
            <span className="footer-name">Oddvision</span>
          </div>
          <div className="footer-links">
            <Link href="/privacy" className="footer-link">Privacy</Link>
            <span className="footer-tagline">Stealth AI for the modern web</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
