-- ==============================================================================
-- MIGRAÇÃO: Soft Delete & Security Constraints (Source-Level Security & Safeguards)
-- ==============================================================================

-- 1. ADICIONAR COLUNAS DE SOFT DELETE (deleted_at)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.goal_contributions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índices para consultas com filtro deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_deleted_at ON public.goals (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goal_contributions_deleted_at ON public.goal_contributions (deleted_at) WHERE deleted_at IS NULL;

-- 2. RESTRIÇÕES DE INTEGRIDADE NO NÍVEL DO BANCO DE DADOS (Source-Level Security)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount_positive') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_target_amount_positive') THEN
        ALTER TABLE public.goals ADD CONSTRAINT chk_goals_target_amount_positive CHECK (target_amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_current_amount_nonnegative') THEN
        ALTER TABLE public.goals ADD CONSTRAINT chk_goals_current_amount_nonnegative CHECK (current_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goal_contributions_amount_positive') THEN
        ALTER TABLE public.goal_contributions ADD CONSTRAINT chk_goal_contributions_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_categories_budget_limit_positive') THEN
        ALTER TABLE public.categories ADD CONSTRAINT chk_categories_budget_limit_positive CHECK (budget_limit IS NULL OR budget_limit > 0);
    END IF;
END $$;

-- 3. ATUALIZAR POLÍTICAS RLS PARA ISOLAR REGISTROS ATIVOS (deleted_at IS NULL)

-- Categorias
DROP POLICY IF EXISTS "Usuários podem ver suas próprias categorias" ON public.categories;
CREATE POLICY "Usuários podem ver suas próprias categorias"
    ON public.categories FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias categorias" ON public.categories;
CREATE POLICY "Usuários podem atualizar suas próprias categorias"
    ON public.categories FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Transações
DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON public.transactions;
CREATE POLICY "Usuários podem ver suas próprias transações"
    ON public.transactions FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias transações" ON public.transactions;
CREATE POLICY "Usuários podem atualizar suas próprias transações"
    ON public.transactions FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Metas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias metas" ON public.goals;
CREATE POLICY "Usuários podem ver suas próprias metas"
    ON public.goals FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias metas" ON public.goals;
CREATE POLICY "Usuários podem atualizar suas próprias metas"
    ON public.goals FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Aportes / Contribuições de Metas
DROP POLICY IF EXISTS "Usuários podem ver contribuições de suas metas" ON public.goal_contributions;
CREATE POLICY "Usuários podem ver contribuições de suas metas"
    ON public.goal_contributions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = goal_contributions.goal_id
              AND g.user_id = (SELECT auth.uid())
              AND g.deleted_at IS NULL
        ) AND deleted_at IS NULL
    );
