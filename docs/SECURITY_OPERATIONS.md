# Security Operations

## Trust Model

The browser is untrusted. It may read verified owner-scoped data, but all account and transaction mutations run through App Check-protected callable functions. Functions derive identity from Firebase Auth, strictly validate payloads, rate-limit callers, and update records and balances in Firestore transactions.

Primary threats are cross-user access, browser-side balance tampering, partial transfers, replayed commands, credential stuffing, malicious dependencies, leaked deployment credentials, and accidental financial-data logging.

## Production Setup

Complete these console controls before enforcing the release:

1. Use separate Firebase projects for development and production. Restrict Firebase Auth authorized domains to the production domain and approved local development domains.
2. Enable Firebase password policy, email-enumeration protection, Google sign-in, and MFA enrollment. Email/password users must verify email before data access.
3. Register reCAPTCHA Enterprise App Check for the web app, set `VITE_FIREBASE_APP_CHECK_SITE_KEY`, monitor rejected traffic, then enforce App Check for Firestore and Functions.
4. Set the Functions `ALLOWED_ORIGINS` environment variable to comma-separated production and approved development origins.
5. Enable Firestore point-in-time recovery or daily scheduled exports to a separate restricted bucket. Perform and record a restoration test every quarter.
6. Configure log exclusions/redaction for authorization headers, App Check tokens, transaction descriptions, account names, and request bodies. Alert on permission-denied spikes, App Check failures, rate-limit failures, and function errors.
7. Configure GitHub production environment approval and repository variables: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`, and `FIREBASE_PROJECT_ID`. Grant the deploy service account only the roles required for Functions and Firestore rules deployment.
8. Protect `master`: require pull requests, CI, CodeQL, dependency review, secret scan, resolved conversations, one approval, and blocked force pushes.

## CSP Rollout

`vercel.json` starts CSP in report-only mode. Review violations in production, narrow unexpected sources, then rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. Keep `X-Frame-Options: DENY` enforced throughout the rollout.

## Retention and Recovery

- Retain production application logs for 30 days unless an incident requires a legal hold.
- Delete rate-limit documents and idempotency records with Firestore TTL; configure TTL on `_security.expiresAt` and `users/*/commandRequests.createdAt` according to Firebase-supported collection-group policies.
- Retain backups for 30 days and restrict restore/export permissions to the operations owner.
- Test restore into a non-production project; never overwrite production during a drill.

## Incident Checklist

1. Disable the affected endpoint or deployment and preserve Cloud Audit Logs.
2. Revoke compromised sessions, OAuth grants, service-account access, and deployment credentials.
3. Determine affected users and documents without copying unnecessary financial data.
4. Restore consistent account and transaction state from verified records or backup.
5. Patch, test in the emulator and staging project, deploy through the protected production environment, and monitor.
6. Record root cause, timeline, user impact, and follow-up controls.

## Release Checklist

- `npm ci`, `npm test -- --runInBand`, `npm run lint`, and `npm run build` pass.
- Functions lint/build and Firestore emulator tests pass.
- `npm audit` and dependency review introduce no high-severity vulnerabilities.
- App Check, verified-email behavior, CSP reports, CORS, and security headers are verified against production.
- Backups, alerts, least-privilege IAM, and rollback instructions are current.
