-- RBAC: roles, role_permissions, user_roles

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  resource text not null,
  action text not null,
  primary key (role_id, resource, action)
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict
);

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy "Authenticated users can read roles"
  on public.roles for select
  to authenticated
  using (true);

create policy "Authenticated users can read role_permissions"
  on public.role_permissions for select
  to authenticated
  using (true);

create policy "Authenticated users can read own user_roles"
  on public.user_roles for select
  to authenticated
  using (true);

-- Seed: rol Administrador con todos los permisos del catálogo
insert into public.roles (name, description, is_system)
values (
  'Administrador',
  'Acceso completo al sistema',
  true
)
on conflict (name) do nothing;

do $$
declare
  admin_role_id uuid;
  admin_user_id uuid;
  perm record;
begin
  select id into admin_role_id from public.roles where name = 'Administrador' limit 1;

  if admin_role_id is null then
    return;
  end if;

  for perm in
    select * from (values
      ('payments', 'view'),
      ('payments', 'create'),
      ('payments', 'edit'),
      ('payments', 'delete'),
      ('payments', 'view_status'),
      ('payments', 'manage_proof'),
      ('payments', 'send_voucher'),
      ('clients', 'view'),
      ('clients', 'create'),
      ('clients', 'edit'),
      ('clients', 'delete'),
      ('services', 'view'),
      ('services', 'create'),
      ('services', 'edit'),
      ('services', 'delete'),
      ('payment_methods', 'view'),
      ('payment_methods', 'create'),
      ('payment_methods', 'edit'),
      ('payment_methods', 'delete'),
      ('users', 'view'),
      ('users', 'create'),
      ('users', 'edit'),
      ('users', 'delete'),
      ('roles', 'view'),
      ('roles', 'create'),
      ('roles', 'edit'),
      ('roles', 'delete')
    ) as t(resource, action)
  loop
    insert into public.role_permissions (role_id, resource, action)
    values (admin_role_id, perm.resource, perm.action)
    on conflict do nothing;
  end loop;

  select id into admin_user_id
  from auth.users
  where email = 'diegomurillocorrea@gmail.com'
  limit 1;

  if admin_user_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (admin_user_id, admin_role_id)
    on conflict (user_id) do update set role_id = excluded.role_id;
  end if;
end $$;
