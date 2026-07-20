-- Habilitar a extensão UUID se não existir
create extension if not exists "uuid-ossp";

-- ====================================================
-- 1. TABELAS
-- ====================================================

-- Tabela de Perfis de Usuários
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  currency text default 'BRL' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Categorias Financeiras
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text not null,
  color text not null,
  budget_limit numeric(12, 2) check (budget_limit is null or budget_limit > 0) default null,
  is_default boolean default false not null,
  deleted_at timestamp with time zone default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Transações (Receitas e Despesas)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  amount numeric(12, 2) check (amount > 0) not null,
  type text check (type in ('income', 'expense')) not null,
  category_id uuid references public.categories on delete set null,
  date date not null,
  is_recurring boolean default false not null,
  recurrence_interval text check (recurrence_interval in ('daily', 'weekly', 'monthly', 'yearly')) default null,
  deleted_at timestamp with time zone default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Metas Financeiras (Economia)
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_amount numeric(12, 2) check (target_amount > 0) not null,
  current_amount numeric(12, 2) check (current_amount >= 0) default 0.00 not null,
  deadline date,
  color text not null,
  deleted_at timestamp with time zone default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Contribuições/Depósitos para Metas
create table public.goal_contributions (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.goals on delete cascade not null,
  amount numeric(12, 2) check (amount > 0) not null,
  date date not null,
  note text,
  deleted_at timestamp with time zone default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================
-- 2. ÍNDICES DE ALTA PERFORMANCE (Postgres Best Practices)
-- ====================================================
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_goal_contributions_goal_id on public.goal_contributions(goal_id);

create index if not exists idx_categories_deleted_at on public.categories (deleted_at) where deleted_at is null;
create index if not exists idx_transactions_deleted_at on public.transactions (deleted_at) where deleted_at is null;
create index if not exists idx_goals_deleted_at on public.goals (deleted_at) where deleted_at is null;
create index if not exists idx_goal_contributions_deleted_at on public.goal_contributions (deleted_at) where deleted_at is null;

-- ====================================================
-- 3. POLÍTICAS DE SEGURANÇA RLS
-- ====================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

-- Perfis
create policy "Usuários podem ver seu próprio perfil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Usuários podem atualizar seu próprio perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Categorias
create policy "Usuários podem ver suas próprias categorias" on public.categories
  for select to authenticated using ((select auth.uid()) = user_id and deleted_at is null);

create policy "Usuários podem inserir suas próprias categorias" on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Usuários podem atualizar suas próprias categorias" on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id and deleted_at is null)
  with check ((select auth.uid()) = user_id);

-- Transações
create policy "Usuários podem ver suas próprias transações" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id and deleted_at is null);

create policy "Usuários podem inserir suas próprias transações" on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Usuários podem atualizar suas próprias transações" on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id and deleted_at is null)
  with check ((select auth.uid()) = user_id);

-- Metas
create policy "Usuários podem ver suas próprias metas" on public.goals
  for select to authenticated using ((select auth.uid()) = user_id and deleted_at is null);

create policy "Usuários podem inserir suas próprias metas" on public.goals
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Usuários podem atualizar suas próprias metas" on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id and deleted_at is null)
  with check ((select auth.uid()) = user_id);

-- Contribuições para Metas
create policy "Usuários podem ver contribuições de suas metas" on public.goal_contributions
  for select to authenticated
  using (
    exists (
      select 1 from public.goals
      where goals.id = goal_contributions.goal_id
      and goals.user_id = (select auth.uid())
      and goals.deleted_at is null
    ) and deleted_at is null
  );

create policy "Usuários podem inserir contribuições em suas metas" on public.goal_contributions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.goals
      where goals.id = goal_contributions.goal_id
      and goals.user_id = (select auth.uid())
      and goals.deleted_at is null
    )
  );

create policy "Usuários podem atualizar contribuições de suas metas" on public.goal_contributions
  for update to authenticated
  using (
    exists (
      select 1 from public.goals
      where goals.id = goal_contributions.goal_id
      and goals.user_id = (select auth.uid())
      and goals.deleted_at is null
    ) and deleted_at is null
  )
  with check (
    exists (
      select 1 from public.goals
      where goals.id = goal_contributions.goal_id
      and goals.user_id = (select auth.uid())
      and goals.deleted_at is null
    )
  );

-- ====================================================
-- 4. AUTOMAÇÃO DE NOVOS USUÁRIOS (TRIGGERS)
-- ====================================================

-- Função do trigger (com mitigação de sequestro de caminho de busca)
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, avatar_url, currency)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    new.raw_user_meta_data->>'avatar_url',
    'BRL'
  );
  
  -- Inserir categorias padrão para o novo usuário
  insert into public.categories (user_id, name, icon, color, is_default) values
    (new.id, 'Alimentação', 'Utensils', '#EF4444', true),
    (new.id, 'Transporte', 'Car', '#3B82F6', true),
    (new.id, 'Moradia', 'Home', '#10B981', true),
    (new.id, 'Saúde', 'HeartPulse', '#F59E0B', true),
    (new.id, 'Lazer', 'Gamepad2', '#8B5CF6', true),
    (new.id, 'Salário', 'Briefcase', '#10B981', true);
    
  return new;
end;
$$ language plpgsql;

-- Vincular gatilho à tabela auth.users do Supabase
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
