-- NORMALISASI — organisasi + program (siapkan skala 5-10 org, fokus Blogger)
-- Jalankan SETELAH 001: supabase/media.sql

-- 1. organizations
create table if not exists public.organizations (
  id text primary key, -- slug: baznas-boven-digoel
  name text not null,  -- BAZNAS Kabupaten Boven Digoel
  slug text not null unique,
  cover_media_id text references public.media(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;
drop policy if exists "org_public_read" on public.organizations;
create policy "org_public_read" on public.organizations for select using (true);
drop policy if exists "org_anon_rw_dev" on public.organizations;
create policy "org_anon_rw_dev" on public.organizations for all using (true) with check (true);

-- 2. programs
create table if not exists public.programs (
  id text primary key, -- slug: baznas-boven-digoel__penyaluran-fidyah-tahap-3
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null, -- Penyaluran Fidyah Tahap 3
  slug text not null, -- penyaluran-fidyah-tahap-3
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.programs enable row level security;
drop policy if exists "prog_public_read" on public.programs;
create policy "prog_public_read" on public.programs for select using (true);
drop policy if exists "prog_anon_rw_dev" on public.programs;
create policy "prog_anon_rw_dev" on public.programs for all using (true) with check (true);
create index if not exists programs_org_idx on public.programs(organization_id);

-- 3. alter media: tambah FK ke org/program (nullable dulu untuk migrasi)
alter table public.media add column if not exists organization_id text references public.organizations(id) on delete set null;
alter table public.media add column if not exists program_id text references public.programs(id) on delete set null;
create index if not exists media_org_idx on public.media(organization_id);
create index if not exists media_prog_idx on public.media(program_id);
-- index untuk filter cepat + cegah duplikat id sudah PK

-- 4. helper: slugify di SQL (lower, spasi->-, hapus non-alfanum)
create or replace function public.slugify(txt text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(lower(trim(txt)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g');
$$;

-- 5. SEED — 1 org + 3 program contoh (sesuai data existing meta)
insert into public.organizations (id, name, slug) values
  ('baznas-boven-digoel', 'BAZNAS Kabupaten Boven Digoel', 'baznas-boven-digoel')
on conflict (id) do nothing;

insert into public.programs (id, organization_id, name, slug) values
  ('baznas-boven-digoel__penyaluran-fidyah-tahap-3', 'baznas-boven-digoel', 'Penyaluran Fidyah Tahap 3', 'penyaluran-fidyah-tahap-3'),
  ('baznas-boven-digoel__pembagian-zakat-fitrah', 'baznas-boven-digoel', 'Pembagian Zakat Fitrah', 'pembagian-zakat-fitrah'),
  ('baznas-boven-digoel__dokumentasi-umum', 'baznas-boven-digoel', 'Dokumentasi Umum', 'dokumentasi-umum')
on conflict (id) do nothing;

-- 6. Migrasi data lama: isi organization_id/program_id dari metadata jsonb jika ada
update public.media m set
  organization_id = coalesce(
    (select id from public.organizations where slug = public.slugify(m.metadata->>'organisasi') limit 1),
    'baznas-boven-digoel'
  )
where organization_id is null;

update public.media m set
  program_id = (
    select p.id from public.programs p
    where p.organization_id = m.organization_id
      and p.slug = public.slugify(m.metadata->>'program')
    limit 1
  )
where program_id is null and m.metadata->>'program' is not null;

-- fallback: jika program tidak ketemu, pakai dokumentasi-umum
update public.media set program_id = 'baznas-boven-digoel__dokumentasi-umum'
where program_id is null and organization_id = 'baznas-boven-digoel';
