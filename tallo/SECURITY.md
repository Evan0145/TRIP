# Tallo security update — 2026-11-18

## Behavior and compatibility

- Email/password is enabled in the Firebase Console as observed during this session. Google was not configured; the Google button is hidden by GOOGLE_SIGN_IN_ENABLED=false. Enable the provider and authorize evan0145.github.io before changing this flag.
- New expenses live at groups/{gid}/trips/{tid}/expenses/{eid}. Each expense has id, date, amount, category, note, payer and a shares map (name -> amount).
- Existing expenses arrays remain readable and are merged with the expense collection. No migration or destructive rewrite is required. Only the owner can remove a legacy array entry. New unvalidated array appends are denied.
- Group/trip metadata remains in the existing documents. The owner is immutable. Membership expansion requires the currently active invite code and a matching non-expired invite record.
- Owners can rotate invitations; codes expire after seven days. Existing groups must use “更新邀請碼” once before accepting new members. Existing membership remains valid.
- Only the group owner may close/reopen a trip, import backups or delete expenses. Entire trip deletion and expense rewrites are denied. Members can add validated expenses while the trip is active.
- Limits: 20 distinct participants per trip/expense; amount >0 and <=10,000,000; note <=500 characters; trip/group names <=100; participant names <=80; backup <=2 MB and <=400 writes per import.
- Names are still display-name based, not immutable identity-based accounting. Duplicate display names should be avoided.
- One realtime listener per trip's expense collection is required; for very large histories pagination/listener scoping is future work.

## Deployment order

1. Publish tallo/firestore.rules to tallo-a966e's default Firestore database.
2. Deploy the matching tallo/index.html to GitHub Pages.
3. Refresh clients. Older open clients cannot append array expenses under the new rules; refresh to resume.
4. Existing group owners rotate the invite code before inviting additional people.
5. Do not roll back to permissive rules. If frontend deployment fails, keep the hardened rules and deploy the matching frontend.

## Validation

- JavaScript syntax: node --check on the extracted module.
- Frontend regression: 19/19 passed (attribute/JavaScript injection, apostrophes, invalid amounts/shares, import field filtering, unique IDs, reserved object keys).
- Firestore Emulator: 27/27 passed, including anonymous/nonmember denial, invite bypass and forgery denial, valid join/rotation, owner protections, 20-way splits, amount/schema validation, legacy arrays, closed trips and atomic owner import.
- Emulator project: demo-tallo-security. No production write probes were used.
- Tests ran with Node 24.21.0, Java 21.0.6, Firebase CLI 14.25.0 and rules-unit-testing 6.0.0. The production browser SDK remains pinned at 10.12.2.
- Scope: this is a targeted security correction, not a full penetration test. App Check, account password policy, abuse/rate controls and API restrictions require separate project configuration review.

## Run checks

From tallo/ with Node >=20 and Java 21 on PATH:

    npm install
    npm test
    npm run test:rules

firebase.json points only to local rules and the local emulator. Use an explicit --project for any production deployment.
