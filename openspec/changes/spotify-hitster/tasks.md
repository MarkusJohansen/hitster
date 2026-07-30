## 1. Scaffold and placement logic (testable core first)

- [x] 1.1 Create `index.html`, one `.css`, one `.js` skeleton — no build step, loads Spotify SDK via `<script>`
- [x] 1.2 Implement the placement predicate `isCorrectGap(cards, i, year)` and `insertInYearOrder(cards, card)` as pure functions
- [x] 1.3 Implement gap-count / gap-model helpers (`n` cards → `n+1` gaps)
- [x] 1.4 Write the browser-openable assert-based test file covering: unique-correct gap, full same-year tie, boundary placements, single-card-after-free-card, and gap-index math

## 2. Spotify setup and auth (PKCE, no secret)

- [x] 2.1 Setup screen: numbered steps, redirect URI from `window.location` with copy button, Client ID input stored in localStorage
- [x] 2.2 PKCE: generate verifier/challenge, authorize redirect, code→token exchange
- [x] 2.3 Token refresh on 401 with retry-once; always store rotated refresh token
- [x] 2.4 Premium detection with a plain "Premium required" message

## 3. Playback

- [x] 3.1 Load Web Playback SDK, create device, capture `device_id` on `ready`
- [x] 3.2 Play a track URI via `PUT /v1/me/player/play` to `device_id`, gated on `ready`
- [x] 3.3 Dead-track handling: catch play failure → drop from deck → draw next → retry, without advancing turn

## 4. Deck

- [x] 4.1 Deck source: list own playlists and accept pasted playlist URL/URI (both forms)
- [x] 4.2 Paginated track fetch with `market` param; filter local files, episodes, no-URI, `is_playable=false`
- [x] 4.3 `release_date` parsing across year/month/day precision → card year
- [x] 4.4 Per-track year override stored by track id in localStorage, preferred over release_date
- [x] 4.5 Remaster-heavy warning at load (clustered recent year) suggesting another playlist

## 5. Game loop

- [x] 5.1 New-game setup: 2–6 players, configurable target (default 10)
- [x] 5.2 Free starter card per player (draw without replacement)
- [x] 5.3 Turn loop: play unheard track → place at gap → reveal (title/artist/year/album) → evaluate → pass turn
- [x] 5.4 Win condition at target count
- [x] 5.5 Persist game state + tokens to localStorage; resume on refresh; keep unrevealed year/title/artist out of the DOM

## 6. Visual design (per visual-design spec)

- [x] 6.1 Swiss skeleton: grid, fixed spacing scale, sharp corners, hairline rules, no gradients/shadows
- [x] 6.2 One meaning-bearing accent (turn/state/active control); verify strip-the-accent test
- [x] 6.3 Oversized high-contrast year labels; album art as the colour material on reveal
- [x] 6.4 Wide keyboard-usable gap targets, one clear reveal action, phone-responsive reflow
- [x] 6.5 Always-visible active turn + per-player card counts

## 7. Docs

- [x] 7.1 README: the four setup steps, Premium requirement, release_date caveat, how to run/deploy
