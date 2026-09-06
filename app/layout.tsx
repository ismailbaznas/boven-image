import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blogger API Lab — Media Vault Phase 0",
  description: "Eksperimen upload image ke Blogger",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "ui-sans-system, -apple-system, Segoe UI, Roboto, sans-serif", background: "#0a0a0a", color: "#ededed", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
