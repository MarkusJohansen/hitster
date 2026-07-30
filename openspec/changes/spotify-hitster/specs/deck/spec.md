## ADDED Requirements

### Requirement: Deck source selection

The player SHALL be able to build a deck either by picking from their own playlists (`GET /v1/me/playlists`) or by pasting a playlist URL or URI. A pasted playlist SHALL be accepted in both `https://open.spotify.com/playlist/<id>` URL form and `spotify:playlist:<id>` URI form.

#### Scenario: Pick from own playlists
- **WHEN** the player opens deck selection
- **THEN** their own playlists are listed for selection

#### Scenario: Paste a playlist link
- **WHEN** the player pastes either a playlist URL or a `spotify:playlist:` URI
- **THEN** the app extracts the playlist id and loads that playlist

### Requirement: Paginated track loading and filtering

The app SHALL fetch all tracks of the chosen playlist across pages until exhausted. It SHALL request tracks with a market so per-track playability is known, and SHALL filter out local files, podcast episodes, and tracks with no playable URI. A market-based `is_playable` filter SHALL be the primary means of excluding region-locked tracks, with the runtime dead-track skip as a backstop.

#### Scenario: All pages fetched
- **WHEN** a playlist has more tracks than one page returns
- **THEN** the app follows pagination until every track has been fetched

#### Scenario: Unplayable and non-song items excluded
- **WHEN** a playlist contains local files, episodes, or tracks lacking a playable URI
- **THEN** those items are excluded from the deck

### Requirement: release_date parsing across precisions

The card year SHALL be derived from `track.album.release_date`, which may be reported at year, month, or day precision as indicated by `release_date_precision`. The app SHALL parse all three forms and take the four-digit year.

#### Scenario: Year-only precision
- **WHEN** a track reports `release_date` "2015" with precision "year"
- **THEN** the parsed card year is 2015

#### Scenario: Day precision
- **WHEN** a track reports `release_date` "1969-08-15" with precision "day"
- **THEN** the parsed card year is 1969

### Requirement: Album shown on reveal

On reveal the app SHALL display the album name alongside the year (with title and artist) so players can spot a reissue or compilation whose reported year is wrong.

#### Scenario: Album visible at reveal
- **WHEN** a track is revealed
- **THEN** the album name is shown next to the year

### Requirement: Per-track year override

The reveal screen SHALL provide a "wrong year?" action letting the group set a corrected year for the track. The override SHALL be stored in localStorage keyed by track id and SHALL be preferred over `release_date` for that track in all future games on this device.

#### Scenario: Override is applied and persists
- **WHEN** the group corrects a track's year and later the same track is drawn in a future game
- **THEN** the corrected year is used as the card year instead of the `release_date`-derived year

### Requirement: Remaster-heavy playlist warning

At deck load the app SHALL warn the player if a suspiciously high share of tracks report the same recent year (a signal of a remaster- or reissue-heavy playlist) and SHALL suggest choosing a different playlist.

#### Scenario: Warn on clustered recent years
- **WHEN** a large fraction of a loaded playlist's tracks share the same recent release year
- **THEN** the app shows a warning that the years may be reissue dates and suggests picking another playlist
