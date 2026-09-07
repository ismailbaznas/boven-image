# 📝 Catatan Tahapan Perbaikan & Panduan Rollback — Media Vault

Dokumen ini mencatat riwayat tahapan perbaikan pada aplikasi **Media Vault (Boven Image)** agar setiap perubahan terstruktur, terdokumentasi, dan mudah di-rollback jika diperlukan.

---

## 📌 Status Terakhir Repository & Checkpoint

| Checkpoint | Commit Ref / Hash | Deskripsi Singkat |
|---|---|---|
| **Baseline (Awal)** | `2ff8c39` | Normalisasi folder organisasi/program, sidebar 1-expand, Blogger resumable upload |
| **Tahap 1 (Selesai)** | `69aa5d4` | Input field dipermudah (datalist org & prog), ID `boven-digoel-[N]`, filename `[file]-[org]-[prog]-[id].[ext]`, sampul folder manual, mobile compact |
| **Tahap 2 (Selesai)** | `5e3cbb9` | Multi-file staging preview, progressive batch uploader dengan live progress bar, bebas timeout serverless |
| **Tahap 3 (Selesai)** | *Pending commit* | Mobile Off-Canvas Drawer (Sandwich ☰) & Floating Bottom Bar untuk akses penuh folder & program |

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
