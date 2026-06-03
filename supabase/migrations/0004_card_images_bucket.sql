-- Public Storage bucket for self-hosted card images. Uploads happen via the
-- service-role key (bypasses RLS); everyone can read.
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

drop policy if exists "card-images public read" on storage.objects;
create policy "card-images public read" on storage.objects
  for select using (bucket_id = 'card-images');
