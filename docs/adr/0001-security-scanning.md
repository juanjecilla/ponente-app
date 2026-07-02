# Security Scanning: Dependabot + Socket.dev + CodeQL + ESLint

We use four complementary free-tier tools rather than a single paid solution. Dependabot handles known CVE alerts and auto-PRs for npm dependency updates. Socket.dev catches supply-chain attacks (malicious or hijacked packages) that Dependabot misses entirely — it analyses package behaviour, not just CVE databases. GitHub CodeQL runs SAST on TypeScript/React source on every PR, free for public repos. ESLint security plugins (`eslint-plugin-security`, `eslint-plugin-no-secrets`) catch obvious vulnerabilities and accidental secret commits at lint time, before CI.

GitHub native secret scanning with push protection is also enabled to block Firebase API keys and Google credentials from ever landing in the repo.

**Considered alternatives:** Snyk was evaluated but rejected because its free tier (500 scans/month, 1 project) covers less ground than the combination above and introduces a paid dependency. Socket.dev + Dependabot cover the same CVE + supply-chain surface for free.
