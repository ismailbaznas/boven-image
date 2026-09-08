import type { Metadata } from "next";
import Link from "next/link";
import "../vault.css";

export const metadata: Metadata = {
  title: "Ketentuan Layanan (Terms of Service) — Boven Image Media Vault",
  description: "Ketentuan dan syarat penggunaan layanan arsip visual digital Boven Image Media Vault.",
};

export default function TermsPage() {
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
                <h1 style={{ fontSize: "22px", margin: 0, letterSpacing: "-0.5px" }}>Ketentuan Layanan</h1>
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
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>1. Penerimaan Ketentuan</h2>
            <p style={{ margin: 0 }}>
              Dengan mengakses dan menggunakan sistem <strong>Boven Image (Media Vault)</strong>, Anda menyetujui untuk terikat oleh Ketentuan Layanan (<em>Terms of Service</em>) ini. Jika Anda tidak menyetujui salah satu poin dalam ketentuan ini, Anda tidak diperkenankan untuk menggunakan layanan ini.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>2. Deskripsi Layanan</h2>
            <p style={{ margin: 0 }}>
              <strong>Boven Image</strong> adalah platform arsip visual digital terpadu yang dirancang untuk mengelola, mengorganisir, dan menyajikan dokumentasi program, kegiatan sosial, dan penyaluran zakat/infaq/shadaqah di lingkungan Kabupaten Boven Digoel, Papua Selatan.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>3. Penggunaan Akun & Akses Google OAuth</h2>
            <p style={{ margin: "0 0 8px" }}>
              Akses pengunggahan (upload) dan pengelolaan arsip memerlukan autentikasi resmi melalui akun Google pengelola yang berwenang. Anda bertanggung jawab untuk:
            </p>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              <li>Menjaga kerahasiaan kredensial dan sesi login Anda.</li>
              <li>Memastikan setiap materi foto yang diunggah memiliki hak cipta yang sah dan relevan dengan kegiatan resmi organisasi.</li>
              <li>Tidak mengunggah materi yang melanggar hukum, mengandung unsur pornografi, ujaran kebencian, atau malware.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>4. Integrasi Pihak Ketiga (Google API)</h2>
            <p style={{ margin: 0 }}>
              Layanan kami terintegrasi dengan Google API (khususnya Blogger API & Google Auth). Penggunaan layanan Google melalui aplikasi ini tunduk pada <strong><a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Google Terms of Service</a></strong> dan Kebijakan Penggunaan Data Pengguna Google.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>5. Hak Kekayaan Intelektual & Konten</h2>
            <p style={{ margin: 0 }}>
              Seluruh foto dokumentasi, aset logo, dan metadata program yang tersimpan di dalam arsip tetap menjadi hak milik BAZNAS Kabupaten Boven Digoel atau mitra organisasi pengunggah yang bersangkutan. Penggunaan publik atas gambar ditujukan untuk transparansi dan pelaporan dokumentasi publik.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>6. Batasan Tanggung Jawab & Perubahan Layanan</h2>
            <p style={{ margin: 0 }}>
              Layanan disediakan secara <em>"sebagaimana adanya"</em> (as-is). Kami berhak melakukan perbaikan, pembaharuan, atau penghentian sementara fitur aplikasi untuk keperluan pemeliharaan sistem atau penyesuaian regulasi tanpa pemberitahuan sebelumnya.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "16px", color: "var(--accent)", margin: "0 0 8px" }}>7. Kontak</h2>
            <p style={{ margin: 0 }}>
              Untuk pertanyaan mengenai ketentuan layanan ini, silakan hubungi:
            </p>
            <div style={{ marginTop: "8px", background: "#fbfcfb", padding: "12px", border: "1px solid var(--line)", borderRadius: "8px", fontSize: "12.5px" }}>
              <div><strong>Pengelola:</strong> BAZNAS Kabupaten Boven Digoel</div>
              <div><strong>Alamat:</strong> Jl. Trans Papua, Tanah Merah, Boven Digoel, Papua Selatan</div>
              <div><strong>Email:</strong> <code>baznasbovendigoel@gmail.com</code></div>
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
