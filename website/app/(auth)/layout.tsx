import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="ov-nav" style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--panel)", backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Link href="/" className="ov-brand" style={{ textDecoration: "none" }}>
            <Image
              src="/logo.png"
              alt="Oddvision Logo"
              width={28}
              height={28}
              className="ov-brand-logo"
            />
            Oddvision
          </Link>
          <Link href="/" style={{ textDecoration: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "14px" }}>
            Home
          </Link>
        </div>
      </nav>
      <main className="ov-privacy-page" style={{ minHeight: "calc(100vh - 60px)" }}>
        {children}
      </main>
    </>
  );
}
