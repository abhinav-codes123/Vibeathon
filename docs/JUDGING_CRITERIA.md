# Judging criteria mapping

| Criterion | Evidence |
|---|---|
| Problem relevance | One shared state eliminates unavailable-item orders, hidden ticket delays, missed floor tasks, and disconnected stock decisions. |
| Innovation | Recipe-to-portion availability, live operational digital twin, explainable preparation estimates, evidence-grounded copilot with no-key fallback. |
| Technical depth | Server-authoritative domain engine, optimistic D1 concurrency, audit log, role matrix, normalized PostgreSQL migration, tests. |
| End-to-end completeness | Guest order → inventory movement → kitchen transition → waiter action → manager metrics and AI guidance. |
| User experience | Four focused role surfaces, premium responsive design, loading/error/empty states, live feedback, mobile QA. |
| Responsible AI | AI is advisory, receives aggregate context, cannot override deterministic inventory/billing/permission logic, and degrades safely. |
| Deployability | No paid dependency required, first-run D1 seed, health endpoint, Sites configuration, environment contract. |
| Scalability | Tenant IDs, normalized Supabase schema, RLS direction, movement ledger, transaction and realtime roadmap. |
| Honesty | Demo authentication, payments, polling, catalogue size, AI credentials, and database runtime are explicitly labeled. |
