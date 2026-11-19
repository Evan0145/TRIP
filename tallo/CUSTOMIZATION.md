# Personal category and payment-method customization

Users can edit built-in names/icons/colors, create items, and archive/reactivate items under My → Categories and payment methods. The entry form also adds items inline while retaining the amount, date and note. Includes 52 preset emoji icons, a custom emoji input and 8 chart colors.

Private catalog documents live under users/{uid}/categories/{id} and users/{uid}/accounts/{id}. Stable IDs keep old entries and totals intact when renamed or archived. Archived items remain visible in history and charts but cannot be used for new entries. Defaults require no migration. Shared books keep their existing fixed categories.

Security rules enforce authenticated UID ownership, document shapes, bounded strings, hexadecimal colors, allowed IDs and active owner-local references for new entries. Existing entry edit/delete restrictions are unchanged. Archive replaces catalog deletion. The UI prevents duplicate labels and archiving the final active choice. Concurrent changes use per-item writes and last-writer-wins for that item.

Validation: 54 frontend/model/integration tests and 40 isolated Firestore emulator tests. UI exercised creation, preset icon choice, retained drafts, custom-category expenses, reload persistence, renamed/archived history and mobile widths. No production financial records are created during QA.

Deployment order: publish matching Firestore rules, then release the frontend. Existing authenticated browsers should finish any draft and reload for the new catalog subscriptions.
