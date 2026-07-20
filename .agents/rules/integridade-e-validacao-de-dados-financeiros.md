---
trigger: always_on
---

Toda lógica que envolva valores monetários deve:
- Usar `Decimal` (Python) ou `big.js` / `decimal.js` (JS/TS) em vez de `float` ou `number` nativo para evitar erros de arredondamento em cálculos financeiros.
- Validar e rejeitar entradas negativas em campos de receita, e entradas positivas em campos de despesa, salvo quando o domínio explicitamente permita.
- Nunca exibir valores financeiros sem formatação de moeda (ex: `R$ 1.250,00`), respeitando o locale `pt-BR`.
- Incluir testes unitários para qualquer função de cálculo (saldo, total de categoria, projeção mensal).