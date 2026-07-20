# Documento de Especificações de Testes Front-End

**Projeto:** FinanceFlow - Aplicativo de Orçamento Pessoal  
**Versão:** 1.0.0  
**Stack de Tecnologias:** Next.js 16 (App Router), React 19, Supabase (@supabase/ssr), Tailwind CSS v4, Decimal.js, React Hook Form, Zod, Vitest.

---

## 🎯 1. Objetivos da Suíte de Testes

Garantir a estabilidade, segurança e integridade operacional do front-end do **FinanceFlow**, cobrindo:
1. **Integridade Matemática Financeira:** Precisão decimal sem erros de ponto flutuante em todos os cálculos monetários.
2. **Segurança e Privacidade:** Bloqueio de vazamentos de dados, tratamento amigável de exceções de autenticação e proteção contra inserções inválidas.
3. **Resiliência e UX da Interface:** Validação rigorosa de formulários, paginação, manipulação de estados e interatividade.
4. **Soft Delete & Salvaguarda de Dados:** Garantia de que exclusões de recursos acionam o arquivamento não-destrutivo (`deleted_at`).

---

## 🧱 2. Arquitetura e Ferramentas de Teste

| Camada de Teste | Ferramenta Recomendada | Escopo |
| :--- | :--- | :--- |
| **Unitário / Matemática** | **Vitest** | `lib/finance-math.ts`, utilitários, validadores Zod |
| **Componentes e Hooks** | **React Testing Library** + **Vitest** | Modais, tabelas, formulários, custom hooks (`use-finance.ts`) |
| **Fluxos End-to-End (E2E)** | **Playwright** / **Cypress** | Fluxo completo de Login, Cadastro, CRUD de Transações, Categorias e Metas |
| **Mocks de API** | **MSW (Mock Service Worker)** | Simulação de respostas do client Supabase e tratamento de respostas HTTP 401/403 |

---

## 📋 3. Matriz de Especificações de Teste por Módulo

### 3.1. Autenticação e Controle de Acesso
- **Arquivos-Chave:** `app/(auth)/login/page.tsx`, `app/(auth)/cadastro/page.tsx`, `proxy.ts`

| ID | Cenário de Teste | Entrada Esperada | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Validação de E-mail Inválido | Formato `usuario@dominio` incorreto | Exibir mensagem de erro Zod "Insira um e-mail válido" |
| **AUTH-02** | Senha Curta no Cadastro | Senha com menos de 6 caracteres | Exibir mensagem "A senha deve ter no mínimo 6 caracteres" |
| **AUTH-03** | Divergência de Confirmação de Senha | `password !== confirmPassword` | Bloquear submissão e alertar "As senhas não coincidem" |
| **AUTH-04** | Erro de Credenciais (HTTP 401/403) | E-mail ou senha incorretos | Exibir alerta amigável "E-mail ou senha incorretos" sem expor pilha de erros |
| **AUTH-05** | Redirecionamento Pós-Login | Autenticação com sucesso | Redirecionar o usuário para `/dashboard` e atualizar contexto |

---

### 3.2. Módulo de Transações e Importador CSV
- **Arquivo-Chave:** `app/(dashboard)/transactions/page.tsx`

| ID | Cenário de Teste | Entrada Esperada | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TX-01** | Validação de Valor Positivo | `amount <= 0` | Rejeitar entrada pelo Zod "O valor deve ser um número positivo maior que zero" |
| **TX-02** | Formatação de Moeda em Real | Valor numérico `1250.5` | Exibir formatado como `R$ 1.250,50` |
| **TX-03** | Soft Delete de Transação | Clique em Excluir + Confirmação | Disparar mutação com `deleted_at: NOW()` e ocultar registro da listagem |
| **TX-04** | Filtro por Categoria e Período | Seleção de categoria e intervalo de datas | Atualizar a tabela exibindo apenas transações correspondentes aos filtros |
| **TX-05** | Importador de CSV | Arquivo CSV com colunas arbitrárias | Mapear colunas (Descrição, Valor, Data) e cadastrar registros válidos |

---

### 3.3. Módulo de Categorias e Orçamento
- **Arquivo-Chave:** `app/(dashboard)/categories/page.tsx`

| ID | Cenário de Teste | Entrada Esperada | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **CAT-01** | Validação de Limite de Orçamento | `budget_limit <= 0` | Exibir erro "O limite de orçamento deve ser um valor maior que zero" |
| **CAT-02** | Proteção de Categoria Padrão | Tentativa de exclusão de categoria padrão | Bloquear ação e alertar "Categorias padrão do sistema não podem ser excluídas" |
| **CAT-03** | Seleção Dinâmica de Ícone e Cor | Escolha de novo ícone Lucide e cor HEX | Atualizar estado dinâmico via `useWatch` e refletir no card da categoria |
| **CAT-04** | Soft Delete de Categoria | Exclusão de categoria customizada | Atualizar `deleted_at` preservando o histórico de transações associadas |

---

### 3.4. Módulo de Metas Financeiras (Goals)
- **Arquivo-Chave:** `app/(dashboard)/goals/page.tsx`

| ID | Cenário de Teste | Entrada Esperada | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **GOAL-01** | Cálculo de Progresso Acumulado | Meta de R$ 10.000,00 com saldo de R$ 2.500,00 | Exibir barra de progresso em `25%` |
| **GOAL-02** | Registrar Aporte | Depósito de R$ 500,00 | Atualizar `current_amount` com precisão `Decimal.js` e recalcular porcentagem |
| **GOAL-03** | Conclusão de Meta | `current_amount >= target_amount` | Exibir badge "Concluída" com ícone de sucesso |
| **GOAL-04** | Validação de Valor Alvo | `target_amount <= 0` | Bloquear submissão "O valor alvo deve ser um número positivo maior que zero" |

---

### 3.5. Módulo Dashboard e Relatórios
- **Arquivos-Chave:** `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/reports/page.tsx`

| ID | Cenário de Teste | Entrada Esperada | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **DASH-01** | Cálculo de Saldo Mensal | Receitas (R$ 5.000) e Despesas (R$ 3.200) | Exibir Saldo Líquido `R$ 1.800,00` e Taxa de Economia `36.0%` |
| **DASH-02** | Alerta de Orçamento Estourado | Categoria com gastos > `budget_limit` | Exibir card de alerta em vermelho destacando o estouro do limite |
| **REP-01** | Seleção de Mês/Ano no Relatório | Alteração do seletor de período | Atualizar a visualização em tempo real com os dados do mês/ano |
| **REP-02** | Exportação de PDF | Clique no botão "Exportar Relatório PDF" | Gerar e realizar o download do arquivo PDF formatado via `html2canvas` + `jsPDF` |

---

## ⚡ 4. Execução dos Testes Automatizados

### Rodar Testes Unitários
```bash
npm run test
```

### Rodar Linter e Verificação de Sintaxe
```bash
npm run lint
```

### Validar Build de Produção
```bash
npm run build
```

---

## 🛡️ 5. Checklist de Qualidade e Segurança (QA)

- [x] Nenhuma credencial ou token privado versionado no código.
- [x] Cálculos de valores monetários isolados e testados com `Decimal.js`.
- [x] Zero erros de renderização ou avisos do React Compiler / React 19.
- [x] Exclusões de registros utilizam a política de **Soft Delete** (`deleted_at IS NULL`).
- [x] Rotas protegidas exigem autenticação ativa no Supabase via middleware/proxy.
