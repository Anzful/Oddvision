import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function Footer() {
  return (
    <footer className="ov-footer">
      <div className="ov-container ov-footer-inner">
        <div className="ov-footer-left">
          <Image
            src="/logo.png"
            alt="Oddvision Logo"
            width={34}
            height={34}
            className="ov-footer-logo"
          />
          <span>Oddvision</span>
        </div>
        <div className="ov-footer-right">
          <Link href="/privacy" className="ov-footer-link">
            Privacy Policy
          </Link>
          <span className="ov-footer-dim">Ghost‑mode AI overlay for the web</span>
        </div>
      </div>
    </footer>
  );
}

