import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boven Image — Media Vault",
  description: "Arsip visual Boven Digoel dengan katalog media dan penyimpanan Blogger.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", type: "image/png" }],
    shortcut: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
