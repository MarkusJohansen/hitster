## ADDED Requirements

### Requirement: Timeline model and gap indexing

A player's timeline SHALL be represented as an array of cards ordered ascending by year. For a timeline of `n` cards there SHALL be exactly `n + 1` placement gaps, indexed `0` (before the first card) through `n` (after the last card). A placement SHALL be an integer gap index in `[0, n]`.

#### Scenario: Gap count for a populated timeline
- **WHEN** a timeline holds cards `[1969, 1985, 2001]`
- **THEN** there are 4 gaps, indexed 0 through 3

#### Scenario: Single-card timeline after the free card
- **WHEN** a timeline holds one card
- **THEN** there are 2 gaps (index 0 and index 1) and either placement of a new card is accepted, because a single reference card cannot disprove any placement

### Requirement: Placement correctness with same-year ambiguity

A placement at gap index `i` into a timeline of `n` cards ordered ascending by year SHALL be counted correct if and only if both bounds hold with inclusive comparison:

- left bound: `i == 0` OR `newYear >= cards[i-1].year`
- right bound: `i == n` OR `newYear <= cards[i].year`

The inclusive bounds SHALL implement the ambiguity rule directly: a new card whose year equals one or both neighbours SHALL validate at every gap adjacent to a same-year neighbour, with no special-casing.

#### Scenario: Unique correct gap
- **WHEN** the timeline is `[1985, 1985, 2001]` and the new card is 1990
- **THEN** only gap index 2 (between 1985 and 2001) is correct, and every other gap is wrong

#### Scenario: Full same-year tie
- **WHEN** the timeline is `[1985, 1985, 2001]` and the new card is 1985
- **THEN** gap indices 0, 1, 2, and 3 are all correct

#### Scenario: Boundary placement
- **WHEN** the timeline is `[1969, 1985, 2001]` and the new card is 1960
- **THEN** only gap index 0 (before all cards) is correct

### Requirement: Turn loop and outcomes

The game SHALL play in fixed turn order across 2–6 players. Each turn the active player SHALL place the currently playing track into their own timeline before revealing it. On reveal the placement SHALL be evaluated: a correct placement adds the card to the player's timeline in year order; a wrong placement discards the card and awards nothing. The turn SHALL pass to the next player on both outcomes. A track SHALL NOT be replayed within the same game.

#### Scenario: Correct placement keeps the card
- **WHEN** the active player places the track at a correct gap and reveals
- **THEN** the card is inserted into their timeline in year order, their card count increases by one, and the turn passes to the next player

#### Scenario: Wrong placement discards
- **WHEN** the active player places the track at a wrong gap and reveals
- **THEN** no card is added, the track is discarded from the deck, and the turn passes to the next player

### Requirement: Free starter card

At game start each player SHALL receive one free card: a random track revealed face-up and placed as the sole card in their otherwise empty timeline. Starter tracks SHALL be drawn from the deck without replacement, the same as in-play draws.

#### Scenario: Each player starts with one card
- **WHEN** a 3-player game begins
- **THEN** three distinct tracks are drawn face-up, one placed in each player's timeline, and none of the three can be drawn again this game

### Requirement: Win condition

The first player to reach the target card count (default 10, configurable before the game starts) SHALL win, and the game SHALL end at that point.

#### Scenario: Reaching the target ends the game
- **WHEN** the target is 10 and a player's correct placement brings their timeline to 10 cards
- **THEN** the game ends and that player is declared the winner

### Requirement: Persisted game state and no peekable hidden state

Game state (players, timelines, current turn, drawn/remaining tracks, target count) and Spotify tokens SHALL be persisted to localStorage so that a page refresh resumes the game in progress. The year and identity of the current unrevealed track SHALL NOT be present in the DOM before reveal.

#### Scenario: Refresh resumes the game
- **WHEN** the page is refreshed mid-game
- **THEN** the same players, timelines, turn, and remaining deck are restored

#### Scenario: Year is not peekable
- **WHEN** a track is playing but not yet revealed
- **THEN** its year, title, and artist are absent from the DOM (not merely hidden with CSS)
