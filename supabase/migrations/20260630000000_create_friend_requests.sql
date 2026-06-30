create table public.friend_requests (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references public.profiles(id) on delete cascade not null,
    receiver_id uuid references public.profiles(id) on delete cascade not null,
    status text not null check (status in ('pending', 'accepted', 'rejected')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(sender_id, receiver_id)
);

-- Enable RLS
alter table public.friend_requests enable row level security;

-- Policies
create policy "Users can view their own friend requests"
on public.friend_requests for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert their own friend requests"
on public.friend_requests for insert
with check (auth.uid() = sender_id);

create policy "Users can update their own received requests"
on public.friend_requests for update
using (auth.uid() = receiver_id or auth.uid() = sender_id);
