import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boven Image — Media Vault",
  description: "Arsip visual Boven Digoel dengan katalog media dan penyimpanan Blogger.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
