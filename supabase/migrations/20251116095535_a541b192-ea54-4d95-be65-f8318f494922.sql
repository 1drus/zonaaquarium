-- Create storage bucket for category images
insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

-- Create RLS policies for category images bucket
create policy "Public can view category images"
on storage.objects for select
using (bucket_id = 'category-images');

create policy "Admins can upload category images"
on storage.objects for insert
with check (
  bucket_id = 'category-images' 
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);

create policy "Admins can update category images"
on storage.objects for update
using (
  bucket_id = 'category-images'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);

create policy "Admins can delete category images"
on storage.objects for delete
using (
  bucket_id = 'category-images'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);