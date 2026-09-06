-- MEDIA VAULT — katalog Blogger (foto tidak disimpan di Supabase)
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/ruxmomhgycsbhxjpkenv/sql

create extension if not exists pgcrypto;

create table if not exists public.media (
  id text primary key,                 -- BDG-2026-FDY-001 etc
  filename text not null,
  title text,
  description text,
  blogger_url text not null,           -- https://lh3.googleusercontent.com/.../s0/...
  blogger_url_s1600 text,              -- variant s1600
  blogger_album_id text,
  blogger_photo_id text,
  provider text not null default 'blogger', -- blogger | r2 | s3 | local
  hash text,                           -- sha256 hex
  bytes integer,
  mime text,
  width integer,
  height integer,
  metadata jsonb default '{}'::jsonb, -- {program, tanggal, lokasi, organisasi}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media enable row level security;

-- Public read (katalog publik), write via service_role / authenticated
drop policy if exists "media_public_read" on public.media;
create policy "media_public_read" on public.media for select using (true);

drop policy if exists "media_service_write" on public.media;
create policy "media_service_write" on public.media for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Untuk dev: izinkan anon insert/select via publishable (hapus di prod jika pakai RLS ketat)
drop policy if exists "media_anon_rw_dev" on public.media;
create policy "media_anon_rw_dev" on public.media for all using (true) with check (true);

create index if not exists media_created_at_idx on public.media(created_at desc);
create index if not exists media_provider_idx on public.media(provider);

-- Trigger updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_media_updated on public.media;
create trigger trg_media_updated before update on public.media for each row execute function public.set_updated_at();
