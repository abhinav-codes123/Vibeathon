# FlowDine QA progress

## Baseline

- Initial commit: `435dacee10985cd4296470d00f5a3e99c6cb6a12`
- Initial working tree: unrelated untracked `presentation/` and `tmp/`
  directories preserved.
- Framework: Next.js 16.2.6, React 19.2.6, Vinext/Vite 8 deployment.
- Package manager: pnpm 11 with Node 22 requirement.
- Hosted operational store: Cloudflare D1 versioned JSON state plus audit log.
- Identity and membership: hosted Supabase Auth/PostgreSQL.
- Realtime behavior: four-second polling, not WebSockets.
- Tests at baseline: one Node domain suite, 12 passing tests.
- Browser E2E infrastructure: absent at baseline.
- Local Supabase container runtime: unavailable because Docker is not installed.
- Supabase seed: configured but missing at baseline.

## Execution log

| Phase | Status | Evidence |
|---|---|---|
| Repository and Git audit | Complete | Runtime, auth, store, routes, migrations, UI, dependencies, docs, and deployment config inspected |
| QA tracking files | Complete | This file, test plan, bug report, release readiness |
| Controlled runtime | Complete | Next 16.2.11 local QA server with non-production-only role seam and reset endpoint |
| Unit/integration | Complete | 18/18 Node tests pass |
| Browser suite | Complete | 18/18 Playwright cases pass: 9 scenarios on Chromium desktop and mobile |
| Accessibility | Complete | Axe reports zero serious/critical violations on `/`, `/menu`, `/reserve`, `/queue` in both projects |
| Security and tenant isolation | Partial | Authorization, IDOR, input, rate, dependency and RLS checks pass; D1 tenancy architecture remains blocked |
| Dependency audit | Complete | `pnpm audit --prod`: no known vulnerabilities |
| Supabase schema | Partial | Three local/remote migrations match and remote DB lint has no errors; clean local reset unavailable without Docker |
| Lint/typecheck/build | Complete | ESLint 0 errors (one warning in preserved untracked presentation), TypeScript pass, Vinext production build pass |
| Production deployment smoke | Partial | Auth config, protected redirect, and anonymous API denial previously verified |

## Test iterations

1. Baseline audit reproduced payment authorization, queue IDOR, late inventory
   restoration, validation, role-transition, rate-limit, accessibility, seed,
   cart persistence, and dependency defects.
2. First browser run: 8 passed / 8 failed. Four failures were harness issues
   (expected local auth status, expected unusable stock remainder, missing
   Playwright FFmpeg); product accessibility failures remained.
3. Second full run: 14 passed / 2 failed, isolating home contrast.
4. Focused accessibility loops fixed dark/light token contrast, invalid ARIA
   tab semantics, and small-label contrast.
5. Final functional run: 18/18 passed.
6. Dependency audit found 13 advisories; patched versions were installed.
7. Post-upgrade unit/build and full browser regression: 18/18 unit and 18/18
   browser cases passed; production audit returned no known vulnerabilities.

## External blockers

1. Google Cloud requires the account owner to accept its Terms of Service before
   an OAuth project/client can be created.
2. Real email verification and password-reset delivery require access to a test
   inbox or local Supabase Mailpit. Docker is not installed for the latter.
3. Playwright 1.62 does not publish its FFmpeg helper for macOS 12. Screenshots
   and traces are enabled; failure video requires a newer CI/macOS runner.
