# Tallo icon and arrival scene

The generated Enoden-inspired square PNG is used by the browser favicon, iOS apple-touch-icon and standalone web app manifest. iOS applies its own icon mask; no phone or device frame is drawn.

The arrival scene initializes before Firebase authentication. It appears on each fresh page open/reload even for an existing signed-in session. It plays for approximately 3.4 seconds and offers immediate skip/enter controls. Returning after at least one minute in the background or a persisted browser-history restoration also replays it. Short background switches do not interrupt bookkeeping.

Home has an Enoden replay button and the personal settings page has a replay row. The overlay leaves the account screen and any draft intact; it temporarily makes the underlying root inert, restores focus, handles Escape and releases its timers. Reduced-motion users get a short static entrance.

The standalone design preview remains labeled sample data and has no Firebase connection. No authentication, accounting data or Firestore rules are changed.

Validation: 47 frontend/auth/model/integration/arrival tests pass locally, including seven cases for automatic entry, skip/Escape, reduced motion, initially hidden tabs, background/history returns, cleanup and icon metadata. Browser QA covers phone layout, initial display, replay and dismissal. No physical iPhone home-screen installation test is claimed.
