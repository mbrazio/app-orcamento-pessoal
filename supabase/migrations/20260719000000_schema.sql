-- Habilitar a extensão UUID se não existir
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  currency text default 'BRL' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Categories Table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text not null,
  color text not null,
  budget_limit numeric(12, 2) default null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  amount numeric(12, 2) not null,
  type text check (type in ('income', 'expense')) not null,
  category_id uuid references public.categories on delete set null,
  date date not null,
  is_recurring boolean default false,
  recurrence_interval text check (recurrence_interval in ('daily', 'weekly', 'monthly', 'yearly')) default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Goals Table
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) default 0.00 not null,
  deadline date,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Goal Contributions Table
create table public.goal_contributions (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.goals on delete cascade not null,
  amount numeric(12, 2) not null,
  date date not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS) em todas as tabelas
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

-- Criar Políticas RLS
-- 1. Profiles
create policy "Usuários podem ver seu próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Usuários podem atualizar seu próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- 2. Categories
create policy "Usuários gerenciam suas próprias categorias" on public.categories
  for all using (auth.uid() = user_id);

-- 3. Transactions
create policy "Usuários gerenciam suas próprias transações" on public.transactions
  for all using (auth.uid() = user_id);

-- 4. Goals
create policy "Usuários gerenciam suas próprias metas" on public.goals
  for all using (auth.uid() = user_id);

-- 5. Goal Contributions
create policy "Usuários gerenciam suas próprias contribuições de metas" on public.goal_contributions
  for all using (
    exists (
      select 1 from public.goals 
      where goals.id = goal_contributions.goal_id 
      and goals.user_id = auth.uid()
    )
  );

-- Trigger para criar perfil e categorias padrão automaticamente no SignUp
create or replace function public.handle_new_user()
returns trigger as $$
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
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
