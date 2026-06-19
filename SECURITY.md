# Security Policy

## Reporting

Do not open public issues for suspected vulnerabilities or exposed financial data. Report them privately to the repository owner with the affected component, reproduction steps, impact, and any relevant request IDs. Do not include credentials, ID tokens, or transaction data.

## Supported Version

Only the current production deployment from `master` receives security fixes.

## Response Priorities

- Critical: account takeover, cross-user data access, credential exposure, or unauthorized balance mutation. Contain immediately.
- High: exploitable authorization bypass, stored injection, or production dependency compromise. Fix within 72 hours.
- Medium and low: schedule according to exploitability and exposure.

## Handling Sensitive Data

Use synthetic accounts and transactions in reports and tests. Revoke exposed credentials, invalidate affected sessions, preserve audit logs, and document the containment and recovery timeline.
