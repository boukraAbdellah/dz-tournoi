# Feature: Enhance Competition Certificates (Professional Arabic Design)

## 1. Goal
Enhance tournament certificates (both Podium Winner Diplomas and Participation Attestations) to look prestigious, official, and professional, directly incorporating the authentic Algerian sports federation styling, typography, borders, and layout provided in the user's template.
As instructed by the user, certificates will strictly use Arabic language and typography for now.

---

## 2. Existing Code Inspected
- `packages/core/src/documents/templates.ts` (`renderCertificatesDocumentHtml` and `renderCertificateHtml`):
  Previously used a basic border and standard sans-serif font stack. Needs full redesign to match the provided ornate Algerian federation certificate template.
- `packages/core/src/documents/types.ts` (`CertificateDocItem`):
  Contains all required data: `type`, `athleteName`, `clubName`, `wilayaName`, `categoryName`, `gender`, `rank`, `medal`, `competitionName`, `competitionDate`, `competitionLocation`, `sportName`.
- `packages/core/src/documents/i18n.ts`:
  Contains Arabic translations for certificates and labels.
- `packages/api/src/routes/documents.ts` (`/:id/documents/certificates`):
  Extracts podium winners and participants, builds `CertificateDocItem[]`, and renders HTML or generates PDF.
- `packages/web/src/components/competition/DocumentPreviewModal.tsx`:
  Document preview modal with language toggle, zoom, and print/PDF download actions.
- `packages/web/src/components/competition/DocumentsView.tsx`:
  Catalog listing and direct download triggers.
- `packages/api/src/services/pdf.ts`:
  Chromium/Edge headless `--print-to-pdf` service for offline PDF generation.

---

## 3. Architecture References
- **packages/core**: Pure HTML template generator for certificates. Must remain free of React, Express, or database dependencies.
- **packages/api**: Data assembly from SQLite and PDF rendering via Playwright / Chromium headless.
- **packages/web**: Preview modal and download controls.

---

## 4. Business Rules & Design Specifications
1. **Language & Direction**:
   - Certificates are exclusively Arabic (`lang="ar"`, `dir="rtl"`).
   - In UI modal, language switch is locked/hidden for certificates with clear indication that certificates are in Arabic.
2. **Typography**:
   - Primary calligraphy fonts: `Aref Ruqaa` (for titles and recipient name) and `Amiri` (for header, body text, and metadata).
   - Embedded Google Fonts stylesheet `<link>` (`Amiri`, `Aref Ruqaa`, `Reem Kufi`).
   - Resilient system fallback stack for offline environments: `'Aref Ruqaa', 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'DecoType Naskh', 'Arabic Typesetting', serif`.
3. **Official Algerian Header**:
   - Bismillah: `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ`
   - Official national heading: `الجمهورية الجزائرية الديمقراطية الشعبية`
   - Ministry: `وزارة الشباب والرياضة`
   - Federation/Organizer name: `الاتحادية الجزائرية لرياضات النزال والرياضات المماثلة` (or competition organizer name).
4. **Certificate Types**:
   - **Podium / Winner Diploma (`شَهَادَةُ تَرْتِيبِ وَتَمَيُّزِ`)**:
     - Rank badges with gold/silver/bronze gradients:
       - 1st: `★ المَرْتَبَةُ الأُولَى • المَيْدَالِيَةُ الذَّهَبِيَّةُ ★`
       - 2nd: `★ المَرْتَبَةُ الثَّانِيَةُ • المَيْدَالِيَةُ الفِضِّيَّةُ ★`
       - 3rd: `★ المَرْتَبَةُ الثَّالِثَةُ • المَيْدَالِيَةُ البُرُونزِيَّةُ ★`
     - Commendation paragraph honoring their triumph and sporting excellence.
   - **Participation Attestation (`شَهَادَةُ مُشَارَكَةٍ وَتَقْدِيرٍ`)**:
     - Badge: `★ مُشَارَكَةٌ شَرَفِيَّةٌ مُمَيَّزَةٌ ★`
     - Commendation paragraph honoring their active participation and fair-play.
5. **Gender Adaptation**:
   - For male athletes: `لِلْبَطَلِ الرِّيَاضِيّ:` / `المُنْتَمِي لِنَادِي:` / `تَقْدِيرًا لِمُشَارَكَتِهِ`
   - For female athletes: `لِلْبَطَلَةِ الرِّيَاضِيَّةِ:` / `المُنْتَمِيَةِ لِنَادِي:` / `تَقْدِيرًا لِمُشَارَكَتِهَا`
6. **Borders & Ornaments**:
   - Exact A4 landscape dimensions (`297mm` × `210mm`) with `margin: 0`.
   - Dual frame: outer gold border (`#b38728`) with an emerald green inner line (`#0b5e28`) and subtle radial gradient background.
   - 4 ornate corner accents (`.corner-tl`, `.corner-tr`, `.corner-bl`, `.corner-br`).
   - Official seal stamp in the footer between the two signature blocks (Referee / Technical Director & Organization President).
   - Official registry footer code.

---

## 5. Files Expected to Change
1. `packages/core/src/documents/templates.ts`:
   - Overhaul `renderCertificatesDocumentHtml` with the complete professional Arabic certificate styling, fonts, corner ornaments, header, badges, meta-grid, and signatures.
2. `packages/api/src/routes/documents.ts`:
   - Set certificates default language to `'ar'`.
3. `packages/web/src/components/competition/DocumentPreviewModal.tsx`:
   - Lock language selector to Arabic for certificates with a subtle badge "عربي فقط / Arabe uniquement".
4. `packages/web/src/components/competition/DocumentsView.tsx`:
   - Ensure download URLs for certificates pass `lang=ar`.

---

## 6. Risks & Mitigations
- **Risk**: Google Fonts cannot be downloaded when running in a completely offline environment without internet access.
  - **Mitigation**: Add system Arabic calligraphy fallback fonts (`Traditional Arabic`, `Scheherazade New`, `DecoType Naskh`, `Arabic Typesetting`) which are pre-installed on Windows and standard OS platforms.
- **Risk**: Page overflow across multiple pages when printing or generating PDF.
  - **Mitigation**: Fixed 297mm × 210mm container size with `box-sizing: border-box`, `overflow: hidden`, and `@page { size: A4 landscape; margin: 0; }`.

---

## 7. Security Considerations
- All dynamic inputs (athlete names, club names, wilayas, categories, competition names) are sanitized with `escapeHtml` to prevent XSS.

---

## 8. Acceptance Criteria
- [ ] Certificates render in full A4 landscape with gold/green double border and corner ornaments.
- [ ] Arabic fonts (`Aref Ruqaa`, `Amiri`) load and display recipient names with calligraphic styling.
- [ ] Official Algerian header (Bismillah, Republic, Ministry, Federation) displayed properly.
- [ ] Winner certificates display the appropriate rank badge (Gold, Silver, Bronze) and text.
- [ ] Participation certificates display the participation badge and honor text.
- [ ] Male and female grammatical forms are respected based on athlete's gender.
- [ ] PDF generation produces a pixel-perfect A4 landscape vector PDF.
- [ ] Language for certificates is locked to Arabic across preview and download.

---

## 9. Validation Steps
1. Run `node test-documents.js` to ensure API and PDF generation continue to function without errors.
2. Run `npm run typecheck` to verify strict TypeScript compliance.
3. Test HTML preview in browser and inspect visual appearance.

---

## 10. Manual Testing Steps
1. Navigate to a completed competition in the web application.
2. Go to the Documents tab and filter by "Diplômes".
3. Open Preview for "Attestations de participation" and toggle between Participation and Winner.
4. Verify the Arabic calligraphy, ornate borders, Algerian header, badges, and layout.
5. Click "Télécharger PDF" and open the generated PDF in an external viewer to confirm pristine A4 landscape alignment.
