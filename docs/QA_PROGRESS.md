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
| Browser suite | Complete | 28/28 Playwright cases pass on Chromium desktop and mobile, including ten distinct role-bound bot identities |
| Accessibility | Complete | Axe reports zero serious/critical violations on `/`, `/menu`, `/reserve`, `/queue` in both projects |
| Security and tenant isolation | Partial | Authorization, IDOR, input, rate, dependency and RLS checks pass; D1 tenancy architecture remains blocked |
| Dependency audit | Complete | `pnpm audit --prod`: no known vulnerabilities |
| Supabase schema | Partial | Three local/remote migrations match and remote DB lint has no errors; clean local reset unavailable without Docker |
| Lint/typecheck/build | Complete | ESLint 0 errors (one warning in preserved untracked presentation), TypeScript pass, Vinext production build pass |
| Production deployment smoke | Complete | Health, public redaction, email/Google provider status, protected redirects/APIs, real Google callback, and live owner access to kitchen, waiter, manager, and account pages verified |

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
8. Expanded multi-role regression: 28/28 desktop/mobile Playwright cases passed.
9. Production authentication verification: email confirmation was enabled and a
   confirmed user record observed; Google OAuth was published externally,
   completed the real callback, and opened every owner-authorized workspace.

## External blockers

1. Password-reset delivery still requires a controlled inbox test or local
   Supabase Mailpit. Docker is not installed for the latter.
2. Playwright 1.62 does not publish its FFmpeg helper for macOS 12. Screenshots
   and traces are enabled; failure video requires a newer CI/macOS runner.
