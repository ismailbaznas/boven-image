**Blogger API v3 memang resmi dan aktif**, termasuk OAuth, membuat/mengubah post, dan library Node.js. Google bahkan memperbarui dokumentasinya pada 2026. ([Google for Developers][1])

Tapi ternyata **API publik Blogger tidak mendokumentasikan endpoint khusus "upload image ke Media Manager"** seperti yang kita harapkan. Yang ada adalah API Posts, dan resource post memang punya `images[].url`; endpoint `posts.insert` juga mendukung upload protocol multipart secara generik. ([Google for Developers][2])

Jadi kita **jangan langsung membangun asumsi "POST file → Blogger URL" sebelum mengujinya.**

Dan justru saya usulkan kita bikin ini sebagai **eksperimen kecil dulu**.

---

# 🚀 PROJECT: MEDIA VAULT

Target MVP:

```text
Upload foto
     ↓
Media Vault
     ↓
Google OAuth
     ↓
Blogger
     ↓
dapat URL gambar
     ↓
simpan metadata
     ↓
COPY URL
```

Kalau mekanisme upload Blogger ternyata bisa kita manfaatkan secara resmi/stabil, **gas terus**.

Kalau ternyata API hanya bisa membuat post tetapi tidak benar-benar menjadi media uploader, kita cari jalur Google yang paling aman — **tanpa kembali ke workflow manualmu**.

---

## Arsitektur MVP

Saya sarankan:

```text
Next.js 16
TypeScript
Tailwind
Google OAuth
Blogger API v3
Supabase
```

Supabase hanya katalog:

```text
media
├── id
├── filename
├── title
├── description
├── blogger_url
├── blogger_post_id
├── hash
├── created_at
└── metadata
```

**Foto tidak disimpan di Supabase.**

---

# 🔐 OAuth-nya

Ini juga sudah jelas.

Google menyediakan scope:

```text
https://www.googleapis.com/auth/blogger
```

yang berarti aplikasi dapat **mengelola akun Blogger**. Ada juga scope readonly. ([Google for Developers][3])

Untuk Media Vault pribadi kita:

```text
Google Account
       │
       ▼
   Sign in with Google
       │
       ▼
 OAuth Blogger permission
       │
       ▼
 Media Vault
```

**Jangan pakai service account.**

Kita gunakan OAuth akun Google yang memang memiliki Blogger.

Dan Google sendiri merekomendasikan menggunakan akun Google terpisah untuk development/testing supaya tidak berisiko menghapus data penting saat eksperimen. ([Google for Developers][4])

---

# 🧪 PHASE 0 — jangan bikin UI dulu

Saya malah mau kita melakukan **"Blogger API Laboratory"**.

Satu project kecil:

```text
blogger-lab/
```

Kemampuan:

### Test 1

```text
GET my blogs
```

Apakah aplikasi bisa melihat blog kita?

### Test 2

```text
GET blog info
```

### Test 3

```text
CREATE DRAFT POST
```

### Test 4

```text
INSERT IMAGE / MEDIA
```

**Ini yang paling penting.**

### Test 5

Dapatkan:

```text
blogger.googleusercontent.com/...
```

### Test 6

Hapus draft/post.

Kemudian kita cek:

> **Apakah URL gambarnya masih hidup?**

🔥

Ini sekaligus menjawab pertanyaan awal kita secara empiris, bukan cuma berdasarkan asumsi.

---

# Kenapa saya sangat suka pendekatan ini?

Karena kita bisa menemukan fakta yang selama ini tidak jelas:

```text
Blogger API
     │
     ├── bisa membuat post ✓
     │
     ├── bisa membuat draft ✓
     │
     ├── bisa upload media ? 
     │
     ├── URL image permanen ?
     │
     └── image tetap hidup setelah post dihapus ?
```

Kalau semua ternyata:

```text
✓
✓
✓
✓
✓
```

**Kita jackpot.**

Media Vault bisa benar-benar menggunakan Blogger sebagai backend image storage.

---

# Setelah lolos Phase 0

Baru kita bikin:

```text
MEDIA VAULT
```

dengan dashboard:

```text
┌──────────────────────────────────────────────┐
│ MEDIA VAULT                         Ismail ▾ │
├──────────────────────────────────────────────┤
│                                              │
│  [+ Upload]    Search...        [Filters]   │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │         │ │         │ │         │        │
│  │  FOTO   │ │  FOTO   │ │  FOTO   │        │
│  │         │ │         │ │         │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                              │
│  BDG-2026-FDY-001                            │
│  Penyaluran Fidyah Tahap 3                   │
│                                              │
└──────────────────────────────────────────────┘
```

Klik gambar:

```text
┌──────────────────────────────────────────────┐
│                                              │
│               [ IMAGE ]                      │
│                                              │
├──────────────────────────────────────────────┤
│ ID       BDG-2026-FDY-001                    │
│                                              │
│ Blogger  https://blogger...                  │
│                                              │
│ [ COPY URL ]                                 │
│ [ COPY MARKDOWN ]                            │
│ [ COPY HTML ]                                │
│ [ COPY NEXT.JS ]                             │
│                                              │
│ SHA256   a8f3c7...                            │
└──────────────────────────────────────────────┘
```

---

# Dan nanti bisa jadi jauh lebih keren

Kamu upload:

**10 foto kegiatan fidyah.**

Media Vault otomatis:

```text
BDG-2026-FDY-001
BDG-2026-FDY-002
BDG-2026-FDY-003
...
BDG-2026-FDY-010
```

Metadata yang sama bisa diterapkan secara batch:

```text
Program:
Penyaluran Fidyah Tahap 3

Tanggal:
15 Agustus 2026

Lokasi:
Tanah Merah

Organisasi:
BAZNAS Kabupaten Boven Digoel
```

Kemudian semuanya masuk katalog.

Website tinggal:

```tsx
<Media id="BDG-2026-FDY-001" />
```

**Tidak pernah lagi copy-paste URL Blogger.**

---

## Dan satu keputusan desain yang saya rekomendasikan sejak awal

Kita jangan namakan project ini:

> `blogger-image-uploader`

Karena itu mengunci kita ke Google.

Namakan:

> **Media Vault**

Blogger hanya:

```text
Storage Provider #1
```

Nanti bisa:

```text
Media Vault
│
├── Blogger
├── Internet Archive
├── R2
├── S3
└── Local Archive
```

Dan database menyimpan:

```text
media_id
provider
url
hash
metadata
```

Jadi kalau 10 tahun lagi Google mengubah Blogger:

**Media Vault tidak mati.**

Kita tinggal menambahkan provider baru.

---

### Langkah pertama sekarang

Saya sarankan **jangan bikin Next.js lengkap dulu**.

Kita bikin **Blogger API Lab** yang super kecil untuk membuktikan satu hal:

> **"Bisakah kita mengirim sebuah file gambar secara programatik melalui API Google dan memperoleh URL `blogger.googleusercontent.com` yang dapat dipakai publik?"**

Dokumentasi resmi memang menunjukkan Blogger API memakai OAuth dan `posts.insert`, dan request-nya memiliki dukungan upload protocol/multipart, tetapi dokumentasi yang saya temukan **belum cukup untuk menyimpulkan bahwa itu adalah image-upload API mandiri**. ([Google for Developers][1])

**Kalau kamu mau langsung mulai di mesinmu, saya bisa buatkan struktur + kode "Blogger API Lab" untuk Next.js/Node.js, langkah demi langkah sampai kita berhasil melakukan percobaan upload pertama.**

[1]: https://developers.google.com/blogger/docs/3.0/using?utm_source=chatgpt.com "Blogger API: Using the API  |  Google for Developers"
[2]: https://developers.google.com/blogger/docs/3.0/reference/posts?hl=id&utm_source=chatgpt.com "Postingan  |  Blogger  |  Google for Developers"
[3]: https://developers.google.com/identity/protocols/oauth2/scopes?utm_source=chatgpt.com "OAuth 2.0 Scopes for Google APIs  |  Google for Developers"
[4]: https://developers.google.com/blogger/docs/3.0/getting_started?authuser=09&utm_source=chatgpt.com "Blogger API: Getting Started  |  Google for Developers"
