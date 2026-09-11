-- 003: Tambah cover_media_id pada tabel programs
-- Jalankan di Supabase Dashboard → SQL Editor

alter table public.programs add column if not exists cover_media_id text references public.media(id) on delete set null;

-- Refresh schema cache policy
notify pgrst, 'reload schema';
