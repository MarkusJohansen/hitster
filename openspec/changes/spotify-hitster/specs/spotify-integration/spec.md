## ADDED Requirements

### Requirement: Guided app registration and Client ID storage

On first load, before any Spotify connection, the app SHALL present a setup screen walking the player through registering their own Spotify app in numbered steps: (1) open the Spotify developer dashboard and create an app, (2) set the Redirect URI to exactly the current page URL, (3) enable the Web Playback SDK under "APIs used", (4) paste the Client ID. The redirect URI SHALL be read from `window.location` and displayed with a copy button. The Client ID SHALL be stored in localStorage. The app SHALL NEVER request or store a client secret.

#### Scenario: Redirect URI always matches the deployment
- **WHEN** the setup screen is shown at any URL
- **THEN** the displayed redirect URI equals the current page URL read from `window.location`, with a working copy button

#### Scenario: Client ID persists
- **WHEN** the player pastes a Client ID and proceeds
- **THEN** the Client ID is stored in localStorage and the setup screen is not shown again on the next load

### Requirement: Authorization Code with PKCE

The app SHALL authenticate using the Authorization Code flow with PKCE and no client secret. It SHALL generate a code verifier and challenge, redirect to Spotify authorize, and exchange the returned code for tokens at the token endpoint using the stored code verifier.

#### Scenario: Connect completes without a secret
- **WHEN** the player clicks "Connect Spotify" and authorizes
- **THEN** the app exchanges the code for access and refresh tokens using only the Client ID and PKCE verifier, with no client secret involved

### Requirement: Token refresh with rotation

The app SHALL refresh the access token lazily: on any Spotify API call returning 401, it SHALL POST to the token endpoint with `grant_type=refresh_token`, then retry the original call once. On every refresh response it SHALL overwrite BOTH the access token AND the refresh token when a new refresh token is returned, because Spotify rotates refresh tokens.

#### Scenario: Rotated refresh token is stored
- **WHEN** a refresh response includes a new refresh token
- **THEN** the app stores both the new access token and the new refresh token, discarding the old refresh token

#### Scenario: Retry after refresh
- **WHEN** an API call returns 401 and the subsequent refresh succeeds
- **THEN** the original call is retried once with the new access token

### Requirement: Premium detection

Because the Web Playback SDK requires Spotify Premium, the app SHALL detect a non-Premium account and state plainly that Premium is required, rather than failing silently.

#### Scenario: Non-Premium account is told plainly
- **WHEN** a connected account is not Premium
- **THEN** the app shows a clear message that Spotify Premium is required and does not proceed to gameplay

### Requirement: In-tab playback device and play control

The app SHALL load the Web Playback SDK, create a player device in the tab, and wait for its `ready` event to obtain the `device_id` before attempting the first playback. Tracks SHALL be started with `PUT /v1/me/player/play` targeting that `device_id`.

#### Scenario: First play waits for the device
- **WHEN** the game is ready to play its first track
- **THEN** the app waits until the SDK `ready` event has provided a `device_id`, and only then issues the play request to that device

### Requirement: Dead-track skip and redraw

When a track passes load-time filtering but still fails to play (e.g. region-locked, 404 from the play endpoint), the app SHALL silently drop that track from the deck, immediately draw another, and retry playback, without advancing the turn or informing the player.

#### Scenario: Region-locked track is skipped transparently
- **WHEN** a drawn track fails to play mid-turn
- **THEN** the app removes it from the deck, draws the next track, retries playback, and the same player's turn continues as if nothing happened
