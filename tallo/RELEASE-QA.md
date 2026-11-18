# Tallo personal bookkeeping release verification — 2026-11-19 (Asia/Taipei)

## Result
The production entry point now uses real Firebase Email authentication and a personal-first ledger. Personal entries and monthly budget settings are stored under users/{uid}; the existing group/trip accounting flow remains available from the split page. No sample entries are seeded in the production app. Preview-only files remain explicitly labeled and independent.

## User-flow verification
- Wrong password rejected; correct emulator account entered personal homepage. Logout returned to login after removing the blocking native confirmation.
- Saved personal expense 80; reload retained it. Changed budget 18000 to 20000; reload retained it.
- Saved income 500 to bank account and filtered income-only ledger; expense total stayed separate.
- Checked month navigation, cross-month dates, all eight categories, four shortcuts, account selection, empty filters, statistics and overspending during preview QA.
- Created an actual emulator group/trip with two participants; saved shared expense 100, split 50/50. Settlement showed friend owes payer 50. Personal homepage combined own share 50 with personal expense 80 = 130.
- Second emulator account initially saw zero private entries and its own default budget; incorrect invite rejected. Valid invite joined the group. Its personal total became only its own share 50; first account's private coffee entry and budget remained hidden.
- Security rules pass 37 isolated emulator tests, including anonymous/other-user denial, private schema validation, budget restrictions, invite/owner protections, closed trips and legacy compatibility.
- Frontend, authentication and model checks: 40 passing tests.

## Defects fixed
- Final reload QA caught a missing import in shared-ledger aggregation; fixed it and added two production-module integration tests for actual subscription setup, own-share totals, logout cleanup and pending-write filtering.
- Raw 12.5/-5 values can no longer silently become 125/5; personal amounts require integers.
- Fractional split counts show an invalid-input hint rather than throwing and leaving stale figures.
- Statistics include every calendar day and all categories. Preview reset restores its entire initial state.
- New group/trip snapshots ignore unconfirmed writes before subscribing to protected children; committed metadata changes trigger the subscription.
- Shared expense date regex corrected; equal splitting allocates integer cents exactly; creating a trip reports success after the write completes.
- Production daily data uses authenticated UID paths; it awaits writes before success messages and clears subscriptions/data on logout.

## Limits
- UI/browser tests used local Firebase Auth/Firestore emulators with disposable accounts, not the user's production financial data. Production deployment is verified separately below.
- Shared accounting retains the pre-existing display-name-based participant model. Keep participant names distinct. Settlement is an accounting suggestion, not an actual transfer.
- Personal entry editing/deletion and personal backup import/export are not part of this first release; shared backup tools apply to shared books.
- No physical iPhone/device test or full penetration test is claimed.

## Deployment
Publish matching Firestore rules first, merge the tested PR, await GitHub Pages deployment, then verify the public entry point. Do not deploy emulator HTML, server helpers, example credentials or emulator logs.
