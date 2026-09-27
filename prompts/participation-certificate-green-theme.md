# Feature: Participation Certificate Distinct Green Theme (Emerald Palette)

## 1. Goal
Provide a visually distinct Algerian emerald-green theme for the Participation Certificate (`شهادة مشاركة وتقدير`), distinguishing it from the gold-themed Winner Diploma (`شهادة ترتيب وتكريم`).

---

## 2. Existing Code Inspected
- `packages/core/src/documents/templates.ts` (`renderCertificatesDocumentHtml`):
  - Currently, both winner and participation certificates share the same `.outer-border`, `.main-title`, `.meta-grid`, and `.official-seal` styling with gold `#b38728`.
  - The distinction currently exists only in the badge (`.rank-badge.participation`) and title text.

---

## 3. Architecture References
- **packages/core**: `renderCertificatesDocumentHtml` is a pure HTML string generator.
- All styles are embedded within the `@page` / `<style>` block in `templates.ts`.

---

## 4. Design & Business Rules
1. **Winner Certificate (`theme-winner`)**:
   - Primary: Regal Gold (`#b38728`), inner green outline (`#0b5e28`).
   - Background: Warm ivory center-out radial gradient (`#ffffff` to `#faf6eb`).
   - Title: Golden typography (`#b38728`) with warm shadow.
   - Corners & Seal: Gold borders and typography (`#b38728`).
   - Meta box: Warm cream background (`#fdfaf2`) with gold border (`#ebd79b`).
   - Recipient underline: Gold dashed line (`#b38728`).

2. **Participation Certificate (`theme-participation`)**:
   - Primary: Prestigious Algerian Emerald Green (`#0b5e28`), inner subtle gold outline (`#b38728`).
   - Background: Crisp emerald-tinted center-out radial gradient (`#ffffff` to `#f0fdf4`).
   - Title: Deep emerald calligraphy (`#0b5e28`) with subtle gold/green shadow.
   - Corners & Seal: Emerald green accents and borders (`#0b5e28`).
   - Meta box: Mint/emerald tinted background (`#f4fbf7`) with light emerald border (`#a7f3d0`).
   - Recipient underline: Emerald green dashed line (`#0b5e28`).
   - Badge: Vibrant emerald and mint gradient (`#059669` to `#a7f3d0` to `#047857`).

---

## 5. Files Expected to Change
- `packages/core/src/documents/templates.ts`:
  - Add `.theme-winner` and `.theme-participation` CSS classes.
  - Dynamically apply the appropriate class to `.outer-border` and inner components depending on `isWinner`.

---

## 6. Risks & Mitigations
- **Risk**: Affecting print layout or breaking A4 alignment.
  - **Mitigation**: Only color, gradient, and border color properties are themed. All geometric dimensions (`297mm` × `210mm`, paddings, margins, flex structures) remain unchanged.

---

## 7. Security Considerations
- Pure CSS and HTML generation; zero new dependencies or unescaped inputs.

---

## 8. Acceptance Criteria
- [ ] Winner certificate retains its gold theme (`#b38728`).
- [ ] Participation certificate displays a distinct, high-contrast Algerian emerald green theme (`#0b5e28`).
- [ ] Both certificates align with pixel-perfect A4 landscape print standards.
- [ ] TypeScript compilation (`npm run typecheck`) and tests (`node test-documents.js`) pass.

---

## 9. Validation Steps
1. Run `npm run typecheck` across workspaces.
2. Run `node test-documents.js` to verify HTML rendering and PDF generation for both Participation and Winner certificates.
