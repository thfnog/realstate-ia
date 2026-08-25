# AGENTS.md — Camada de Repositórios (`src/lib/repositories/`)

Camada de abstração de dados (Data Access Layer) que implementa o padrão Repository com suporte duplo: **Supabase** (produção) e **Mock In-Memory** (desenvolvimento/testes).

## Estrutura do Módulo

```
src/lib/repositories/
├── types.ts                     # Interfaces abstratas de todos os repositórios
├── factory.ts                   # Fábrica que seleciona Mock vs Supabase via isMockMode()
├── Mock<Entidade>Repository.ts  # Implementação in-memory para testes locais
└── Supabase<Entidade>Repository.ts # Implementação real conectada ao Supabase
```

## Repositórios Disponíveis

1. `ILeadRepository` (`MockLeadRepository` / `SupabaseLeadRepository`)
2. `IImovelRepository` (`MockImovelRepository` / `SupabaseImovelRepository`)
3. `ICorretorRepository` (`MockCorretorRepository` / `SupabaseCorretorRepository`)
4. `IEventoRepository` (`MockEventoRepository` / `SupabaseEventoRepository`)
5. `IVendaRepository` (`MockVendaRepository` / `SupabaseVendaRepository`)
6. `IContratoRepository` (`MockContratoRepository` / `SupabaseContratoRepository`)
7. `IParceiroRepository` (`MockParceiroRepository` / `SupabaseParceiroRepository`)
8. `IOportunidadeRepository` (`MockOportunidadeRepository` / `SupabaseOportunidadeRepository`)

## Regras Obrigatórias para Novas Entidades
1. Defina os tipos e a interface abstrata `I<Nome>Repository` em `types.ts`.
2. Implemente tanto a versão `Supabase` quanto a versão `Mock`.
3. Registre a nova função `get<Nome>Repository(client: SupabaseClient)` em `factory.ts`.
4. Em rotas de API ou serviços, sempre instancie usando a factory passando o cliente Supabase autenticado.
