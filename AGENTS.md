<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:media-vault-agent-rules -->
# Media Vault — Aturan Wajib untuk AI Agent

## 1. Upload Blogger HANYA via Resumable (Teruji)
- Endpoint teruji: `POST https://docs.google.com/upload/blogger/photos/resumable?authuser=0&opi=98421741` dengan header `x-goog-upload-*` + `lib/blogger.ts` scope `blogger`. Lihat `app/api/vault/upload/route.ts` & `app/api/lab/blogger-resumable/route.ts`.
- **JANGAN** pakai `Blogger API v3 posts.insert` dengan `data:` URI — tidak di-rehost. `fetchImages=true` & `uploadType=multipart` sudah terbukti 403/404 di Phase 0 (lab). Jangan ulangi eksperimen gagal tersebut.
- **JANGAN** ganti provider tanpa diskusi — Blogger adalah Provider #1 (arsitektur `brainstorm.md:318`).

## 2. Supabase 2026 & Katalog Only
- Gunakan format `sb_publishable_` / `sb_secret_` via `lib/supabase/env.ts`. Foto TIDAK disimpan di Supabase Storage — hanya katalog `public.media`. Lihat `supabase/media.sql`.
- 4-tier client: `lib/supabase/public.ts` (stateless), `server.ts` (cookies), `client.ts` (browser), `admin.ts` (server-only + secret).
- Jangan bypass RLS di client — write via `admin`.

## 3. Hemat Bandwidth — Varian Blogger
- Simpan `s0` di DB. Preview grid pakai `lib/image.ts:bloggerVariant(url,'card')` = `w320-h240` (~35KB), bukan `s1600`. Detail pakai `w640`. Lihat `docs/blog_image_format.html`. Jangan pakai `s0`/`s1600` untuk grid.

## 4. OAuth Konsisten
- `lib/blogger.ts:getOAuthConfig()` dynamic `req.nextUrl.origin`. Authorized redirect URIs & JavaScript origins di Google Console harus berisi `http://localhost:3000` + `https://boven-image.vercel.app`. Jangan hardcode localhost.

## 5. Anti-Ulang Percakapan & Git Remotes
- **Repo Utama:** `https://github.com/ismailbaznas/boven-image.git` (`ismail`) — Akun utama yang terhubung langsung dengan Supabase dan deployment Vercel (`boven-image.vercel.app`).
- **Repo Backup:** `https://github.com/zokishmael/boven-image.git` (`origin`).
- **Repo Manifest (Disaster Recovery):** `https://github.com/ismailbaznas/boven-image-manifest.git`.
- Setiap push wajib dikirim ke kedua remote (`origin` dan `ismail`).
- Jangan tanyakan lagi blogId (3348673630650024103), Supabase URL (ruxmomhgycsbhxjpkenv), atau kredensial yang sudah ada di `.env.local` (gitignore). Baca env & `isSupabaseConfigured()`.
- Jangan minta ulang Phase 0 — rangkuman ada di README & `brainstorm.md`.

## 6. Verifikasi Wajib
- Setelah ubah upload/image/supabase, jalankan `npm run build` dan cek `http://localhost:3000` + `/lab` + `/api/cron/keep-alive` sebelum commit.
<!-- END:media-vault-agent-rules -->
