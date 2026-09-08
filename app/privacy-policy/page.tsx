import type { Metadata } from "next";
import Link from "next/link";
import "../vault.css";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (Privacy Policy) — Boven Image Media Vault",
  description: "Kebijakan privasi dan kepatuhan penggunaan data Google API untuk aplikasi Boven Image Media Vault.",
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "var(--shadow)",
          lineHeight: "1.7",
          color: "var(--ink)",
        }}
      >
        <header style={{ borderBottom: "1px solid var(--line)", paddingBottom: "20px", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src="/logo.png" alt="Boven Image Logo" style={{ width: "38px", height: "38px", borderRadius: "10px", objectFit: "contain" }} />
              <div>
                <h1 style={{ fontSize: "22px", margin: 0, letterSpacing: "-0.5px" }}>Kebijakan Privasi</h1>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Boven Image — Media Vault Boven Digoel</span>
              </div>
            </div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ← Kembali ke Aplikasi
            </Link>
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "14px" }}>
            Terakhir Diperbarui: <strong>8 September 2026</strong> • Berlaku Efektif: <strong>8 September 2026</strong>
          </div>
        </header>

        <section style={{ display: "grid", gap: "22px", fontSize: "13.5px" }}>
          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>1. Pendahuluan</h2>
            <p style={{ margin: 0 }}>
              Selamat datang di <strong>Boven Image (Media Vault)</strong>. Kami berkomitmen untuk melindungi privasi dan keamanan data pengguna. Dokumen Kebijakan Privasi ini menjelaskan bagaimana aplikasi kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi ketika Anda menggunakan layanan kami, termasuk saat menghubungkan akun Google Anda melalui Google OAuth.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>2. Informasi yang Kami Akses & Kebutuhan Google API</h2>
            <p style={{ margin: "0 0 8px" }}>
              Aplikasi <strong>Boven Image</strong> menggunakan protokol resmi Google OAuth 2.0 untuk mengautentikasi pengelola/administrator sistem dan melakukan sinkronisasi arsip dokumentasi visual.
            </p>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              <li>
                <strong>Scope Google Blogger (`https://www.googleapis.com/auth/blogger`):</strong> Digunakan secara eksklusif untuk mengunggah media foto dokumentasi kegiatan BAZNAS Kabupaten Boven Digoel dan program terkait ke hosting album Blogger resmi yang dikelola oleh organisasi.
              </li>
              <li>
                <strong>Informasi Profil Dasar:</strong> Kami tidak meminta, mengumpulkan, atau menyimpan daftar kontak, email pribadi pengguna lain, atau data pribadi sensitif di luar kebutuhan autentikasi sesi upload foto.
              </li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>3. Pernyataan Kepatuhan Google API Services User Data Policy (Limited Use)</h2>
            <p style={{ margin: 0, background: "var(--accent-soft)", padding: "14px", borderRadius: "10px", border: "1px solid #c8e2d2" }}>
              Penggunaan dan transfer informasi yang diterima oleh <strong>Boven Image</strong> dari Google API ke aplikasi lain akan mematuhi secara ketat <strong><a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 700 }}>Google API Services User Data Policy</a></strong>, termasuk persyaratan <em>Limited Use</em>. Kami <strong>TIDAK PERNAH</strong> menjual data pengguna ke pihak ketiga atau menggunakannya untuk tujuan periklanan.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>4. Penyimpanan & Keamanan Data</h2>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              <li>
                <strong>Token Autentikasi:</strong> Token akses dan refresh token disimpan dengan aman di sisi server menggunakan enkripsi dan cookie berbasis <code>HttpOnly</code> serta <code>SameSite=Lax/Strict</code> dengan perlindungan SSL/HTTPS.
              </li>
              <li>
                <strong>Katalog Metadata:</strong> Informasi metadata foto (nama program, tanggal dokumentasi, lokasi kegiatan di Boven Digoel) dicatat dalam basis data katalog PostgreSQL (Supabase) dengan perlindungan Row Level Security (RLS).
              </li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>5. Pencabutan Akses & Penghapusan Data (Data Retention & Deletion)</h2>
            <p style={{ margin: 0 }}>
              Anda dapat mencabut izin akses aplikasi <strong>Boven Image</strong> kapan saja dengan dua cara:
            </p>
            <ol style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
              <li>Melalui tombol <em>Logout</em> di aplikasi yang akan menghapus sesi token di browser Anda.</li>
              <li>
                Melalui pengaturan akun Google Anda di halaman <strong><a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Google Account Permissions</a></strong>.
              </li>
            </ol>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>6. Kontak & Pengelola Aplikasi</h2>
            <p style={{ margin: 0 }}>
              Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau pengelolaan data di Media Vault, silakan hubungi tim pengelola:
            </p>
            <div style={{ marginTop: "8px", background: "#fbfcfb", padding: "12px", border: "1px solid var(--line)", borderRadius: "8px", fontSize: "12.5px" }}>
              <div><strong>Pengelola:</strong> BAZNAS Kabupaten Boven Digoel — Tim Media & TI</div>
              <div><strong>Wilayah:</strong> Tanah Merah, Kabupaten Boven Digoel, Papua Selatan, Indonesia</div>
              <div><strong>Email Dukungan:</strong> <code>ismailbaznas@gmail.com</code></div>
            </div>
          </div>
        </section>

        <footer style={{ marginTop: "32px", paddingTop: "18px", borderTop: "1px solid var(--line)", textAlign: "center", fontSize: "11px", color: "var(--muted)" }}>
          © {new Date().getFullYear()} Boven Image — Media Vault Boven Digoel. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
