'use strict';

/* ============================================================
 * Pure logic — no DOM, no network. Exercised by test.html.
 * ============================================================ */

// n cards -> n+1 gaps, indexed 0..n
function gapCount(cards) {
  return cards.length + 1;
}

// Cards are ordered ascending by year. A placement at gap `i` is correct iff
// both bounds hold inclusively — which implements the same-year tie rule with
// no special case (a card equal to a neighbour validates at every adjacent gap).
function isCorrectGap(cards, i, year) {
  const leftOk = i === 0 || year >= cards[i - 1].year;
  const rightOk = i === cards.length || year <= cards[i].year;
  return leftOk && rightOk;
}

// Insert keeping ascending-by-year order. Ties land after equal years (stable
// for gameplay; correctness only cares about order, not tie position).
function insertInYearOrder(cards, card) {
  const out = cards.slice();
  let i = out.length;
  while (i > 0 && out[i - 1].year > card.year) i--;
  out.splice(i, 0, card);
  return out;
}

// Spotify release_date is "YYYY", "YYYY-MM", or "YYYY-MM-DD" per
// release_date_precision. The year is always the leading 4 digits.
function parseYear(releaseDate) {
  if (!releaseDate) return null;
  const y = parseInt(String(releaseDate).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// Accept both https://open.spotify.com/playlist/<id> and spotify:playlist:<id>.
function parsePlaylistId(input) {
  const m = String(input || '').match(/playlist[:/]([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

// Remaster-heavy signal: a large share of tracks clustered on one recent year
// usually means reissue/remaster dates, not original release years.
// ponytail: fixed ratio + recent-year cutoff; tune the constants, not the shape.
function remasterCluster(years, nowYear) {
  // "recent" = the reissue-CD era onward; older single-year clusters are more
  // likely a genuine year compilation than a remaster campaign.
  const cutoff = (nowYear || 2026) - 25;
  const counts = {};
  for (const y of years) if (y != null) counts[y] = (counts[y] || 0) + 1;
  let topYear = null, topCount = 0;
  for (const y in counts) if (counts[y] > topCount) { topCount = counts[y]; topYear = +y; }
  const share = years.length ? topCount / years.length : 0;
  if (topYear != null && topYear >= cutoff && share >= 0.4) {
    return { year: topYear, share };
  }
  return null;
}

// Expose for the test harness (and only that — no effect in the browser app).
if (typeof window !== 'undefined') {
  window.HitsterLogic = {
    gapCount, isCorrectGap, insertInYearOrder, parseYear, parsePlaylistId, remasterCluster,
  };
}

/* ============================================================
 * App — only runs in the real page (guarded on #app existing).
 * ============================================================ */
if (typeof document !== 'undefined' && document.getElementById('app')) {

const AUTHZ = 'https://accounts.spotify.com/authorize';
const TOKEN = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';
const SCOPES = [
  'streaming', 'user-read-email', 'user-read-private',
  'playlist-read-private', 'playlist-read-collaborative',
  'user-modify-playback-state',
].join(' ');

// Persisted app state.
const S = load() || { clientId: '', tokens: null, yearOverrides: {}, game: null };
function load() { try { return JSON.parse(localStorage.getItem('hitster')); } catch { return null; } }
function save() { localStorage.setItem('hitster', JSON.stringify(S)); }

const $ = (id) => document.getElementById(id);
function show(name) {
  for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== 'screen-' + name;
}
function redirectUri() { return location.origin + location.pathname; }

/* ---------- PKCE ---------- */
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(str) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
}
function randomVerifier() {
  return b64url(crypto.getRandomValues(new Uint8Array(64)));
}

async function beginAuth() {
  const verifier = randomVerifier();
  localStorage.setItem('pkce_verifier', verifier);
  const challenge = b64url(await sha256(verifier));
  const p = new URLSearchParams({
    response_type: 'code', client_id: S.clientId, redirect_uri: redirectUri(),
    scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge,
  });
  location.href = AUTHZ + '?' + p;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: redirectUri(),
    client_id: S.clientId, code_verifier: localStorage.getItem('pkce_verifier') || '',
  });
  const r = await fetch(TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!r.ok) throw new Error('token exchange failed: ' + r.status);
  const j = await r.json();
  S.tokens = { access: j.access_token, refresh: j.refresh_token };
  save();
  history.replaceState({}, '', redirectUri());
}

async function refreshToken() {
  const body = new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: S.tokens.refresh, client_id: S.clientId,
  });
  const r = await fetch(TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!r.ok) throw new Error('refresh failed: ' + r.status);
  const j = await r.json();
  S.tokens.access = j.access_token;
  // Spotify rotates refresh tokens — overwrite it or you get logged out ~1h in.
  if (j.refresh_token) S.tokens.refresh = j.refresh_token;
  save();
}

// Spotify API call with lazy refresh-on-401, retried once.
async function api(path, opts = {}, retried = false) {
  const url = path.startsWith('http') ? path : API + path;
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: 'Bearer ' + S.tokens.access, ...(opts.headers || {}) },
  });
  if (r.status === 401 && !retried) {
    await refreshToken();
    return api(path, opts, true);
  }
  return r;
}

/* ---------- Web Playback SDK ---------- */
let player = null;
let deviceId = null;
let resolveReady;
const deviceReady = new Promise((res) => { resolveReady = res; });

window.onSpotifyWebPlaybackSDKReady = () => {
  if (!S.tokens) return; // not connected yet; boot() connects the player after auth
  connectPlayer();
};
let sdkStarted = false;
function connectPlayer() {
  if (sdkStarted || !window.Spotify || !S.tokens) return;
  sdkStarted = true;
  player = new Spotify.Player({
    name: 'Hitster',
    getOAuthToken: (cb) => cb(S.tokens.access),
    volume: 0.7,
  });
  player.addListener('ready', ({ device_id }) => { deviceId = device_id; resolveReady(device_id); });
  player.connect();
}

async function playUri(uri) {
  await deviceReady; // first play must wait for the device_id
  const r = await api(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [uri] }),
  });
  if (!r.ok) throw new Error('play failed: ' + r.status);
}

/* ---------- Account (premium + market) ---------- */
async function fetchMe() {
  const r = await api('/me');
  if (!r.ok) return null;
  return r.json();
}

/* ---------- Deck loading ---------- */
async function listMyPlaylists() {
  const out = [];
  let path = '/me/playlists?limit=50';
  while (path) {
    const r = await api(path);
    if (!r.ok) break;
    const j = await r.json();
    out.push(...j.items.filter(Boolean));
    path = j.next;
  }
  return out;
}

// Fetch all tracks, filter to playable songs, build cards.
async function loadDeck(playlistId) {
  const fields = 'items(track(id,uri,name,is_local,type,is_playable,artists(name),' +
    'album(name,release_date,release_date_precision,images))),next';
  // Real ISO country code (from /me) — `from_token` is legacy and no longer reliable.
  // Without a valid market, is_playable is omitted and the runtime skip is the only backstop.
  const market = S.market ? `&market=${S.market}` : '';
  let path = `/playlists/${playlistId}/tracks?limit=100${market}&fields=${encodeURIComponent(fields)}`;
  const cards = [];
  while (path) {
    const r = await api(path);
    if (!r.ok) {
      let reason = '';
      try { reason = ((await r.json()).error || {}).message || ''; } catch { /* no body */ }
      throw new Error(`${r.status}${reason ? ' — ' + reason : ''}`);
    }
    const j = await r.json();
    for (const item of j.items) {
      const t = item.track;
      if (!t || t.is_local || t.type !== 'track' || !t.uri || t.is_playable === false) continue;
      const overrideYear = S.yearOverrides[t.id];
      const year = overrideYear != null ? overrideYear : parseYear(t.album && t.album.release_date);
      if (year == null) continue;
      cards.push({
        id: t.id,
        uri: t.uri,
        title: t.name,
        artist: (t.artists || []).map((a) => a.name).join(', '),
        album: t.album ? t.album.name : '',
        art: t.album && t.album.images && t.album.images[0] ? t.album.images[0].url : '',
        year,
      });
    }
    path = j.next;
  }
  return cards;
}

/* ---------- Game ---------- */
function shuffle(a) {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function newGame(names, target, deck) {
  const shuffled = shuffle(deck);
  const players = names.map((name) => ({ name, timeline: [shuffled.pop()] })); // free starter card each
  S.game = {
    players,
    turn: 0,
    target,
    deck: shuffled,   // remaining, undrawn
    current: null,    // currently playing track (hidden until reveal)
    chosenGap: null,
    revealed: false,
    winner: null,
  };
  save();
}

function activePlayer() { return S.game.players[S.game.turn]; }

// Draw a track and play it; on a dead track drop + redraw without advancing turn.
async function playCurrentTrack() {
  const g = S.game;
  while (g.deck.length) {
    g.current = g.deck.pop();
    g.chosenGap = null;
    g.revealed = false;
    save();
    try {
      await playUri(g.current.uri);
      return true;
    } catch {
      g.current = null; // drop the dead track, loop draws the next
      save();
    }
  }
  return false; // deck exhausted
}

function evaluatePlacement() {
  const g = S.game;
  const p = activePlayer();
  const correct = isCorrectGap(p.timeline, g.chosenGap, g.current.year);
  if (correct) {
    p.timeline = insertInYearOrder(p.timeline, g.current);
    if (p.timeline.length >= g.target) g.winner = g.turn;
  }
  g.current._correct = correct; // for the reveal styling this turn only
  g.revealed = true;
  save();
  return correct;
}

function passTurn() {
  const g = S.game;
  g.current = null;
  g.chosenGap = null;
  g.revealed = false;
  g.turn = (g.turn + 1) % g.players.length;
  save();
}

/* ---------- Rendering ---------- */
function renderScoreboard() {
  const g = S.game;
  $('scoreboard').innerHTML = g.players.map((p, i) =>
    `<div class="score ${i === g.turn ? 'active' : ''}">
       <span class="score-name">${esc(p.name)}</span>
       <span class="score-count">${p.timeline.length}<span class="of">/${g.target}</span></span>
     </div>`).join('');
}

function renderTimeline() {
  const g = S.game;
  const cards = activePlayer().timeline;
  const parts = [];
  parts.push(gapButton(0));
  cards.forEach((c, i) => {
    parts.push(timelineCard(c));
    parts.push(gapButton(i + 1));
  });
  $('timeline').innerHTML = parts.join('');
  for (const btn of document.querySelectorAll('.gap')) {
    btn.addEventListener('click', () => selectGap(+btn.dataset.i));
  }
}
function gapButton(i) {
  const chosen = S.game.chosenGap === i ? ' chosen' : '';
  return `<button class="gap${chosen}" data-i="${i}" aria-label="Place here, position ${i}">＋</button>`;
}
function timelineCard(c) {
  return `<div class="tl-card" ${c.art ? `style="--art:url('${c.art}')"` : ''}>
            <span class="tl-year">${c.year}</span>
            <span class="tl-meta">${esc(c.title)}<br>${esc(c.artist)}</span>
          </div>`;
}

function selectGap(i) {
  S.game.chosenGap = i;
  save();
  renderTimeline();
  $('reveal').disabled = false;
}

function renderReveal(correct) {
  const c = S.game.current;
  const el = $('reveal-card');
  el.hidden = false;
  el.className = 'reveal-card ' + (correct ? 'correct' : 'wrong');
  el.innerHTML = `
    ${c.art ? `<img class="cover" src="${c.art}" alt="">` : ''}
    <div class="reveal-body">
      <div class="reveal-year">${c.year}</div>
      <div class="reveal-title">${esc(c.title)}</div>
      <div class="reveal-artist">${esc(c.artist)}</div>
      <div class="reveal-album">${esc(c.album)}</div>
      <div class="reveal-verdict">${correct ? 'Correct — card kept' : 'Wrong — card discarded'}</div>
      <button id="wrong-year" class="btn-ghost" type="button">Wrong year?</button>
      <button id="next-turn" class="btn-primary" type="button">Next turn</button>
    </div>`;
  $('wrong-year').addEventListener('click', () => promptOverride(c));
  $('next-turn').addEventListener('click', () => {
    el.hidden = true;
    afterReveal();
  });
}

function promptOverride(card) {
  const v = prompt(`Corrected year for "${card.title}"?`, String(card.year));
  const y = parseInt(v, 10);
  if (Number.isFinite(y)) {
    S.yearOverrides[card.id] = y; // preferred over release_date in all future games
    save();
    alert(`Saved. "${card.title}" will use ${y} from now on. (This game already scored the original placement.)`);
  }
}

/* ---------- Screen flows ---------- */
function showSetup() {
  show('setup');
  $('redirect-uri').textContent = redirectUri();
  $('client-id').value = S.clientId || '';
}

async function afterConnected() {
  show('connecting');
  connectPlayer();
  const me = await fetchMe();
  if (!me || me.product !== 'premium') { show('premium'); return; }
  S.market = me.country || null; // real ISO market for is_playable filtering
  save();
  if (S.game) { resumeGame(); return; }
  showDeckScreen();
}

async function showDeckScreen() {
  show('deck');
  $('deck-status').textContent = '';
  $('my-playlists').innerHTML = '<li class="note">loading your playlists…</li>';
  try {
    const pls = await listMyPlaylists();
    $('my-playlists').innerHTML = pls.map((p) =>
      `<li><button class="playlist-pick btn-ghost" data-id="${p.id}">${esc(p.name)} <span class="of">· ${p.tracks.total}</span></button></li>`
    ).join('') || '<li class="note">no playlists found</li>';
    for (const b of document.querySelectorAll('.playlist-pick')) {
      b.addEventListener('click', () => pickDeck(b.dataset.id));
    }
  } catch {
    $('my-playlists').innerHTML = '<li class="note">could not load playlists</li>';
  }
}

let loadedDeck = null;
async function pickDeck(playlistId) {
  $('deck-status').textContent = 'loading tracks…';
  $('remaster-warning').hidden = true;
  try {
    const deck = await loadDeck(playlistId);
    if (deck.length < 2) { $('deck-status').textContent = 'Not enough playable tracks in this playlist.'; return; }
    loadedDeck = deck;
    const cluster = remasterCluster(deck.map((c) => c.year), new Date().getFullYear());
    if (cluster) {
      const w = $('remaster-warning');
      w.hidden = false;
      w.textContent = `Heads up: ${Math.round(cluster.share * 100)}% of tracks report ${cluster.year}. ` +
        `That often means remaster/reissue dates, not original release years — consider another playlist or fix years as you go.`;
    }
    showNewGame();
  } catch (e) {
    const msg = String(e.message || e);
    const editorial = msg.startsWith('403') || msg.startsWith('404');
    $('deck-status').textContent = 'Could not load that playlist: ' + msg +
      (editorial
        ? ' — Spotify blocks third-party apps from reading its own editorial/algorithmic playlists (Discover Weekly, Top 50, "This Is…", genre mixes). Use one of YOUR OWN playlists below, or a normal user-made playlist.'
        : '');
  }
}

function showNewGame() {
  show('newgame');
  $('deck-summary').textContent = `${loadedDeck.length} playable tracks loaded.`;
  renderPlayerInputs(2);
}
function renderPlayerInputs(n) {
  const wrap = $('player-inputs');
  const existing = [...wrap.querySelectorAll('input')].map((i) => i.value);
  wrap.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Player ' + (i + 1);
    inp.value = existing[i] || '';
    wrap.appendChild(inp);
  }
}

function startGame() {
  const inputs = [...$('player-inputs').querySelectorAll('input')];
  const names = inputs.map((i, k) => i.value.trim() || 'Player ' + (k + 1));
  const target = Math.max(3, Math.min(30, parseInt($('target').value, 10) || 10));
  if (loadedDeck.length < names.length + target) {
    // Not strictly fatal, but likely to run dry — warn, don't block.
    if (!confirm('This deck may be too small for everyone to reach the target. Start anyway?')) return;
  }
  newGame(names, target, loadedDeck);
  runTurn();
}

async function resumeGame() {
  connectPlayer();
  const g = S.game;
  if (g.winner != null) { showWin(); return; }
  show('board');
  renderScoreboard();
  renderTimeline();
  if (g.current) {
    // A track was mid-turn; replay it (Spotify playback state is not persisted).
    $('turn-name').textContent = activePlayer().name + "'s turn";
    $('reveal').disabled = g.chosenGap == null;
    try { await playUri(g.current.uri); } catch { /* dead track handling happens on next draw */ }
  } else {
    runTurn();
  }
}

async function runTurn() {
  const g = S.game;
  show('board');
  $('reveal-card').hidden = true;
  $('reveal').disabled = true;
  renderScoreboard();
  renderTimeline();
  $('turn-name').textContent = activePlayer().name + "'s turn";
  const ok = await playCurrentTrack();
  if (!ok) { alert('Deck ran out of playable tracks. Game over.'); resetToDeck(); return; }
  renderTimeline(); // chosenGap reset
}

function afterReveal() {
  if (S.game.winner != null) { showWin(); return; }
  passTurn();
  runTurn();
}

function showWin() {
  show('win');
  $('winner-name').textContent = S.game.players[S.game.winner].name;
}

function resetToDeck() {
  S.game = null;
  save();
  showDeckScreen();
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Wire up + boot ---------- */
function wire() {
  $('copy-uri').addEventListener('click', () => navigator.clipboard.writeText(redirectUri()));
  $('connect').addEventListener('click', () => {
    const id = $('client-id').value.trim();
    if (!id) { $('client-id').focus(); return; }
    S.clientId = id;
    save();
    beginAuth();
  });
  $('premium-reset').addEventListener('click', () => { S.tokens = null; save(); showSetup(); });
  $('load-pasted').addEventListener('click', () => {
    const id = parsePlaylistId($('playlist-url').value);
    if (!id) { $('deck-status').textContent = 'That does not look like a playlist link or URI.'; return; }
    pickDeck(id);
  });
  $('add-player').addEventListener('click', () => {
    const n = $('player-inputs').querySelectorAll('input').length;
    if (n < 6) renderPlayerInputs(n + 1);
  });
  $('remove-player').addEventListener('click', () => {
    const n = $('player-inputs').querySelectorAll('input').length;
    if (n > 2) renderPlayerInputs(n - 1);
  });
  $('start-game').addEventListener('click', startGame);
  $('replay').addEventListener('click', () => { if (S.game && S.game.current) playUri(S.game.current.uri).catch(() => {}); });
  $('reveal').addEventListener('click', () => {
    if (S.game.chosenGap == null) return;
    const correct = evaluatePlacement();
    renderScoreboard();
    renderReveal(correct);
  });
  $('play-again').addEventListener('click', () => resetToDeck());
}

async function boot() {
  wire();
  const params = new URLSearchParams(location.search);
  if (params.get('code')) {
    show('connecting');
    try {
      await exchangeCode(params.get('code'));
      await afterConnected();
    } catch (e) {
      alert('Sign-in failed: ' + e.message);
      showSetup();
    }
    return;
  }
  if (!S.clientId || !S.tokens) { showSetup(); return; }
  await afterConnected();
}

boot();

} // end app guard
