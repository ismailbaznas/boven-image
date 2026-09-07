# Media Vault — Boven Digoel

Arsip visual BAZNAS Kabupaten Boven Digoel. Upload foto → Blogger (resumable) → Supabase katalog → Copy URL.

**Live:** https://boven-image.vercel.app — **Lab:** `/lab`

## Stack
Next.js 16 (App Router), TypeScript, Supabase (katalog only), Blogger Photos Resumable API, Vercel Cron.

## Quick Start
```bash
npm install
cp .env.local.example .env.local # isi 6 var di bawah
npm run dev # http://localhost:3000
```

## Env (Supabase 2026)
```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
# prod tambah https://<vercel-domain>/api/auth/callback/google di Google Console
```

## Supabase Setup
Jalankan `supabase/media.sql` di Dashboard → SQL Editor. Buat tabel `public.media` + RLS. Foto **tidak** disimpan di Supabase, hanya metadata:
`id, filename, title, blogger_url (s0), blogger_url_s1600, hash, metadata {program,tanggal,lokasi,organisasi}`

## Upload Flow (Teruji)
1. Login Google (scope `blogger`) → cookie `bv_access_token`
2. `POST /api/vault/upload` → `POST https://docs.google.com/upload/blogger/photos/resumable?opi=98421741` (start) → `x-goog-upload-url` → `POST` binary (`upload, finalize`) → `lh3.googleusercontent.com/.../s0/...`
3. Insert ke `media` via `admin` client (auto-increment `BDG-2026-FDY-001`…)

**Jangan pakai:** `Blogger API v3 posts.insert` dengan `data:` URI — tidak di-rehost (terbukti Phase 0). `fetchImages` & `multipart` 403/404. Hanya resumable di atas yang berhasil.

## Image Variants (Hemat Bandwidth)
Simpan `s0` (original) di DB. Preview pakai varian dinamis `lib/image.ts`:
`s0` → `s1600` / `w640-h480` / `w320-h240` / `w200-h150` via `bloggerVariant(url, variant)`. Grid pakai `w320` (~35KB) bukan `s1600` (~400KB). Lihat `docs/blog_image_format.html`.

## Vercel Cron (Keep-Alive Free Tier)
`vercel.json` → `0 6 * * 1,3,5` → `GET /api/cron/keep-alive` (query `media limit 1`). Backup: `.github/workflows/supabase-keep-alive.yml`.

## Scripts
`npm run dev` | `npm run build` | `npm run start`

## Deploy
Import `zokishmael/boven-image` di Vercel, set 6 env vars, tambah Vercel domain ke Google OAuth → Authorized redirect URIs + JavaScript origins (`https://<domain>`, `http://localhost:3000`).
