# Security and privacy

FunaLearn currently targets a local computer, not an internet-facing service.

## Keep private

Do not commit `.env`, API keys, passwords, `Simulation accounts.txt`, database files, backups, learner notes or chat logs. `.env.example` contains names and empty placeholders only. `.gitignore` also excludes the original local planning documents. Scan the exact files being committed: ignore rules do not remove files that were already tracked.

Replace any credential that has been disclosed outside its intended use. Removing a credential from a file or from a later commit does not revoke it. Do not attach real keys or learner data to issues or pull requests. Report security concerns privately to the repository owner.

## Existing controls

- Server-side password hashing and session checks.
- Role and class ownership checks on protected routes.
- Loopback-only listener and origin checks on writes.
- Private learner notes and tutor histories.
- Server-only provider credentials; local AI requests do not carry cloud keys.
- Isolated automated test databases and fake provider requests.

## Before public hosting

Review first-account administrator setup, secure cookies and HTTPS, account recovery, consent and learner-data handling, backup/restore, logging, per-client rate limits and cloud AI budgets. Do not expose a simulation administrator account or its credentials. The test suite is not a penetration test or a claim of production readiness.
