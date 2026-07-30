## Why

There's no self-contained way to play a Hitster-style music timeline game from a personal Spotify library without a companion app, a backend, or the physical card deck. A static web app that drives playback from the player's own Spotify account fills that gap: nothing to host, nothing to deploy beyond a static file drop, and every player's own playlists become the deck. The hard part isn't the game loop — it's that the honest, no-secret Spotify auth flow and the unreliable `release_date` data both have to be handled deliberately or the game silently plays wrong.

## What Changes

- New static web app (`index.html` + one JS + one CSS file, no build step) playable by 2–6 players on one shared screen.
- Spotify **Authorization Code with PKCE** connection — the player registers their own Spotify app and pastes only a Client ID; **no client secret ever**. Guided numbered setup screen reads the redirect URI from `window.location`.
- Spotify **Web Playback SDK** playback: create an in-tab device, start tracks via `PUT /v1/me/player/play`. Non-Premium accounts detected and told plainly.
- Deck loading from the player's own playlists or a pasted playlist URL/URI, with pagination and filtering (no local files, no episodes, no unplayable URIs).
- Explicit handling of the **`release_date` reissue-year problem**: album shown on reveal, per-track year override stored in localStorage, and a load-time warning for remaster-heavy playlists.
- Core game loop: free starter card, hidden-until-reveal placement into a per-player timeline by clicking a gap, same-year ambiguity rule, first-to-N wins. Game state + tokens persisted in localStorage so a refresh doesn't kill the game.
- A **design language** applied deliberately (not decorated on) so the game reads from a couch and enacts what it is — encoded as its own spec.
- A browser-openable assert-based test file for the non-obvious logic: timeline placement correctness (incl. the same-year tie rule) and gap-index math.

## Capabilities

### New Capabilities
- `spotify-integration`: PKCE auth without a secret, guided app-registration setup, token refresh with rotation, Premium detection, and Web Playback SDK device + play control including dead-track skip.
- `deck`: playlist selection and paginated track loading, filtering, the `release_date` reissue-year mitigations (album on reveal, per-track override, remaster-heavy warning).
- `gameplay`: turn loop, timeline model and gap-index placement math, same-year ambiguity rule, free starter card, win condition, and localStorage-persisted game state.
- `visual-design`: the design language the UI must follow — Swiss skeleton, album art as the colour material, one accent, couch-legible type, accessibility.

### Modified Capabilities
<!-- none; greenfield -->

## Impact

- New files only: `index.html`, one `.js`, one `.css`, `README.md`, one browser-openable test file. No backend, no dependencies, no npm.
- External dependency at runtime: Spotify Web API + Web Playback SDK (loaded via `<script>` from Spotify's CDN — the one allowed external asset).
- Requires each player to have a Spotify **Premium** account and to register a personal Spotify app (one-time, guided).
