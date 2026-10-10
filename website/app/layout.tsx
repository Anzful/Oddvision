import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#0f0f19",
};

export const metadata: Metadata = {
  title: "Oddvision — Stealth AI Overlay",
  description: "Oddvision — a stealth AI overlay for any webpage. Capture content, analyze instantly, stay under the radar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LoadingScreen />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

function LoadingScreen() {
  return (
    <div className="loader" id="loading-screen">
      {/* Noise overlay */}
      <div className="loader-noise" />
      
      {/* Horizontal scan line */}
      <div className="loader-scanline" />
      
      {/* Grid background */}
      <div className="loader-grid" />
      
      {/* Main content */}
      <div className="loader-content">
        {/* Glitch logo */}
        <div className="loader-logo">
          <div className="loader-logo-ghost">
            <svg viewBox="0 0 100 100" className="loader-ghost-svg">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Ghost body */}
              <path 
                d="M50 10 C25 10 15 30 15 50 C15 70 15 90 15 90 L25 80 L35 90 L45 80 L55 90 L65 80 L75 90 L85 80 L85 90 C85 90 85 70 85 50 C85 30 75 10 50 10Z" 
                fill="none" 
                stroke="#7c3aed" 
                strokeWidth="2"
                filter="url(#glow)"
                className="loader-ghost-path"
              />
              {/* Eyes */}
              <circle cx="38" cy="45" r="8" fill="#7c3aed" className="loader-eye loader-eye-left"/>
              <circle cx="62" cy="45" r="8" fill="#7c3aed" className="loader-eye loader-eye-right"/>
              <circle cx="38" cy="45" r="3" fill="#22d3ee" className="loader-pupil"/>
              <circle cx="62" cy="45" r="3" fill="#22d3ee" className="loader-pupil"/>
            </svg>
          </div>
        </div>

        {/* Glitch text */}
        <div className="loader-text">
          <span className="loader-title" data-text="ODDVISION">ODDVISION</span>
        </div>

        {/* Status line */}
        <div className="loader-status">
          <span className="loader-bracket">[</span>
          <span className="loader-status-text">INITIALIZING GHOST PROTOCOL</span>
          <span className="loader-bracket">]</span>
        </div>

        {/* Progress bar */}
        <div className="loader-progress">
          <div className="loader-progress-bar" />
          <div className="loader-progress-glow" />
        </div>

        {/* Boot sequence */}
        <div className="loader-boot">
          <div className="loader-boot-line"><span className="loader-ok">✓</span> Stealth overlay loaded</div>
          <div className="loader-boot-line"><span className="loader-ok">✓</span> AI connection established</div>
          <div className="loader-boot-line"><span className="loader-ok">✓</span> Ghost mode ready</div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="loader-corner loader-corner-tl" />
      <div className="loader-corner loader-corner-tr" />
      <div className="loader-corner loader-corner-bl" />
      <div className="loader-corner loader-corner-br" />
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              setTimeout(function() {
                var loader = document.getElementById('loading-screen');
                if (loader) {
                  loader.classList.add('loader-exit');
                  setTimeout(function() {
                    loader.style.display = 'none';
                  }, 1000);
                }
              }, 2800);
            });
          `,
        }}
      />
    </div>
  );
}
