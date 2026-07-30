## ADDED Requirements

### Requirement: The look enacts the claim

The visual design SHALL enact what the product is — a couch/TV music party game read from across a room — rather than decorate it. Album artwork SHALL be the single dominant material that carries colour (the "one material carries the colour" rule): the UI chrome SHALL stay near-monochrome and let each revealed cover supply the chromatic interest. This is the deliberate register chosen for this project from the design language; it is not a free-for-all of styles.

#### Scenario: Album art carries the colour
- **WHEN** a track is revealed
- **THEN** the album cover is shown at generous size and is the most colourful element on screen, while surrounding chrome remains near-monochrome

#### Scenario: No competing decorative palette
- **WHEN** any screen is rendered
- **THEN** the UI itself uses at most a monochrome ground plus one accent, with no second competing hue introduced for decoration

### Requirement: Swiss skeleton

The layout SHALL be built on a Swiss/International-Typographic skeleton: content aligned to a consistent grid, flush-left where text-heavy, reading measures kept sane, spacing drawn only from a fixed scale (`4 / 8 / 16 / 24 / 32 / 48 / 64px`), sharp corners (no border-radius on chrome), hairline rules instead of filled dividers or zebra striping, and no gradients, shadows, glows, or ornament. Whitespace SHALL be treated as material — generous padding and few elements per view, one focal point at a time.

#### Scenario: Spacing comes only from the scale
- **WHEN** any spacing value is applied in CSS
- **THEN** it is one of 4, 8, 16, 24, 32, 48, or 64px (or a token derived from that scale)

#### Scenario: No decorative surfaces
- **WHEN** chrome (panels, cards, dividers) is styled
- **THEN** it uses sharp corners and hairline rules, with no gradients, drop shadows, glows, or rounded corners

### Requirement: One meaning-bearing accent

Exactly ONE accent colour SHALL be used, and only ever to carry meaning — whose turn it is, a correct/wrong reveal state, an active control — never as decoration. The design SHALL pass the strip-the-accent test: with the accent removed, hierarchy and turn/state information SHALL still read from type, grid, spacing, and layout alone.

#### Scenario: Accent only signals meaning
- **WHEN** the accent colour appears
- **THEN** it marks the active player's turn, a placement outcome, or an active control — not a purely decorative element

#### Scenario: Strip-the-accent test
- **WHEN** the accent colour is removed from the stylesheet
- **THEN** the active turn, card counts, and layout hierarchy remain legible from type, size, position, and spacing alone

### Requirement: Couch-legible typography

Typography SHALL carry identity more than layout does, using at most two typefaces (a neutral grotesque sans is the default). Hierarchy SHALL be carried by size and weight, not variety or ornament. Year labels SHALL be oversized and high-contrast — the single largest expressive type on the board — so a card's year is readable from across a room. A mathematical type scale with a big, tight-leading display size SHALL be used. Body text SHALL NOT be light grey on a light ground, and the ground SHALL NOT be pure `#000`/`#fff` for body text.

#### Scenario: Year is the dominant type
- **WHEN** a timeline or a reveal is shown
- **THEN** the year label is the largest, highest-contrast text on screen and is legible at TV/couch viewing distance

#### Scenario: Hierarchy from size and weight
- **WHEN** headings, labels, and body are rendered
- **THEN** their hierarchy is distinguished by size and weight within at most two typefaces, not by decorative styling

### Requirement: Big, keyboard-usable, responsive targets

Interactive elements SHALL be large and couch-friendly: placement gaps SHALL be wide drop targets, and there SHALL be one clear, unambiguous "reveal" action per turn. The interface SHALL be operable by keyboard, and SHALL remain usable on a phone browser for solo play (timelines may scroll or reflow, targets stay tappable).

#### Scenario: Gaps are wide targets
- **WHEN** the active player places a card
- **THEN** each gap is a large clickable/tappable target, not a thin line, and is reachable and selectable by keyboard

#### Scenario: One clear reveal action
- **WHEN** it is time to reveal
- **THEN** a single unambiguous reveal control is presented for the turn

#### Scenario: Phone solo play
- **WHEN** the game is opened in a phone browser
- **THEN** the layout reflows so timelines, gaps, and the reveal control remain usable at that width

### Requirement: Turn and score visibility

Whose turn it is and each player's current card count SHALL be visible at all times during play, using the accent (for the active turn) and type hierarchy (for counts) rather than decoration.

#### Scenario: Active turn and counts always shown
- **WHEN** the game is in play
- **THEN** the active player is marked with the accent and every player's card count is visible on screen
