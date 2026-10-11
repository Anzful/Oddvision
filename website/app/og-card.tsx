import React from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Oddvision — AI overlay Chrome extension. Alt+1 capture, Alt+2 analyze, Alt+3 hide, Alt+4 snip.";

/** The social preview card shared by opengraph-image and twitter-image. */
export async function renderOgCard() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const keys = [
    ["1", "Capture"],
    ["2", "Analyze"],
    ["3", "Hide"],
    ["4", "Snip"],
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "radial-gradient(circle at 20% 20%, #2a1650 0%, #0f0f19 55%), #0f0f19",
          color: "#eaeaf0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={84} height={84} alt="" />
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 34, fontSize: 52, fontWeight: 700, lineHeight: 1.15, maxWidth: 980 }}>
          AI answers on any webpage, without switching tabs.
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
          {keys.map(([k, label]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderRadius: 16, border: "2px solid #7c3aed", background: "rgba(124,58,237,0.18)", fontSize: 28 }}>
              <span style={{ fontWeight: 800 }}>Alt+{k}</span>
              <span style={{ color: "#a7a8b3" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, fontSize: 26, color: "#22d3ee" }}>oddvision.xyz · Chrome extension · Free to try</div>
      </div>
    ),
    OG_SIZE,
  );
}
