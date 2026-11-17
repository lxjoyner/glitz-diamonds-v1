# Hostinger dependency security remediation — November 2026

## Current findings (Hostinger screenshot)
- `next@16.2.4`: multiple critical remote-code-execution advisories and a high-severity denial-of-service advisory.
- `sharp@0.34.5`: GHSA-wq5f-xc86-pv6w; patched `0.35.5`.
- `zod@4.1.12`: CVE-2023-54404; patched `4.6.6`.
- `brace-expansion@1.1.14` and `2.1.0`: CVE-2026-102278; patched `1.1.20` and `2.1.6` respectively.

**The security branch updates `package.json` to pin `next@16.4.6` and `eslint-config-next@16.4.6`. The `package-lock.json` still contains older packages and MUST be regenerated and committed before merging.** Do not deploy from a manifest-only PR. `npm ci` may reject mismatched manifest/lockfile and production installs must not be non-reproducible.

## Steps in IntelliJ (Windows)

Start from branch `security/upgrade-next-and-transitive-deps` and run in the folder containing `package.json`:

```powershell
npm install
npm audit fix
npm ls next eslint-config-next sharp zod brace-expansion
npm audit
npm audit --omit=dev
npm run build
npm run lint
git status
```

Do **not** run `npm audit fix --force` blindly. `npm audit fix` may report advisories that need manual handling; review the report rather than forcing major upgrades. If normal installation/audit fix does not lift the nested versions, we can use targeted `overrides` after reviewing actual dependency constraints.

Expected installed patched minimums:
- next >= 16.4.1 (branch targets 16.4.6);
- sharp >= 0.35.5;
- zod >= 4.6.6;
- brace-expansion 1.x >= 1.1.20 and 2.x >= 2.1.6.

Check Next.js page rendering, authentication, invoice and invoice-payment flows, Help Video uploads and playback, image optimization, and all reporting. Build may use `.env.local`; never commit local secrets.

Commit the regenerated `package-lock.json` (and any necessary package changes) to **this same branch**, push, and confirm the PR diff contains the lockfile. Hostinger should then use reproducible installs.

Suggested commands after the build and audit pass:

```powershell
git add package.json package-lock.json
git commit -m "Regenerate lockfile with patched dependency versions"
git push -u origin security/upgrade-next-and-transitive-deps
```

## Before production deployment
1. Confirm critical/high **production dependency** issues are cleared in `npm audit --omit=dev`; investigate remaining full-audit findings.
2. Confirm `npm ci` from a clean checkout succeeds, then `npm run build`.
3. Keep a rollback reference to the previous production commit, back up the production DB, and confirm environment variables remain present.
4. Merge only after lockfile and functional tests are complete. Verify Hostinger deploy logs and re-scan after deployment.
