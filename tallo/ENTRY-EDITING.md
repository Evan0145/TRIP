# Personal entry editing and recoverable deletion

Click a personal record on Home or Details to edit its amount, date, income/expense type, category, payment method and note. Saving updates the same ID and preserves createdAt. The containing month and totals follow the corrected date. Shared rows open their shared book and keep existing shared permissions.

Delete asks for confirmation, then marks the record deleted. Deleted entries are excluded from home, budget and statistics and remain in Details/My → Recently deleted. Restore brings the original record back without duplication. No permanent-delete action is exposed.

Each mutation uses a Firestore transaction, checks the originally opened revision/deleted state, and increments revision. Concurrent or failed updates retain the draft and show an error; they cannot silently overwrite another screen's update. Unchanged archived category/payment references are permitted on existing records and restores; new references must be active.

Rules limit reads/creates/updates to the authenticated UID, preserve ID and creation time, validate payloads and revisions, prohibit permanent deletion and prohibit changing payload during a deleted-state transition. Defaults and pre-versioned records require no migration.

Validation includes frontend/model/integration regression, owner/nonowner/anonymous rules checks, revision conflicts, immutable fields, invalid values, delete/restore totals, archived references and an emulator UI edit→delete→restore→reload flow. Production QA opens edit controls without saving changes to the user's financial records. Deploy matching Firestore rules before the frontend.
