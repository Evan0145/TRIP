# Tallo — 江之電篇

Implements the supplied “海岸平交道白天 — 直式最終版” specification across the Email-only login, account creation, expense entry, ledger, statistics, settlement and account/trip management pages.

- The centered device canvas is 402 × 874 with proportional viewport fitting, rounded black frame, Dynamic Island and internal scrolling.
- Login uses the coastal scene, alternating crossing lights, six-second SVG train and a cream ticket card.
- Site interiors share the coastal banner, green train details, cream cards, red primary actions, green navigation and matching charts.
- The coast label and signal pole have been repositioned to avoid text overlap. A dedicated corridor keeps the passing train between the hero controls and login card.
- Account creation retains the real display-name field needed by Firebase. Real credentials are never prefilled.
- Authentication success is shown only after Firebase resolves successfully. Failed credentials do not start a successful entry transition. Existing sessions enter normally without an artificial delay.
- Reduced-motion preferences disable the animation and shorten the successful-entry delay.
- CSS is in enoden.css; no external image assets are required. Google Fonts are optional with system fallbacks.
- A temporary local preview uses clearly labeled sample data, contains no production connection, and is not committed or shipped as an authentication bypass.

Validation: 25 frontend/auth/theme tests passed locally, including real-handler mocks for rejected, pending and successful authentication. Login/register, password visibility, five interior pages and sample statistics/settlement were inspected in the browser. The earlier 27 Firestore Emulator regressions remain unchanged and run in CI.

Deployment is still pending merge of PR #1; security rules were already published. Existing clients should refresh after the matching frontend is deployed.
