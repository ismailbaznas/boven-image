# 📝 Catatan Tahapan Perbaikan & Panduan Rollback — Media Vault

Dokumen ini mencatat riwayat tahapan perbaikan pada aplikasi **Media Vault (Boven Image)** agar setiap perubahan terstruktur, terdokumentasi, dan mudah di-rollback jika diperlukan.

---

## 📌 Status Terakhir Repository & Checkpoint

| Checkpoint | Commit Ref / Hash | Deskripsi Singkat |
|---|---|---|
| **Baseline (Sebelum Tahap 1)** | `2ff8c39` | Normalisasi folder organisasi/program, sidebar 1-expand, Blogger resumable upload |
| **Tahap 1 (Selesai)** | *Pending commit* | Input field dipermudah (datalist org & prog), ID `boven-digoel[N]`, filename `[file]-[org]-[prog]-[id].[ext]` |

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

Jika terjadi masalah kritis pada Tahap 1 dan ingin mengembalikan kode ke kondisi sebelum Tahap 1:

```bash
# 1. Cek riwayat commit
git log --oneline -5

# 2. Rollback kode ke commit baseline (2ff8c39)
git reset --hard 2ff8c39

# 3. Verifikasi build lokal
npm run build

# 4. Force push ke remote jika diperlukan
git push origin main --force
git push ismail main --force
```
