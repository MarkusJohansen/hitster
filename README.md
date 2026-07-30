# Hitster (Spotify timeline game)

A self-contained, backend-less music timeline game — Hitster-style — driven by
your own Spotify. Play a track, guess where it fits on your timeline by release
year, reveal, keep it if you were right. First to N cards wins. No server, no
build step, no client secret: just three static files.

## Requirements

- **Spotify Premium** for every device that hosts a game. The Web Playback SDK
  only streams for Premium accounts.
- A modern browser.
- A one-time, guided **personal Spotify app** registration (the app walks you
  through it — you paste only a Client ID, never a secret).

## Setup (the four steps, also shown in-app)

1. Open the [Spotify developer dashboard](https://developer.spotify.com/dashboard)
   and **Create app**.
2. Set the **Redirect URI** to exactly the URL you're serving this page from
   (the setup screen shows it with a copy button — copy it verbatim).
3. Under **"Which API/SDKs are you planning to use?"**, tick **both** **Web API**
   and **Web Playback SDK**. (Web API is required for loading playlists — missing
   it gives `403 Forbidden` on every deck call.)
4. Copy the app's **Client ID** and paste it into the setup screen.

Then click **Connect Spotify**, authorize, pick a playlist as your deck, add
players, and start. Auth is **Authorization Code with PKCE** — no secret is ever
requested or stored.

## Running / deploying

It's static. Any of these work:

```bash
# Local
python -m http.server 8000
# then open http://127.0.0.1:8000  (NOT localhost — see below)
```

Or drop `index.html`, `app.js`, `style.css` onto **GitHub Pages** (or any static
host) and use that page's URL as the Redirect URI. The redirect URI must match
the serving URL *exactly*, so register one per place you deploy.

**Localhost note:** Spotify requires redirect URIs to be HTTPS *or* an explicit
loopback IP, and it no longer accepts `http://localhost`. For local play, browse
to **`http://127.0.0.1:8000`** and register that exact string as the Redirect
URI — `localhost` and `127.0.0.1` are different strings to Spotify's exact-match
check even though they're the same host. The app reads the redirect URI from
`window.location`, so the copy button shows the right one as long as you opened
`127.0.0.1`.

## The `release_date` caveat (important)

Spotify's `release_date` is the **release date of the specific album/version** in
the playlist — for a remaster or reissue that's the *reissue* year, not when the
song came out. This game can't tell the difference on its own, so it mitigates:

- The **album name is shown on reveal** next to the year, so the group can spot a
  suspicious "2015 Remaster".
- A **"Wrong year?"** button on the reveal lets you set a corrected year; it's
  stored in `localStorage` by track id and preferred over `release_date` in all
  future games on that device.
- At deck load, if a large share of tracks cluster on one recent year, the app
  **warns** that the deck looks remaster-heavy and suggests another playlist.

Prefer playlists of original releases for the truest game.

## Tests

Open `test.html` in a browser (or serve it). It runs assert-based checks of the
placement predicate (including the same-year tie rule), gap-index math,
`release_date` parsing, playlist-link parsing, and the remaster warning. Green =
passing. No framework, no build.

## What it deliberately isn't

No phone-as-controller mode, no multi-device sync, no accounts, no leaderboards,
no server. Tokens live in `localStorage` — acceptable for a personal single-user
toy with no secret; don't host this as a shared public service without putting a
token proxy behind it.
