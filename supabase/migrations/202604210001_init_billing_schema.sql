-- Enable UUID generation helpers.
create extension if not exists pgcrypto;

create type invoice_status as enum ('pending', 'paid', 'overdue');

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  business_name text,
  logo_url text,
  upi_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  gstin text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  invoice_number bigint not null,
  status invoice_status not null default 'pending',
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint invoices_user_invoice_number_key unique (user_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  rate numeric(12, 2) not null default 0,
  tax_percent numeric(5, 2) not null default 0,
  amount numeric(12, 2) not null default 0
);

create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is not null then
    return new;
  end if;

  -- Serialize invoice number assignment per user to avoid duplicates.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select coalesce(max(i.invoice_number), 0) + 1
    into new.invoice_number
  from public.invoices i
  where i.user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists invoices_set_invoice_number on public.invoices;
create trigger invoices_set_invoice_number
before insert on public.invoices
for each row
execute function public.set_invoice_number();

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "users_select_own"
on public.users
for select
using (id = auth.uid());

create policy "users_insert_own"
on public.users
for insert
with check (id = auth.uid());

create policy "users_update_own"
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "users_delete_own"
on public.users
for delete
using (id = auth.uid());

create policy "clients_select_own"
on public.clients
for select
using (user_id = auth.uid());

create policy "clients_insert_own"
on public.clients
for insert
with check (user_id = auth.uid());

create policy "clients_update_own"
on public.clients
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "clients_delete_own"
on public.clients
for delete
using (user_id = auth.uid());

create policy "invoices_select_own"
on public.invoices
for select
using (user_id = auth.uid());

create policy "invoices_insert_own"
on public.invoices
for insert
with check (user_id = auth.uid());

create policy "invoices_update_own"
on public.invoices
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "invoices_delete_own"
on public.invoices
for delete
using (user_id = auth.uid());

create policy "invoice_items_select_own"
on public.invoice_items
for select
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_items_insert_own"
on public.invoice_items
for insert
with check (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_items_update_own"
on public.invoice_items
for update
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_items_delete_own"
on public.invoice_items
for delete
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.user_id = auth.uid()
  )
);
