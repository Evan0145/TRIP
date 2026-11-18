# Personal daily bookkeeping design preview

Open daily-preview.html through a local HTTP server. This standalone prototype prioritizes personal expenses/income, monthly budgets, categorized statistics and a separate optional split feature. New entries default to personal expenses and require no group or trip. Split totals count only the current payer's own equal share in personal statistics; remaining paid shares appear as receivables.

All example records, budgets and group edits are in memory and reset on reload. The page is visibly labeled as a design preview. It imports no Firebase modules and does not bypass or change production authentication. Invitations, payment settlement and personal account persistence remain pending. index.html remains the existing authenticated group/trip application until the redesigned interior and storage are approved and implemented. Do not merge/deploy during design review.

Validation: 33 frontend/auth/model tests pass, including 8 personal bookkeeping model cases. Browser checks cover personal entry/save and updated totals, category statistics, and the independent split page. Existing Firestore rules are unchanged.
