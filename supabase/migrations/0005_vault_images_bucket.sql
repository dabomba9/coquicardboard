-- Public Storage bucket for the Jordan Vault card images (separate from the
-- 378-card `card-images` bucket). Uploads happen via the service-role key
-- (bypasses RLS); everyone can read. Objects are named {id}-front.jpg / {id}-back.jpg.
insert into storage.buckets (id, name, public)
values ('vault-images', 'vault-images', true)
on conflict (id) do nothing;

drop policy if exists "vault-images public read" on storage.objects;
create policy "vault-images public read" on storage.objects
  for select using (bucket_id = 'vault-images');
