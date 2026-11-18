# Tallo — 江之電篇

Tallo is a responsive bookkeeping website. The iPhone 17 Pro is the user's target viewing device, not a device frame to draw inside the page.

- The page uses the real viewport, with no simulated bezel, Dynamic Island, fixed 402 × 874 canvas, or JavaScript scaling.
- Content fills narrow screens and uses a readable 760px maximum width on larger screens.
- Dynamic viewport height and iOS safe-area insets keep navigation, forms and save actions within the available browser area. Text inputs use 16px fonts to avoid iOS focus zoom.
- Login retains the coastal scene, crossing signal, six-second train and cream ticket card. Personal and shared pages retain the same colors, typography and ticket details.
- Email authentication, personal UID isolation, storage, group invitations and accounting calculations are unchanged.

Validation for this layout correction:
- 40 frontend/auth/model/integration checks passed locally.
- Browser layout inspection at 320×740, 402×874, 430×932, 874×402 and 1280×800 found no horizontal overflow, no canvas transform and visible bottom navigation (allowing browser subpixel rounding).
- Inspected the login screen and personal entry form at phone size. No physical iPhone/Safari hardware test is claimed.
- Firestore rules are unchanged; existing security checks remain in CI.

The standalone daily-preview.html is explicitly labeled as sample data and remains independent of the authenticated production entry point.
