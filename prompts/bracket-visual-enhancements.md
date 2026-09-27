# Feature: Bracket Visual Enhancements (Red/Blue Corners, Wilaya Display, Vertical Centering)

## Goal
Enhance the tournament draw bracket presentation in the web application:
1. **Corner Colors (Display & Ring)**: Add clear Blue and Red corner identification to every match (Red Corner for Competitor A, Blue Corner for Competitor B) both on the bracket match cards and in the detail/result dialogs so ring officials and spectators can immediately identify fighters.
2. **Wilaya Display**: Show each competitor's wilaya next to their name, positioned at the end of the field (leaving comfortable space after the athlete's name, before the score). Abbreviate/truncate long wilaya names (e.g., "B.B.A." for Bordj Bou Arréridj, "S.B.A." for Sidi Bel Abbès, or smart truncation with full name available on tooltip), the abriviation 
3. **Vertical Centering & Bracket Tree Alignment**: Fix the bracket tree layout so that every match card in round $r$ is vertically centered precisely between its two feeding matches from round $r-1$ (e.g. Semi 1 \ / Semi 2 -> Final centered exactly in between), with clean visual connector lines/branches between rounds. Separate any bronze match so it does not distort the elimination tree alignment.

---

## Existing Code Inspected
- `AGENTS.md`: Draw engine rules, French-first / Arabic RTL, UI simplicity & dense information for organizers.
- `packages/web/src/components/BracketViewer.tsx`: Current bracket renderer with buggy `minHeight` calculation (`((matchHeight + matchGap) * 2 ** (roundCount - 1)) / 2`) and un-flexed inner match container that causes rounds 2+ to bunch in the top half of the column.
- `packages/web/src/components/competition/BracketSection.tsx`: Container component rendering `BracketViewer`.
- `packages/web/src/components/competition/MatchResultModal.tsx`: Modal for entering match scores and winners (currently showing generic 'A' and 'B').
- `packages/web/src/components/competition/types.ts`: `BracketMatch` interface (lacks wilaya fields).
- `packages/api/src/routes/draw.ts`: `GET /:id/bracket/:catId` endpoint that fetches and enriches matches with athlete & club names, but currently omits wilaya details.
- `packages/core/src/db/schema.ts`: Table definitions linking `registrations` -> `clubs` -> `wilayas`.
- `packages/core/src/seed/wilayas.ts`: Complete reference seed of 58 Algerian wilayas (codes and bilingual names).
- `packages/web/src/i18n.ts`: Bilingual translation strings.

---

## Architecture References
- **packages/api**: `routes/draw.ts` updates `GET /:id/bracket/:catId` to join/lookup the athlete's club's wilaya (`wilayaA`, `wilayaCodeA`, `wilayaArA`, `wilayaB`, `wilayaCodeB`, `wilayaArB`) and return them in the enriched match list.
- **packages/web**:
  - `types.ts`: Expand `BracketMatch` with wilaya properties.
  - `BracketViewer.tsx`:
    - Layout overhaul: Compute base tree height based on Round 1 match count; divide each round $r$ into $2^{R-r}$ equal flex slots with centered match cards, ensuring mathematical midpoint alignment ($Y_r = (Y_{r-1,1} + Y_{r-1,2})/2$).
    - Render clean SVG bracket connector branches between adjacent rounds showing the classic bracket forks (`\ /`).
    - Add Red Corner (`Coin Rouge` / `أحمر`) styling to Competitor A and Blue Corner (`Coin Bleu` / `أزرق`) styling to Competitor B (vibrant corner indicator dot, colored border accents, corner tag).
    - Insert a flex spacer pushing the wilaya badge to the end of the row before the score; format long wilaya names with smart abbreviations or truncation, with full name in tooltip.
    - Display bronze (3rd place) match in a dedicated clean card so it does not distort the elimination tree.
    - Update `MatchDetail` panel to show Red and Blue corner badges.
  - `MatchResultModal.tsx`: Display Red and Blue corner badges and wilaya badges for ring scorekeepers.
  - `i18n.ts`: Add translations for red corner, blue corner, and abbreviations.

---

## Business Rules
1. **Combat Sports Invariant**: Competitor A is Red Corner (Coin Rouge / Aka / Hong), Competitor B is Blue Corner (Coin Bleu / Ao / Chong).
2. **Bracket Tree Geometry**: Round $r$ match $k$ feeds from Round $r-1$ matches $2k$ and $2k+1$. The visual center of match $k$ must be at the exact midpoint between the centers of match $2k$ and $2k+1$.
3. **Data Integrity**: Wilayas displayed are derived from the athlete's club at registration (`registrations.clubIdAtRegistration -> clubs.wilayaId -> wilayas`).
4. **Bilingual Support**: All corner names and wilaya names must be displayed correctly in French and Arabic (RTL).
5. **No Regressions**: Swap mode, result entry, audit badges, and champion card must remain fully functional.

---

## Files Expected to Change

### 1. `packages/api`
- **[MODIFY]** `packages/api/src/routes/draw.ts`: Enrich bracket matches with wilaya name, code, and Arabic name for competitor A and competitor B.

### 2. `packages/web`
- **[MODIFY]** `packages/web/src/components/competition/types.ts`: Add `wilayaA`, `wilayaCodeA`, `wilayaArA`, `wilayaB`, `wilayaCodeB`, `wilayaArB` to `BracketMatch`.
- **[MODIFY]** `packages/web/src/components/BracketViewer.tsx`:
  - Implement mathematical slot division for exact vertical centering between rounds.
  - Implement SVG connector lines between rounds.
  - Add Red and Blue corner badges/styling to match cards.
  - Add right-aligned, shortened wilaya badge to each competitor slot with tooltip.
  - Separate bronze match into dedicated section.
  - Update `MatchDetail` panel with corner colors and wilayas.
- **[MODIFY]** `packages/web/src/components/competition/MatchResultModal.tsx`:
  - Show Red and Blue corner identifiers and wilayas.
- **[MODIFY]** `packages/web/src/i18n.ts`:
  - Add corner labels and translations.

---

## Risks
- **Variable Card Heights**: If one card has an audit badge or bye notice and another does not, centering within equal slot heights ensures that card centers still align consistently with tree branches.
- **RTL Mirroring**: SVG connectors and flex layouts must adapt cleanly in RTL mode. Using CSS `rtl:scale-x-[-1]` ensures vector branches flow naturally from right to left in Arabic mode.
- **Small Screens**: Cards must remain readable without breaking. Truncation on names and fixed width on wilaya chips prevent horizontal overflow.

---

## Security Considerations
- All input strings remain type-safe and rendered via React JSX (no raw HTML injection).
- No new write endpoints or untrusted database inputs introduced.

---

## Acceptance Criteria
- [ ] Each match card clearly indicates Red corner (Competitor A) and Blue corner (Competitor B) with recognizable visual cues.
- [ ] Competitor wilaya is displayed at the end of the field (spaced away from the name, before score), with long wilaya names abbreviated/shortened and full name shown on hover.
- [ ] Cards in Round 2 (e.g. Demi-finale) and Round 3 (Finale) are vertically centered precisely halfway between their previous feeder matches.
- [ ] Elegant bracket connector lines connect feeding matches to their next-round match.
- [ ] Bronze (3rd place) match is presented cleanly without breaking the main tournament tree.
- [ ] Red/Blue corners and wilayas are clearly visible in the result entry modal and match detail panel.
- [ ] Full support for both French and Arabic RTL layout.

---

## Validation Steps
1. Run `npm run typecheck` across all packages.
2. Run `npm run lint` across all packages.
3. Validate API response structure for `/api/competitions/:id/bracket/:catId`.
4. Inspect UI rendering in browser with dev server on port 5173.

---

## Manual Testing Steps
1. Open a competition with generated draws (e.g., 4 or 8 athletes in a category).
2. Inspect Round 1 (Quart de finale), Round 2 (Demi-finale), and Round 3 (Finale).
3. Check that Semi 1 is centered between Quart 1 and Quart 2, Semi 2 is centered between Quart 3 and Quart 4, and Finale is centered between Semi 1 and Semi 2.
4. Verify Red and Blue corner indicators on each fighter.
5. Verify Wilaya chip placement at the end of the field, with abbreviations (e.g., "B.B.A", "S.B.A", etc.) and tooltips.
6. Click a match to open the detail panel and result entry modal; verify corner colors and wilayas are shown.
7. Switch language to Arabic (`ar`) and verify that RTL bracket alignment, text, and connector forks display correctly.
