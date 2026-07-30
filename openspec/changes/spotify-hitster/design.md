## Context

A static, backend-less Hitster clone driven by the player's own Spotify account. Two areas dominate the design: (1) honest Spotify auth + playback with no server and no secret, and (2) the `release_date` reissue-year problem that would otherwise make the game silently wrong. The game loop itself is small; the plumbing and the data caveat are where the design effort goes. Three decisions were settled in exploration and are recorded here.

## Goals / Non-Goals

**Goals:**
- Fewest files that work: `index.html`, one JS, one CSS, a README, one browser-openable test file.
- No build step, no framework, no npm; deployable to GitHub Pages or `python -m http.server`.
- Survive a mid-game refresh (tokens + game state in localStorage).
- Never trust `release_date` blindly; make bad years correctable and warn about remaster-heavy decks.
- A design that reads from a couch and enacts the game's nature (see `visual-design` spec).

**Non-Goals:**
- No phone-as-controller companion mode, no multi-device sync, no accounts, no leaderboards, no server. (If added later: sync would need a backend or WebRTC + a signalling channel, which breaks the "single static file" property — a fundamental change, not an extension.)
- No client secret anywhere; no implicit grant (deprecated).

## Decisions

### 1. Timeline representation: cards array + gap index, inclusive-bounds predicate
Timeline is an array of cards sorted ascending by year; a placement is an integer gap index in `[0, n]`. Correct iff `(i==0 || year >= cards[i-1].year) && (i==n || year <= cards[i].year)`.

Why this over insert-then-validate: the predicate is a pure function of `(cards, i, year)` — trivially unit-testable, and the inclusive `>=`/`<=` bounds implement the same-year ambiguity rule *for free* with no special case. Insert-then-re-sort-then-check is stateful and makes the tie rule awkward to assert. The single-card-after-free-card case (2 gaps, both trivially correct) also falls out of the same predicate with no branch.

### 2. Dead track handling: `market=from_token` pre-filter + silent skip/redraw backstop
Fetch tracks with a market so `is_playable` is known, and filter unplayable tracks at load. That makes region-locked tracks rare at play time. For the residual case (passes filter, still 404s on play), catch the play error, drop the track from the deck, draw the next, retry — without advancing the turn or telling the player.

Why: pre-filtering alone can't be fully trusted (playability is market- and time-sensitive), and burning the turn on a Spotify-side failure feels like a bug to players. Silent skip is more code (error handling on the play call) but is the only option that never punishes a player for Spotify's data.

### 3. Token refresh: lazy refresh-on-401, always rotate both tokens
No proactive timer. On any API 401, POST `grant_type=refresh_token`, store the new access token AND the new refresh token (Spotify rotates refresh tokens), retry the original call once.

Why over a proactive timer: fewer moving parts, no timer to also push fresh tokens into the SDK, and it's self-correcting. The one non-obvious trap — refresh-token rotation — is called out explicitly in the spec because dropping the rotated token causes a hard logout ~1h in.

### 4. Design register: album art as hero material on a Swiss skeleton
The `visual-design` spec picks one register from the design language and commits to it: Swiss skeleton (grid, fixed spacing scale, sharp corners, hairline rules, whitespace as material), monochrome UI, and album artwork as the single material that carries colour (the Field Mag move). Year labels are the oversized dominant type for couch legibility. Rationale: the game *is* a media/party experience, so covers should supply colour and the UI should get out of the way — this directly applies the design language's "one material carries the colour" and "type over layout for identity" rules rather than inventing a bespoke look.

## Risks / Trade-offs

- **release_date is wrong for reissues** → album shown on reveal + per-track localStorage override preferred forever + load-time remaster-heavy warning. The override is the real safety net; parsing must handle year/month/day precisions.
- **PKCE refresh-token rotation dropped** → hard logout mid-game → always overwrite both tokens on refresh (spec'd).
- **Web Playback SDK device_id arrives async after `ready`** → first play could race → gate first play on the `ready` event (spec'd).
- **Non-Premium account** → SDK silently won't play → detect and state Premium requirement plainly (spec'd).
- **localStorage token storage is XSS-exposed** → acceptable for a personal, single-user static toy with no secret and a self-registered app; **ponytail:** not hardening this — no server to move tokens to, and the threat model is one person on their own machine. Upgrade path if it ever ships publicly: a token-proxy backend, which would break the no-backend property.

## Migration Plan

Greenfield; nothing to migrate. Deploy = drop the static files on GitHub Pages (or serve locally). The one-time per-player Spotify app registration is guided in-app (setup screen).

## Open Questions

- Threshold for the remaster-heavy warning (what share of the same recent year trips it)? Tune against a couple of real remaster-heavy playlists during implementation; start with a simple ratio and expose nothing to the user beyond the warning.
- Playlist load UX for large playlists (sequential paged fetches feel synchronous) — a spinner is enough; no decision needed unless it's slow in practice.
