-- Create the storage bucket for chat attachments
insert into storage.buckets (id, name, public) 
values ('chat_attachments', 'chat_attachments', true) 
on conflict (id) do nothing;

-- Allow public read access to all files
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'chat_attachments' );

-- Allow authenticated users to upload files
create policy "Authenticated users can upload" 
on storage.objects for insert 
with check ( bucket_id = 'chat_attachments' and auth.role() = 'authenticated' );
