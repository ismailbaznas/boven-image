# 📝 Catatan Tahapan Perbaikan & Panduan Rollback — Media Vault

Dokumen ini mencatat riwayat tahapan perbaikan pada aplikasi **Media Vault (Boven Image)** agar setiap perubahan terstruktur, terdokumentasi, dan mudah di-rollback jika diperlukan.

---

## 📌 Status Terakhir Repository & Checkpoint

| Checkpoint | Commit Ref / Hash | Deskripsi Singkat |
|---|---|---|
| **Baseline (Awal)** | `2ff8c39` | Normalisasi folder organisasi/program, sidebar 1-expand, Blogger resumable upload |
| **Tahap 1 (Selesai)** | `69aa5d4` | Input field dipermudah (datalist org & prog), ID `boven-digoel-[N]`, filename `[file]-[org]-[prog]-[id].[ext]`, sampul folder manual, mobile compact |
| **Tahap 2 (Selesai)** | `5e3cbb9` | Multi-file staging preview, progressive batch uploader dengan live progress bar, bebas timeout serverless |
| **Tahap 3 (Selesai)** | `57ea470` | Mobile Off-Canvas Drawer (Sandwich ☰) & Floating Bottom Bar untuk akses penuh folder & program |
| **Tahap 4 (Selesai)** | `18357d8` | Favicon logo resmi & Halaman Kepatuhan Google Cloud OAuth (/privacy-policy & /terms) |
| **Tahap 5 (Selesai)** | `14bb3a7` | Client-Side Auto-Compressor (Canvas 2.5K 85%) untuk foto raksasa > 4 MB (hemat kuota & bebas batas upload) |
| **Tahap 6 (Selesai)** | `0876945` | Perbaikan tampilan detail modal mobile (Copy HTML/Next.js rapi) & tombol Buka Resolusi Asli |
| **Tahap 7 (Selesai)** | *Pending commit* | Integrasi Disaster Recovery Auto-Sync ke GitHub Manifest (`ismailbaznas/boven-image-manifest`) |

---

## 🚀 TAHAP 7 — Disaster Recovery GitHub Manifest Auto-Sync

### 1. Tujuan & Arsitektur Anti-Vendor Lock-in
- Mencegah kehilangan metadata & daftar URL foto Blogger jika suatu saat database Supabase rusak atau tutup.
- Seluruh struktur data diekspor ke format terbuka (JSON & SQL standar) dan di-commit langsung ke repositori GitHub:
  `https://github.com/ismailbaznas/boven-image-manifest`

### 2. File Manifest yang Dihasilkan
- `data/media.json`: Seluruh daftar foto (`boven-digoel-[N]`), URL Blogger asli (`s0`), SHA-256 hash, metadata, dan timestamp.
- `data/organizations.json`: Daftar folder organisasi & konfigurasi sampul.
- `data/programs.json`: Hierarki program per organisasi.
- `data/summary.json`: Ringkasan statistik & timestamp sync terakhir.
- `sql/backup.sql`: Skrip SQL standar siap pakai untuk restore ke database baru manapun (PostgreSQL, SQLite, MySQL, dll).
- `README.md`: Ringkasan status arsip & panduan pemulihan (*Disaster Recovery Guide*).

### 3. Otomasi & Kontrol Pengguna (`lib/manifest.ts`, `/api/vault/manifest/sync`, `app/page.tsx`)
- **Tombol Manual di Sidebar:** Tombol `[ 💾 Backup ke GitHub ]` di bagian bawah sidebar untuk memicu sinkronisasi kapan saja dengan satu klik.
- **Auto-Sync via Keep-Alive Cron:** Terintegrasi di `/api/cron/keep-alive` sehingga backup manifest berjalan otomatis secara berkala.
- **Endpoint Terbuka:** `/api/vault/manifest/sync` (POST untuk trigger sync, GET untuk cek status).

---

## 🚀 TAHAP 6 — Perbaikan Detail Media & Tombol Buka Gambar Asli

### 1. Masalah Tampilan Detail Sebelumnya
- Pada perangkat mobile, tombol "Copy HTML" terlihat terpotong sebagian dan "Copy Next.js" tertutup oleh floating menu dock.
- Belum ada tombol langsung yang intuitif untuk membuka/melihat file resolusi original `s0` di tab baru.

### 2. Solusi & Perubahan Baru (`app/page.tsx` & `app/vault.css`)
- **Tombol Buka Gambar Resolusi Asli:**
  - Ditambahkan tombol primer hijau: `[ 🔍 Buka Gambar Resolusi Asli (s0) ↗ ]` di dalam panel detail gambar (baik mobile maupun desktop).
  - Mengarahkan langsung ke URL original `s0` di tab baru dengan `rel="noopener noreferrer"`.
- **Perbaikan Grid Salin Kode di Mobile:**
  - `.copy-grid` diubah menjadi 2 kolom rapi di mobile dengan padding bawah `45px - 50px` pada `.detail-content`.
  - Tombol dilengkapi ikon visual: `📋 Copy URL`, `📝 Copy Markdown`, `🌐 Copy HTML`, dan `⚛️ Copy Next.js`.
- **Pembersihan Floating Menu saat Modal Aktif:**
  - Menu mengambang di bawah layar (`.mobile-floating-bar`) otomatis disembunyikan saat modal detail atau modal upload sedang aktif (`!selected && !showUpload`), sehingga tidak akan pernah menutupi tombol apapun.

---

## 🚀 TAHAP 5 — Client-Side Auto-Compressor (Opsi B)

### 1. Masalah Foto Resolusi Tinggi Kamera
- File foto dari kamera digital/smartphone beresolusi tinggi seringkali berukuran 14 MB – 20 MB+ per foto.
- Batasan request body serverless Vercel adalah 4.5 MB per file.

### 2. Solusi & Perubahan Baru (`lib/compress.ts`, `app/page.tsx`, `app/vault.css`)
- **Auto-Compress Client di Browser:**
  - Saat file foto dipilih atau di-drag & drop, browser secara otomatis mendeteksi jika ukuran file melebihi ambang batas aman (> 3.8 MB).
  - Melakukan downscaling cerdas ke resolusi tinggi **2560px (2.5K High-Res)** dengan kualitas JPEG **85%** menggunakan HTML5 Canvas.
  - Ukuran file turun drastis dari **~16 MB** menjadi **~800 KB – 1.6 MB** (pengurangan ukuran hingga ~90-95%) tanpa kehilangan ketajaman visual.
- **Visual Feedback Lengkap di Modal:**
  - Menampilkan banner progres saat proses optimasi berjalan: `⚡ Mengoptimalkan foto untuk upload (X/Total)...`
  - Setiap kartu foto menampilkan badge `✓ Optimized`, ukuran asli yang dicoret, dan ukuran baru yang dioptimalkan (`16.5 MB ➔ 1.2 MB`).
  - Total ukuran keseluruhan dan total MB yang berhasil dihemat ditampilkan di header modal: `(Total 74.2 MB — hemat 958 MB dari 1.03 GB)`.

---

## 🚀 TAHAP 4 — Favicon Logo Resmi & Halaman Kepatuhan Google Cloud OAuth

### 1. Favicon & Branding Logo
- Menggunakan `app/logo.png` sebagai favicon resmi aplikasi.
- Disalin ke `app/icon.png`, `app/apple-icon.png`, dan `public/logo.png`.
- Dikonfigurasikan di metadata `app/layout.tsx` (`icons.icon`, `icons.apple`, `icons.shortcut`).

### 2. Halaman Kepatuhan Google Cloud OAuth
- **`/privacy-policy` (`app/privacy-policy/page.tsx`):**
  - Menjelaskan identitas aplikasi **Boven Image (Media Vault)**.
  - Memuat pengungkapan eksplisit kepatuhan terhadap **Google API Services User Data Policy** (khususnya persyaratan *Limited Use* pada scope `https://www.googleapis.com/auth/blogger`).
  - Menjelaskan mekanisme penyimpanan aman token enkripsi sesi server, retensi data, serta cara pencabutan izin (revocation/deletion).
- **`/terms` (`app/terms/page.tsx`):**
  - Menjelaskan ketentuan penggunaan sistem arsip visual digital untuk kegiatan pelaporan dan dokumentasi resmi.
  - Batasan tanggung jawab, hak cipta konten, dan integrasi Google API.
- **Navigasi Legal:**
  - Tautan Kebijakan Privasi dan Ketentuan Layanan ditambahkan di bagian bawah sidebar (`.sidebar-legal`) dan footer halaman utama (`.page-footer`).

---

## 🚀 TAHAP 3 — Mobile Off-Canvas Drawer & Floating Quick Navigation

### 1. Masalah Mobile Sebelumnya
- Pada layar smartphone/tablet, sidebar dipadatkan menjadi strip sempit 64px dan tree folder organisasi & program disembunyikan (`display: none`), sehingga user mobile tidak bisa melihat atau memilih program per organisasi dari sidebar.
- Ruang layar utama terpotong 64px di sebelah kiri.

### 2. Solusi & Perubahan Baru (`app/page.tsx` & `app/vault.css`)
- **Off-Canvas Slide-in Drawer:**
  - Sidebar di mobile/tablet (<= 900px) menjadi slide-in drawer penuh yang nyaman dibuka via tombol Sandwich (☰) dan ditutup via tombol silang (✕) atau tap di luar area (backdrop).
  - Tree **FOLDER & PROGRAM** dapat dibuka dan ditelusuri lengkap di mobile. Saat salah satu program dipilih, drawer otomatis tertutup dan halaman langsung menampilkan foto-foto dari program tersebut.
- **Sandwich Button di Topbar:**
  - Tombol `[ ☰ Menu & Folder (N) ]` ditempatkan di bagian atas untuk membuka navigasi folder dengan 1 ketukan.
- **Floating Bottom Navigation Bar:**
  - Menu dock mengambang di bawah layar ponsel memudahkan jangkauan jempol:
    1. `[ ▦ Semua ]` — Reset filter dan kembali ke semua media.
    2. `[ 📁 Folder ]` — Buka drawer menu & seluruh folder organisasi/program.
    3. `[ ＋ Upload ]` — Buka modal upload multi-foto.
    4. `[ 🔍 Cari ]` — Fokus instan ke kotak pencarian.
- **Lebar Layar 100% Penuh:**
  - Galeri media di mobile kini menggunakan 100% lebar layar ponsel tanpa terpotong strip sidebar statis.

---

## 🚀 TAHAP 2 — Multi-File Staging & Progressive Batch Upload

### 1. Masalah Batch Sebelumnya
- Saat memilih beberapa foto, tidak ada antarmuka staging/preview yang menampilkan file apa saja yang sudah dipilih sebelum diupload.
- Jika 5–10 foto dikirim dalam 1 request HTTP sekaligus, total payload bisa melebihi batas 4.5 MB Serverless Vercel (`413 Payload Too Large`) atau terkena timeout eksekusi 10 detik.

### 2. Solusi & Perubahan Baru (`app/page.tsx` & `app/vault.css`)
- **Staging Preview Interaktif:**
  - File yang dipilih atau di-drag & drop otomatis masuk ke daftar antrean upload (`stagedFiles`).
  - Menampilkan jumlah file, ukuran total, nama file, dan tombol hapus (✕) per file jika ada yang salah pilih.
  - Terdapat tombol `+ Tambah foto lagi` untuk menambahkan foto secara bertahap.
- **Progressive Batch Processing (Client Loop):**
  - Setiap foto dikirim dalam request HTTP individual yang ringan (~1-2 detik per foto).
  - Tidak akan pernah terkena limit ukuran 4.5 MB atau timeout 10 detik di Vercel.
  - **Live Progress Indicator:** Menampilkan persentase dan nama file yang sedang aktif diproses (misal: `Mengupload 4 dari 10 foto (40%) — rumah.jpg`).
  - Jika salah satu file gagal, proses tetap berlanjut untuk file lainnya dengan laporan status yang jelas.
- **Header & Keterangan Resolusi Asli:**
  - Judul header diperjelas menjadi **Media Vault** dengan subteks informatif bahwa gambar di katalog adalah pratinjau hemat kuota, dan untuk mengunduh resolusi asli penuh dapat menggunakan fitur **Salin URL Original**.

---

## 🚀 TAHAP 1 — Permudah Form Input & Penamaan File Deskriptif

### 1. Perubahan Input Form (`app/page.tsx`)
- **Urutan Field Baru:**
  1. `Organisasi`
  2. `Program`
  3. `Lokasi`
  4. `Tanggal`
- **Dropdown + Ketik Manual Organisasi:**
  - Field dikosongkan secara default (tidak ada prefilled value) agar seluruh daftar pilihan langsung muncul saat input diklik/fokus.
  - Placeholder: `"Pilih list atau ketik manual..."`.
  - Terhubung dengan `<datalist id="org-datalist">` yang memuat seluruh organisasi dari database (`/api/vault/folders`).
  - User tetap bebas mengetik nama organisasi baru secara manual.
- **Dropdown + Ketik Manual Program (Terfilter Dinamis):**
  - Field dikosongkan secara default.
  - Placeholder: `"Pilih list atau ketik manual..."`.
  - Terhubung dengan `<datalist id="prog-datalist">`.
  - Opsi program disaring secara dinamis berdasarkan organisasi yang sedang dipilih/diketik (atau menampilkan semua program jika organisasi belum dipilih).
  - User bebas mengetik nama program baru secara manual.
- **Penghapusan Field Prefix:**
  - Field `idPrefix` dihapus dari form upload untuk menyederhanakan antarmuka pengguna.
- **Tampilan Label Thumbnail Card:**
  - Label kecil di atas judul kartu media diubah dari `media.id` menjadi `organizations.id` (slug organisasi, misal `baznas-boven-digoel`). Detail ID lengkap tetap dapat dilihat di dalam panel modal detail.

### 2. Standar Penamaan File & ID (`lib/slug.ts` & `app/api/vault/upload/route.ts`)
- **Format ID Media:**
  - Pola: `boven-digoel-[N]` (misal: `boven-digoel-1`, `boven-digoel-2`, `boven-digoel-3`, dst. dengan tanda `-` sebelum nomor agar mudah dibaca di view detail).
  - Sistem mencari nomor urut terakhir (`max(seq)`) dari data yang ada di Supabase dan melanjutkan secara otomatis.
- **Format Nama File (Filename & Blogger Upload):**
  - Pola: `[nama-file-asli]-[organisasi]-[program]-[id].[ext]`
  - Karakter spasi dan karakter non-alfanumerik otomatis diubah menjadi tanda hubung (`-`), format lowercase.
  - **Contoh:**
    - File asli: `rumah.jpg`
    - Organisasi: `BAZNAS Kabupaten Boven Digoel`
    - Program: `Pembagian Zakat Fitrah`
    - ID: `boven-digoel-1`
    - **Hasil Filename:** `rumah-baznas-kabupaten-boven-digoel-pembagian-zakat-fitrah-boven-digoel-1.jpg`

### 3. Tampilan Mobile & Hemat Bandwidth Thumbnail
- **Stats Strip 1 Baris Ringkas:**
  - Tiga kartu statistik (Total Media, Program, Storage) disatukan dalam 1 baris horizontal compact (`.stats-strip`).
  - Keterangan dipersingkat (`Total: N Media`, `Program: N Koleksi`, `Storage: Blogger [dot]`), menghemat ruang vertikal layar HP hingga ~85%.
- **Varian Gambar Terkecil (Hemat Bandwidth):**
  - Mengikuti spesifikasi `docs/blog_image_format.html`:
    - Thumbnail kartu menggunakan `w200-h150` (~25KB) untuk mobile (`src`) dan `w320-h240` (~35KB) via `srcSet` untuk desktop.
    - Cover folder organisasi menggunakan `w200-h150`.
    - Preview modal detail menggunakan `w640-h480` (~80KB).
    - Source of truth di database tetap `s0` (resolusi asli) dan tombol `COPY URL` tetap memberikan URL original `s0`.
- **Desain Responsif Mobile:**
  - Grid media 2-kolom kompak di mobile (`aspect-ratio: 1/1`).
  - Modal detail berubah menjadi *Bottom Sheet* yang nyaman dibuka dan ditutup dengan jempol di perangkat layar sentuh.

### 4. Fitur Sampul Folder Organisasi Manual (`organizations.cover_media_id`)
- **API `PATCH /api/vault/folders`:**
  - Menerima payload `{ org_id, media_id }` untuk mengupdate kolom `organizations.cover_media_id`.
  - Jika `cover_media_id` diset, folder organisasi akan menggunakan gambar pilihan tersebut sebagai sampul.
  - Jika belum diset, otomatis fallback ke foto terbaru dari organisasi tersebut.
- **Interaksi Pengguna:**
  - Di dalam panel modal detail gambar, terdapat tombol aksi: `[🖼 Jadikan Sampul Organisasi]`.
  - Jika gambar yang sedang dibuka adalah sampul aktif, tombol akan menampilkan status `[✓ Sampul Organisasi Aktif (Klik untuk lepas)]`.
  - Mengubah sampul langsung memperbarui tampilan kartu folder organisasi di beranda dan sidebar tanpa reload halaman.

---

## ⏪ Panduan Rollback ke Checkpoint Sebelumnya

Jika terjadi masalah kritis pada Tahap 2 dan ingin mengembalikan kode ke kondisi sebelum Tahap 2:

```bash
# 1. Cek riwayat commit
git log --oneline -5

# 2. Rollback kode ke commit baseline Tahap 1 (69aa5d4)
git reset --hard 69aa5d4

# 3. Verifikasi build lokal
npm run build

# 4. Force push ke remote jika diperlukan
git push origin main --force
git push ismail main --force
```
