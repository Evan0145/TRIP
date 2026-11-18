# Daily design preview

daily-preview.html remains a standalone labeled sample-data prototype. Its state intentionally resets on reload. It never connects to Firebase.

The authenticated production entry point is index.html with daily-app.mjs and daily-model.mjs. It stores private entries and budget settings under the authenticated Firebase UID and integrates the existing shared group/trip ledger. See RELEASE-QA.md for production verification and limitations.
