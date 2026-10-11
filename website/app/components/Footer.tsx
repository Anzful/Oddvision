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
            <Link href="/how-it-works" className="footer-link">How it works</Link>
            <Link href="/use-cases" className="footer-link">Use cases</Link>
            <Link href="/compare/oddvision-vs-chatgpt" className="footer-link">Vs. ChatGPT</Link>
            <Link href="/faq" className="footer-link">FAQ</Link>
            <Link href="/terms" className="footer-link">Terms</Link>
            <Link href="/refund" className="footer-link">Refunds</Link>
            <Link href="/privacy" className="footer-link">Privacy</Link>
            <a href="mailto:oddvisionai@gmail.com" className="footer-link">Support</a>
            <span className="footer-tagline">Stealth AI for the modern web</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
