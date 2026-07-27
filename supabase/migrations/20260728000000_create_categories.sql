-- Categorías de servicios + vínculo opcional en services

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_name_lower_key
  on public.categories (lower(name));

alter table public.services
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create index if not exists services_category_id_idx
  on public.services (category_id);

alter table public.categories enable row level security;

create policy "categories_select_all"
  on public.categories for select
  to authenticated
  using (true);

create policy "categories_insert_all"
  on public.categories for insert
  to authenticated
  with check (true);

create policy "categories_update_all"
  on public.categories for update
  to authenticated
  using (true)
  with check (true);

create policy "categories_delete_all"
  on public.categories for delete
  to authenticated
  using (true);

-- Seed permisos de categorías para Administrador
do $$
declare
  admin_role_id uuid;
  perm record;
begin
  select id into admin_role_id from public.roles where name = 'Administrador' limit 1;

  if admin_role_id is null then
    return;
  end if;

  for perm in
    select * from (values
      ('categories', 'view'),
      ('categories', 'create'),
      ('categories', 'edit'),
      ('categories', 'delete')
    ) as t(resource, action)
  loop
    insert into public.role_permissions (role_id, resource, action)
    values (admin_role_id, perm.resource, perm.action)
    on conflict do nothing;
  end loop;
end $$;
