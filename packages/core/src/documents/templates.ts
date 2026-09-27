import { getDocI18n } from './i18n.ts';
import type {
  CompetitionDocMeta,
  ParticipantDocItem,
  CategoryDocItem,
  BracketDocCategory,
  MatchSheetDocItem,
  CertificateDocItem,
  DocumentLanguage,
} from './types.ts';
import type { RankedAthlete, CategoryRanking, ClubRankingRow, WilayaRankingRow } from '../draw/rankings.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getBaseStyles(isRtl: boolean, landscape = false): string {
  return `
    <style>
      @page {
        size: A4 ${landscape ? 'landscape' : 'portrait'};
        margin: 12mm 12mm 14mm 12mm;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        font-size: 10pt;
        color: #1a1a1a;
        background: #fff;
        direction: ${isRtl ? 'rtl' : 'ltr'};
        text-align: ${isRtl ? 'right' : 'left'};
        line-height: 1.4;
      }
      .page-container {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
      }
      .header-card {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 12px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .header-title {
        font-size: 16pt;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .header-subtitle {
        font-size: 11pt;
        font-weight: 600;
        color: #475569;
      }
      .header-meta {
        display: flex;
        gap: 16px;
        margin-top: 6px;
        font-size: 9pt;
        color: #64748b;
      }
      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge-doc {
        display: inline-block;
        padding: 3px 8px;
        font-size: 8pt;
        font-weight: 700;
        text-transform: uppercase;
        border-radius: 4px;
        background: #e2e8f0;
        color: #334155;
      }
      table.doc-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
        page-break-inside: auto;
      }
      table.doc-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      table.doc-table th {
        background-color: #f1f5f9;
        color: #334155;
        font-size: 8.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 7px 8px;
        border: 1px solid #cbd5e1;
        text-align: ${isRtl ? 'right' : 'left'};
      }
      table.doc-table td {
        font-size: 9pt;
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
      }
      table.doc-table tr:nth-child(even) td {
        background-color: #f8fafc;
      }
      .text-center { text-align: center !important; }
      .text-end { text-align: ${isRtl ? 'left' : 'right'} !important; }
      .font-bold { font-weight: 700; }
      .text-muted { color: #64748b; }
      .footer-signatures {
        margin-top: 24px;
        display: flex;
        justify-content: space-between;
        gap: 20px;
        page-break-inside: avoid;
      }
      .signature-box {
        flex: 1;
        border: 1px dashed #94a3b8;
        border-radius: 6px;
        padding: 12px;
        text-align: center;
        min-height: 85px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .signature-title {
        font-size: 8.5pt;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
      }
      .print-page-break {
        page-break-after: always;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  `;
}

// ── 1. Participant List ──────────────────────────────────────────────────────

export function renderParticipantListHtml(
  comp: CompetitionDocMeta,
  participants: ParticipantDocItem[],
  lang: DocumentLanguage = 'fr',
): string {
  const t = getDocI18n(lang);
  const isRtl = lang === 'ar';

  const rows = participants.map((p, idx) => `
    <tr>
      <td class="text-center font-bold">${idx + 1}</td>
      <td class="font-bold">${escapeHtml(p.lastName)} ${escapeHtml(p.firstName)}</td>
      <td>${escapeHtml(p.clubName || '-')}</td>
      <td>${escapeHtml(p.wilayaName || '-')}</td>
      <td class="text-center">${escapeHtml(p.categoryName || '-')}</td>
      <td class="text-center">${escapeHtml(p.gender)}</td>
      <td class="text-center">${escapeHtml(p.birthDate || '-')} (${p.age} ${t.age})</td>
      <td class="text-center font-bold">${p.weightKg != null ? p.weightKg + ' kg' : '-'}</td>
      <td class="text-center"><span class="badge-doc">${p.status === 'REGISTERED' ? t.registered : t.withdrawn}</span></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(t.participantsListTitle)} - ${escapeHtml(comp.name)}</title>
      ${getBaseStyles(isRtl, false)}
    </head>
    <body>
      <div class="page-container">
        <div class="header-card">
          <div>
            <div class="header-title">${escapeHtml(t.participantsListTitle)}</div>
            <div class="header-subtitle">${escapeHtml(comp.name)} (${escapeHtml(comp.sportName)})</div>
            <div class="header-meta">
              <span class="meta-item"><strong>${t.date}:</strong> ${escapeHtml(comp.date)}</span>
              ${comp.location ? `<span class="meta-item"><strong>${t.location}:</strong> ${escapeHtml(comp.location)}</span>` : ''}
              <span class="meta-item"><strong>${t.participantsCount}:</strong> ${participants.length}</span>
            </div>
          </div>
          <div>
            <span class="badge-doc">${escapeHtml(comp.sportName)}</span>
          </div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 40px;" class="text-center">${t.number}</th>
              <th>${t.athlete}</th>
              <th>${t.club}</th>
              <th>${t.wilaya}</th>
              <th class="text-center">${t.category}</th>
              <th class="text-center" style="width: 45px;">${t.gender}</th>
              <th class="text-center">${t.birthDate}</th>
              <th class="text-center" style="width: 70px;">${t.weight}</th>
              <th class="text-center" style="width: 80px;">${t.status}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : `<tr><td colspan="9" class="text-center text-muted" style="padding: 20px;">-</td></tr>`}
          </tbody>
        </table>

        <div class="footer-signatures">
          <div class="signature-box">
            <span class="signature-title">${t.presidentOfOrganization}</span>
          </div>
          <div class="signature-box">
            <span class="signature-title">${t.technicalDirector}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── 2. Category List ─────────────────────────────────────────────────────────

export function renderCategoryListHtml(
  comp: CompetitionDocMeta,
  categories: CategoryDocItem[],
  lang: DocumentLanguage = 'fr',
): string {
  const t = getDocI18n(lang);
  const isRtl = lang === 'ar';

  const rows = categories.map((c, idx) => `
    <tr>
      <td class="text-center font-bold">${idx + 1}</td>
      <td class="font-bold">${escapeHtml(c.name)}</td>
      <td class="text-center">${c.gender === 'M' ? t.male : t.female}</td>
      <td class="text-center">${c.minAge} - ${c.maxAge ? c.maxAge + ' ' + t.age : 'Open'}</td>
      <td class="text-center">${c.minKg ? c.minKg + ' kg' : '0'} / ${c.maxKg ? c.maxKg + ' kg' : '+'}</td>
      <td class="text-center font-bold">${c.participantCount}</td>
      <td class="text-center">${c.matchesCount}</td>
      <td class="text-center"><span class="badge-doc">${t.singleElim}</span></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(t.categoriesListTitle)} - ${escapeHtml(comp.name)}</title>
      ${getBaseStyles(isRtl, false)}
    </head>
    <body>
      <div class="page-container">
        <div class="header-card">
          <div>
            <div class="header-title">${escapeHtml(t.categoriesListTitle)}</div>
            <div class="header-subtitle">${escapeHtml(comp.name)}</div>
            <div class="header-meta">
              <span class="meta-item"><strong>${t.date}:</strong> ${escapeHtml(comp.date)}</span>
              ${comp.location ? `<span class="meta-item"><strong>${t.location}:</strong> ${escapeHtml(comp.location)}</span>` : ''}
              <span class="meta-item"><strong>Total:</strong> ${categories.length} ${t.category.toLowerCase()}s</span>
            </div>
          </div>
          <div>
            <span class="badge-doc">${escapeHtml(comp.sportName)}</span>
          </div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 40px;" class="text-center">${t.number}</th>
              <th>${t.category}</th>
              <th class="text-center">${t.gender}</th>
              <th class="text-center">${t.ageDivision}</th>
              <th class="text-center">${t.weightDivision}</th>
              <th class="text-center" style="width: 80px;">${t.participantsCount}</th>
              <th class="text-center" style="width: 80px;">${t.matchesCount}</th>
              <th class="text-center" style="width: 100px;">${t.format}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : `<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">-</td></tr>`}
          </tbody>
        </table>

        <div class="footer-signatures">
          <div class="signature-box">
            <span class="signature-title">${t.presidentOfOrganization}</span>
          </div>
          <div class="signature-box">
            <span class="signature-title">${t.technicalDirector}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── 3. Brackets (Tournament Trees) ───────────────────────────────────────────

// ── 3. Brackets (Tournament Trees) ───────────────────────────────────────────

export function renderBracketsDocumentHtml(
  comp: CompetitionDocMeta,
  categories: BracketDocCategory[],
  lang: DocumentLanguage = 'fr',
): string {
  const t = getDocI18n(lang);
  const isRtl = lang === 'ar';

  const getRoundLabel = (r: number, maxR: number) => {
    if (r === maxR) return t.final;
    if (r === maxR - 1) return t.semiFinal;
    if (r === maxR - 2) return t.quarterFinal;
    return `${t.round} ${r}`;
  };

  const sheetsHtml = categories.map((cat) => {
    // Group matches by round
    const roundsMap = new Map<number, typeof cat.matches>();
    for (const m of cat.matches) {
      if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
      roundsMap.get(m.round)!.push(m);
    }
    const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
    const maxRound: number = rounds.length > 0 ? (rounds[rounds.length - 1] ?? 1) : 1;

    const roundsHtml = rounds.map((r) => {
      const roundMatches = (roundsMap.get(r) || []).filter((m) => !m.isBronze);
      const roundTitle = getRoundLabel(r, maxRound);

      const matchesList = roundMatches.map((m) => `
        <div class="bracket-match">
          <div class="match-badge">#${m.ordinal} · ${escapeHtml(m.form)}</div>
          <div class="slot ${m.winnerRegistrationId && m.winnerName === m.competitorA?.name ? 'winner' : ''}">
            <span class="slot-name">${m.competitorA ? escapeHtml(m.competitorA.name) : `<em class="text-muted">(${t.bye})</em>`}</span>
            <span class="slot-club">${escapeHtml(m.competitorA?.club || '')}</span>
            <span class="slot-score">${m.scoreA != null ? m.scoreA : '-'}</span>
          </div>
          <div class="slot ${m.winnerRegistrationId && m.winnerName === m.competitorB?.name ? 'winner' : ''}">
            <span class="slot-name">${m.competitorB ? escapeHtml(m.competitorB.name) : `<em class="text-muted">(${t.bye})</em>`}</span>
            <span class="slot-club">${escapeHtml(m.competitorB?.club || '')}</span>
            <span class="slot-score">${m.scoreB != null ? m.scoreB : '-'}</span>
          </div>
        </div>
      `).join('');

      return `
        <div class="bracket-round-col">
          <div class="round-header">${escapeHtml(roundTitle)}</div>
          <div class="round-matches">${matchesList}</div>
        </div>
      `;
    }).join('');

    const bronzeMatch = cat.matches.find((m) => m.isBronze);
    const bronzeHtml = bronzeMatch ? `
      <div class="bronze-section">
        <div class="round-header" style="background:#b45309;color:#fff;">${t.bronzeMatch}</div>
        <div class="bracket-match" style="margin-top:6px;">
          <div class="slot ${bronzeMatch.winnerRegistrationId && bronzeMatch.winnerName === bronzeMatch.competitorA?.name ? 'winner' : ''}">
            <span class="slot-name">${bronzeMatch.competitorA ? escapeHtml(bronzeMatch.competitorA.name) : '-'}</span>
            <span class="slot-club">${escapeHtml(bronzeMatch.competitorA?.club || '')}</span>
            <span class="slot-score">${bronzeMatch.scoreA != null ? bronzeMatch.scoreA : '-'}</span>
          </div>
          <div class="slot ${bronzeMatch.winnerRegistrationId && bronzeMatch.winnerName === bronzeMatch.competitorB?.name ? 'winner' : ''}">
            <span class="slot-name">${bronzeMatch.competitorB ? escapeHtml(bronzeMatch.competitorB.name) : '-'}</span>
            <span class="slot-club">${escapeHtml(bronzeMatch.competitorB?.club || '')}</span>
            <span class="slot-score">${bronzeMatch.scoreB != null ? bronzeMatch.scoreB : '-'}</span>
          </div>
        </div>
      </div>
    ` : '';

    return `
      <div class="landscape-sheet">
        <div class="header-card">
          <div>
            <div class="header-title">${escapeHtml(t.bracketsTitle)}</div>
            <div class="header-subtitle">${escapeHtml(comp.name)} · <span style="color:#0284c7;">${escapeHtml(cat.name)}</span></div>
            <div class="header-meta">
              <span class="meta-item"><strong>${t.date}:</strong> ${escapeHtml(comp.date)}</span>
              ${comp.location ? `<span class="meta-item"><strong>${t.location}:</strong> ${escapeHtml(comp.location)}</span>` : ''}
              <span class="meta-item"><strong>${t.gender}:</strong> ${cat.gender === 'M' ? t.male : t.female}</span>
            </div>
          </div>
          <div>
            <span class="badge-doc">${escapeHtml(comp.sportName)}</span>
          </div>
        </div>

        <div class="bracket-tree">
          ${roundsHtml}
        </div>

        ${bronzeHtml}

        <div class="footer-signatures" style="margin-top: auto; padding-top: 12px;">
          <div class="signature-box" style="min-height:55px;">
            <span class="signature-title">${t.refereeSignature}</span>
          </div>
          <div class="signature-box" style="min-height:55px;">
            <span class="signature-title">${t.juryPresidentSignature}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(t.bracketsTitle)} - ${escapeHtml(comp.name)}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { background: #475569; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          background: #475569;
          color: #1a1a1a;
          direction: ${isRtl ? 'rtl' : 'ltr'};
          text-align: ${isRtl ? 'right' : 'left'};
          margin: 0;
          padding: 24px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .landscape-sheet {
          width: 297mm;
          height: 210mm;
          min-width: 297mm;
          min-height: 210mm;
          max-width: 297mm;
          max-height: 210mm;
          box-sizing: border-box;
          background: #ffffff;
          padding: 10mm 12mm;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          border-radius: 4px;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          overflow: hidden;
        }
        .landscape-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .header-card {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-title {
          font-size: 14pt;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .header-subtitle {
          font-size: 10pt;
          font-weight: 600;
          color: #475569;
        }
        .header-meta {
          display: flex;
          gap: 14px;
          margin-top: 4px;
          font-size: 8.5pt;
          color: #64748b;
        }
        .meta-item { display: inline-flex; align-items: center; gap: 4px; }
        .badge-doc {
          display: inline-block;
          padding: 3px 8px;
          font-size: 8pt;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: 4px;
          background: #e2e8f0;
          color: #334155;
        }
        .bracket-tree {
          display: flex;
          gap: 14px;
          margin-top: 6px;
          align-items: stretch;
          justify-content: flex-start;
          flex: 1;
        }
        .bracket-round-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 160px;
        }
        .round-header {
          background: #1e293b;
          color: #f8fafc;
          font-size: 8pt;
          font-weight: 700;
          text-align: center;
          padding: 5px;
          border-radius: 4px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .round-matches {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          flex: 1;
          gap: 8px;
        }
        .bracket-match {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
        }
        .match-badge {
          background: #f1f5f9;
          font-size: 7pt;
          font-weight: 700;
          color: #475569;
          padding: 2px 5px;
          border-bottom: 1px solid #e2e8f0;
        }
        .slot {
          display: flex;
          align-items: center;
          padding: 4px 6px;
          font-size: 8pt;
          border-bottom: 1px solid #f1f5f9;
        }
        .slot:last-child { border-bottom: none; }
        .slot.winner {
          background-color: #f0fdf4;
          font-weight: 700;
          color: #166534;
        }
        .slot-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .slot-club {
          font-size: 7pt;
          color: #64748b;
          margin-inline-start: 4px;
          margin-inline-end: 6px;
        }
        .slot-score {
          font-weight: 800;
          width: 18px;
          text-align: center;
        }
        .bronze-section {
          margin-top: 8px;
          width: 220px;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }
        .signature-box {
          flex: 1;
          border: 1px dashed #94a3b8;
          border-radius: 4px;
          padding: 8px;
          text-align: center;
        }
        .signature-title {
          font-size: 8pt;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
        }
        @media print {
          html, body {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .landscape-sheet {
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .landscape-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      </style>
    </head>
    <body>
      ${sheetsHtml}
    </body>
    </html>
  `;
}

export function renderBracketHtml(
  comp: CompetitionDocMeta,
  cat: BracketDocCategory,
  lang: DocumentLanguage = 'fr',
): string {
  return renderBracketsDocumentHtml(comp, [cat], lang);
}

// ── 4. Match Sheets (Feuilles de Match) ───────────────────────────────────────

export function renderMatchSheetsHtml(
  comp: CompetitionDocMeta,
  sheets: MatchSheetDocItem[],
  lang: DocumentLanguage = 'fr',
): string {
  const t = getDocI18n(lang);
  const isRtl = lang === 'ar';

  const cardsHtml = sheets.map((s, idx) => `
    <div class="sheet-container ${idx < sheets.length - 1 ? 'print-page-break' : ''}">
      <div class="header-card" style="margin-bottom:10px;padding-bottom:8px;">
        <div>
          <div class="header-title" style="font-size:13pt;">${escapeHtml(t.matchSheetNumber)} #${s.matchId}</div>
          <div class="header-subtitle" style="font-size:10pt;">${escapeHtml(comp.name)} · ${escapeHtml(s.categoryName)}</div>
          <div class="header-meta" style="font-size:8pt;margin-top:3px;">
            <span><strong>${t.round}:</strong> ${escapeHtml(s.form)} (#${s.ordinal})</span>
            <span><strong>${t.tatami}:</strong> ________________</span>
            <span><strong>${t.date}:</strong> ${escapeHtml(comp.date)}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge-doc" style="background:#0f172a;color:#fff;">${s.isBronze ? t.bronzeMatch : s.form}</span>
        </div>
      </div>

      <!-- Duel Corner Comparison Table -->
      <table class="doc-table match-sheet-table">
        <thead>
          <tr>
            <th style="width: 50%; background:#fee2e2; color:#991b1b; text-align:center; font-size:10pt;">
              🔴 ${t.redCorner} (AKA)
            </th>
            <th style="width: 50%; background:#dbeafe; color:#1e40af; text-align:center; font-size:10pt;">
              🔵 ${t.blueCorner} (AO)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px;">
              <div style="font-size:12pt;font-weight:800;color:#991b1b;">
                ${s.competitorA ? escapeHtml(s.competitorA.name) : `<span class="text-muted">(${t.bye})</span>`}
              </div>
              <div style="font-size:9.5pt;margin-top:4px;">
                <strong>${t.club}:</strong> ${escapeHtml(s.competitorA?.club || '-')}
              </div>
              <div style="font-size:8.5pt;color:#64748b;">
                <strong>${t.wilaya}:</strong> ${escapeHtml(s.competitorA?.wilaya || '-')}
              </div>
              <div style="font-size:8.5pt;color:#64748b;">
                <strong>${t.weight}:</strong> ${s.competitorA?.weightKg ? s.competitorA.weightKg + ' kg' : '___ kg'}
              </div>
            </td>
            <td style="padding:10px;">
              <div style="font-size:12pt;font-weight:800;color:#1e40af;">
                ${s.competitorB ? escapeHtml(s.competitorB.name) : `<span class="text-muted">(${t.bye})</span>`}
              </div>
              <div style="font-size:9.5pt;margin-top:4px;">
                <strong>${t.club}:</strong> ${escapeHtml(s.competitorB?.club || '-')}
              </div>
              <div style="font-size:8.5pt;color:#64748b;">
                <strong>${t.wilaya}:</strong> ${escapeHtml(s.competitorB?.wilaya || '-')}
              </div>
              <div style="font-size:8.5pt;color:#64748b;">
                <strong>${t.weight}:</strong> ${s.competitorB?.weightKg ? s.competitorB.weightKg + ' kg' : '___ kg'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="height:60px;vertical-align:top;background:#fef2f2;">
              <div style="font-size:8pt;font-weight:700;color:#991b1b;margin-bottom:4px;">${t.points} / ${t.score}:</div>
              <div style="border:1px dashed #fca5a5;height:40px;border-radius:4px;text-align:center;line-height:40px;font-size:14pt;font-weight:800;">
              </div>
            </td>
            <td style="height:60px;vertical-align:top;background:#eff6ff;">
              <div style="font-size:8pt;font-weight:700;color:#1e40af;margin-bottom:4px;">${t.points} / ${t.score}:</div>
              <div style="border:1px dashed #93c5fd;height:40px;border-radius:4px;text-align:center;line-height:40px;font-size:14pt;font-weight:800;">
              </div>
            </td>
          </tr>
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:8pt;font-weight:700;color:#64748b;">${t.penalties}:</div>
              <div style="margin-top:4px;display:flex;gap:6px;">
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] C1</label>
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] C2</label>
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] C3</label>
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] Hansoku</label>
              </div>
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:8pt;font-weight:700;color:#64748b;">${t.penalties}:</div>
              <div style="margin-top:4px;display:flex;gap:6px;">
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] C1</label>
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] C2</label>
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] C3</label>
                <label style="border:1px solid #cbd5e1;padding:2px 6px;border-radius:3px;font-size:8pt;">[ ] Hansoku</label>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Outcome Decision Box -->
      <div style="border:1px solid #0f172a;border-radius:6px;padding:10px;margin-bottom:16px;background:#f8fafc;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:9.5pt;text-transform:uppercase;">${t.winner}:</strong>
          <div style="display:flex;gap:16px;font-size:9pt;">
            <label><input type="radio" name="win_${s.matchId}"> 🔴 ${t.redCorner}</label>
            <label><input type="radio" name="win_${s.matchId}"> 🔵 ${t.blueCorner}</label>
          </div>
        </div>
        <div style="display:flex;gap:12px;font-size:8.5pt;color:#334155;border-top:1px dashed #cbd5e1;padding-top:6px;">
          <strong>${t.resultType}:</strong>
          <label>[ ] ${t.points}</label>
          <label>[ ] ${t.decision}</label>
          <label>[ ] ${t.ko}</label>
          <label>[ ] ${t.abandon}</label>
          <label>[ ] ${t.disqualification}</label>
        </div>
      </div>

      <!-- Signatures -->
      <div class="footer-signatures" style="margin-top:10px;">
        <div class="signature-box" style="min-height:55px;">
          <span class="signature-title">${t.refereeSignature}</span>
        </div>
        <div class="signature-box" style="min-height:55px;">
          <span class="signature-title">${t.judgeSignature} (1 / 2)</span>
        </div>
        <div class="signature-box" style="min-height:55px;">
          <span class="signature-title">${t.juryPresidentSignature}</span>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(t.matchSheetsTitle)} - ${escapeHtml(comp.name)}</title>
      ${getBaseStyles(isRtl, false)}
      <style>
        .sheet-container {
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        ${cardsHtml}
      </div>
    </body>
    </html>
  `;
}

// ── 5. Rankings & Podiums ───────────────────────────────────────────────────

export function renderRankingsHtml(
  comp: CompetitionDocMeta,
  data: {
    categories: CategoryRanking[];
    individuals?: any[];
    clubs: ClubRankingRow[];
    wilayas: WilayaRankingRow[];
  },
  lang: DocumentLanguage = 'fr',
): string {
  const t = getDocI18n(lang);
  const isRtl = lang === 'ar';

  // Category Podiums HTML
  const categoryPodiumsHtml = (data.categories || []).map((cat) => {
    const podiumRows = cat.podium.map((a) => {
      const medalIcon = a.medal === 'gold' ? '🥇 1' : a.medal === 'silver' ? '🥈 2' : a.medal === 'bronze' ? '🥉 3' : `${a.rank}`;
      const medalStyle = a.medal === 'gold' ? 'background:#fef9c3;color:#854d0e;' : a.medal === 'silver' ? 'background:#f1f5f9;color:#334155;' : a.medal === 'bronze' ? 'background:#ffedd5;color:#9a3412;' : '';

      return `
        <tr>
          <td class="text-center font-bold" style="${medalStyle};width:55px;">${medalIcon}</td>
          <td class="font-bold">${escapeHtml(a.athleteName)}</td>
          <td>${escapeHtml(a.clubName || '-')}</td>
          <td>${escapeHtml(a.wilayaName || '-')}</td>
          <td class="text-center font-bold">${a.points} pts</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 16px; page-break-inside: avoid;">
        <div style="background:#0f172a;color:#fff;padding:6px 10px;border-radius:4px;font-size:9.5pt;font-weight:700;margin-bottom:4px;">
          ${escapeHtml(cat.categoryName)}
        </div>
        <table class="doc-table" style="margin-bottom:0;">
          <tbody>
            ${podiumRows.length ? podiumRows : `<tr><td colspan="5" class="text-center text-muted">-</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  // Club Rankings Table
  const clubRows = (data.clubs || []).map((c) => `
    <tr>
      <td class="text-center font-bold">${c.rank}</td>
      <td class="font-bold">${escapeHtml(c.clubName)}</td>
      <td>${escapeHtml(c.wilayaName || '-')}</td>
      <td class="text-center font-bold" style="color:#854d0e;">${c.gold}</td>
      <td class="text-center font-bold" style="color:#475569;">${c.silver}</td>
      <td class="text-center font-bold" style="color:#9a3412;">${c.bronze}</td>
      <td class="text-end font-bold">${c.points}</td>
    </tr>
  `).join('');

  // Wilaya Rankings Table
  const wilayaRows = (data.wilayas || []).map((w) => `
    <tr>
      <td class="text-center font-bold">${w.rank}</td>
      <td class="font-bold">${escapeHtml(w.wilayaName)}</td>
      <td class="text-center font-bold" style="color:#854d0e;">${w.gold}</td>
      <td class="text-center font-bold" style="color:#475569;">${w.silver}</td>
      <td class="text-center font-bold" style="color:#9a3412;">${w.bronze}</td>
      <td class="text-end font-bold">${w.points}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(t.rankingsTitle)} - ${escapeHtml(comp.name)}</title>
      ${getBaseStyles(isRtl, false)}
    </head>
    <body>
      <div class="page-container">
        <div class="header-card">
          <div>
            <div class="header-title">${escapeHtml(t.rankingsTitle)}</div>
            <div class="header-subtitle">${escapeHtml(comp.name)} (${escapeHtml(comp.sportName)})</div>
            <div class="header-meta">
              <span class="meta-item"><strong>${t.date}:</strong> ${escapeHtml(comp.date)}</span>
              ${comp.location ? `<span class="meta-item"><strong>${t.location}:</strong> ${escapeHtml(comp.location)}</span>` : ''}
            </div>
          </div>
          <div>
            <span class="badge-doc">${escapeHtml(comp.sportName)}</span>
          </div>
        </div>

        <h3 style="font-size:11pt;margin-bottom:8px;color:#0f172a;text-transform:uppercase;">${t.podiumsByCategory}</h3>
        ${categoryPodiumsHtml}

        <div style="page-break-before: always; padding-top: 10px;"></div>

        <h3 style="font-size:11pt;margin-bottom:8px;color:#0f172a;text-transform:uppercase;">${t.clubRankings}</h3>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width:40px;" class="text-center">${t.rank}</th>
              <th>${t.club}</th>
              <th>${t.wilaya}</th>
              <th class="text-center" style="width:55px;">🥇 ${t.gold}</th>
              <th class="text-center" style="width:55px;">🥈 ${t.silver}</th>
              <th class="text-center" style="width:55px;">🥉 ${t.bronze}</th>
              <th class="text-end" style="width:75px;">${t.totalPoints}</th>
            </tr>
          </thead>
          <tbody>
            ${clubRows.length ? clubRows : `<tr><td colspan="7" class="text-center text-muted">-</td></tr>`}
          </tbody>
        </table>

        ${(data.wilayas?.length || 0) > 0 ? `
          <h3 style="font-size:11pt;margin-top:20px;margin-bottom:8px;color:#0f172a;text-transform:uppercase;">${t.wilayaRankings}</h3>
          <table class="doc-table">
            <thead>
              <tr>
                <th style="width:40px;" class="text-center">${t.rank}</th>
                <th>${t.wilaya}</th>
                <th class="text-center" style="width:55px;">🥇 ${t.gold}</th>
                <th class="text-center" style="width:55px;">🥈 ${t.silver}</th>
                <th class="text-center" style="width:55px;">🥉 ${t.bronze}</th>
                <th class="text-end" style="width:75px;">${t.totalPoints}</th>
              </tr>
            </thead>
            <tbody>
              ${wilayaRows}
            </tbody>
          </table>
        ` : ''}

        <div class="footer-signatures" style="margin-top:30px;">
          <div class="signature-box">
            <span class="signature-title">${t.presidentOfOrganization}</span>
          </div>
          <div class="signature-box">
            <span class="signature-title">${t.technicalDirector}</span>
          </div>
          <div class="signature-box">
            <span class="signature-title">${t.juryPresidentSignature}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── 6. Certificates (Participation & Winner Diplomas) ────────────────────────

export function renderCertificatesDocumentHtml(
  certs: CertificateDocItem[],
  _lang: DocumentLanguage = 'ar',
): string {
  // As explicitly required: certificates strictly use authentic Arabic design and typography for now
  const sheetsHtml = certs.map((cert, idx) => {
    const isWinner = cert.type === 'winner';
    const isFemale = cert.gender === 'F';

    // Award intro text
    const awardIntro = isWinner
      ? (isFemale
          ? 'تَشْهَدُ اللَّجْنَةُ المُنَظِّمَةُ لِلْمُنَافَسَةِ وَاللَّجْنَةُ الفَنِّيَّةُ بِمَنْحِ هَذَا التَّكْرِيمِ لِلْبَطَلَةِ الرِّيَاضِيَّةِ:'
          : 'تَشْهَدُ اللَّجْنَةُ المُنَظِّمَةُ لِلْمُنَافَسَةِ وَاللَّجْنَةُ الفَنِّيَّةُ بِمَنْحِ هَذَا التَّكْرِيمِ لِلْبَطَلِ الرِّيَاضِيّ:')
      : (isFemale
          ? 'تَشْهَدُ اللَّجْنَةُ المُنَظِّمَةُ لِلْمُنَافَسَةِ بِمَنْحِ شَهَادَةِ المُشَارَكَةِ لِلرِّيَاضِيَّةِ:'
          : 'تَشْهَدُ اللَّجْنَةُ المُنَظِّمَةُ لِلْمُنَافَسَةِ بِمَنْحِ شَهَادَةِ المُشَارَكَةِ لِلرِّيَاضِيّ:');

    // Badge styling and text
    let badgeClass = 'gold';
    let badgeContent = '★ المَرْتَبَةُ الأُولَى • المَيْدَالِيَةُ الذَّهَبِيَّةُ ★';

    if (isWinner) {
      if (cert.rank === 2) {
        badgeClass = 'silver';
        badgeContent = '★ المَرْتَبَةُ الثَّانِيَةُ • المَيْدَالِيَةُ الفِضِّيَّةُ ★';
      } else if (cert.rank === 3) {
        badgeClass = 'bronze';
        badgeContent = '★ المَرْتَبَةُ الثَّالِثَةُ • المَيْدَالِيَةُ البُرُونزِيَّةُ ★';
      }
    } else {
      badgeClass = 'participation';
      badgeContent = '★ مُشَارَكَةٌ شَرَفِيَّةٌ • تَقْدِيرٌ وَتَمَيُّزٌ ★';
    }

    // Description text
    const description = isWinner
      ? (isFemale
          ? `تتويجاً لتألقها واعتلائها منصة التتويج عن جدارة واستحقاق في فعاليات بطولة « ${escapeHtml(cert.competitionName)} »، ونظير ما قدّمته من روح رياضية سامية ومستوى فني رفيع مشرّف للرياضة الوطنية.`
          : `تتويجاً لتألقه واعتلائه منصة التتويج عن جدارة واستحقاق في فعاليات بطولة « ${escapeHtml(cert.competitionName)} »، ونظير ما قدّمه من روح رياضية سامية ومستوى فني رفيع مشرّف للرياضة الوطنية.`)
      : (isFemale
          ? `تقديراً لمشاركتها الفعالة وأدائها الرياضي المتميز والتزامها بالروح الرياضية النبيلة في فعاليات منافسة « ${escapeHtml(cert.competitionName)} »، متمنين لها دوام التوفيق والتألق الرياضي.`
          : `تقديراً لمشاركته الفعالة وأدائه الرياضي المتميز والتزامه بالروح الرياضية النبيلة في فعاليات منافسة « ${escapeHtml(cert.competitionName)} »، متمنين له دوام التوفيق والتألق الرياضي.`);

    const certSerial = `DZ-CERT-${String(idx + 1).padStart(4, '0')}`;

    return `
      <div class="certificate-sheet">
        <div class="outer-border ${isWinner ? 'theme-winner' : 'theme-participation'}">
          
          <!-- أركان الزخرفة -->
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>

          <!-- الرأس الرسمي للشهادة -->
          <header class="header-section">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
            <div class="republic">الجمهورية الجزائرية الديمقراطية الشعبية</div>
            <div class="ministry">وزارة الشباب والرياضة</div>
            <div class="federation">الاتحادية الجزائرية لرياضات النزال والرياضات المماثلة</div>
            <div class="federation-fr">${escapeHtml(cert.sportName)} · RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</div>
          </header>

          <!-- عنوان الشهادة -->
          <section class="title-box">
            <h1 class="main-title">${isWinner ? 'شَهَادَةُ تَرْتِيبِ وَتَمَيُّزِ' : 'شَهَادَةُ مُشَارَكَةٍ وَتَقْدِيرٍ'}</h1>
            <div class="sub-title">${isWinner ? 'CERTIFICAT DE CLASSEMENT ET DE MÉRITE' : 'ATTESTATION DE PARTICIPATION ET DE MÉRITE'}</div>
          </section>

          <!-- متن الشهادة والاسم -->
          <section class="content-section">
            <p class="award-text">${awardIntro}</p>
            
            <div class="recipient-name">${escapeHtml(cert.athleteName)}</div>
            <br>
            <div class="rank-badge ${badgeClass}">${badgeContent}</div>
            
            <p class="description">${description}</p>
          </section>

          <!-- البيانات الفنية والتصنيف -->
          <section class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">الاختصاص الرياضي</div>
              <div class="meta-val">${escapeHtml(cert.sportName)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">الفئة والوزن</div>
              <div class="meta-val">${escapeHtml(cert.categoryName)} (${isFemale ? 'إناث' : 'ذكور'})</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">النادي والولاية</div>
              <div class="meta-val">${escapeHtml(cert.clubName)} · ${escapeHtml(cert.wilayaName)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">التاريخ والمكان</div>
              <div class="meta-val">${escapeHtml(cert.competitionDate)}${cert.competitionLocation ? ' · ' + escapeHtml(cert.competitionLocation) : ''}</div>
            </div>
          </section>

          <!-- الأختام والتوقيعات -->
          <footer class="signatures-section">
            <div class="sig-block">
              <div class="sig-title">رئيس لجنة الحكام والتحكيم</div>
              <div class="sig-line">التوقيع والمصادقة</div>
            </div>

            <div class="official-seal">
              خاتم المنافسة<br>الرسمي المعتمد
            </div>

            <div class="sig-block">
              <div class="sig-title">رئيس الاتحادية / لجنة التنظيم</div>
              <div class="sig-line">التوقيع والخاتم الرسمي</div>
            </div>
          </footer>

          <!-- حاشية السجل والاعتماد -->
          <div class="footer-note">
            رقم السجل والاعتماد: ${certSerial} &nbsp;|&nbsp; وثيقة رسمية معتمدة ومطابقة لمداولات اللجنة الرياضية
          </div>

        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>الشهادات الرسمية - الاتحادية الجزائرية</title>
      <!-- خطوط عربية فنية وتقليدية مخصصة للشهادات -->
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,700&family=Aref+Ruqaa:wght@700&family=Reem+Kufi:wght@600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background-color: #334155;
          font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'DecoType Naskh', 'Arabic Typesetting', serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          color: #1a1a1a;
          direction: rtl;
          text-align: center;
          padding: 24px 0;
          gap: 28px;
        }

        /* أبعاد ورقة A4 بالعرض */
        .certificate-sheet {
          width: 297mm;
          height: 210mm;
          min-width: 297mm;
          min-height: 210mm;
          max-width: 297mm;
          max-height: 210mm;
          box-sizing: border-box;
          background: #fffdf9;
          position: relative;
          padding: 10mm;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .certificate-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        /* الإطار الخارجي */
        .outer-border {
          width: 100%;
          height: 100%;
          padding: 8px 24px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* ── نمط شهادة الترتيب والتتويج (ذهبي مع لمسة خضراء) ── */
        .outer-border.theme-winner {
          border: 4px solid #b38728;
          outline: 2px solid #0b5e28;
          outline-offset: -8px;
          background: radial-gradient(circle at center, #ffffff 60%, #faf6eb 100%);
        }
        .theme-winner .corner {
          border-color: #b38728;
        }
        .theme-winner .main-title {
          color: #b38728;
          text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.12);
        }
        .theme-winner .sub-title {
          color: #0b5e28;
        }
        .theme-winner .recipient-name {
          color: #0b5e28;
          border-bottom: 2px dashed #b38728;
        }
        .theme-winner .meta-grid {
          background: #fdfaf2;
          border: 1px solid #ebd79b;
        }
        .theme-winner .official-seal {
          border: 2px dashed #b38728;
          color: #b38728;
        }

        /* ── نمط شهادة المشاركة والتقدير (أخضر زمردي جزائري مميز) ── */
        .outer-border.theme-participation {
          border: 4px solid #0b5e28;
          outline: 2px solid #b38728;
          outline-offset: -8px;
          background: radial-gradient(circle at center, #ffffff 58%, #f0fdf4 100%);
        }
        .theme-participation .corner {
          border-color: #0b5e28;
        }
        .theme-participation .main-title {
          color: #0b5e28;
          text-shadow: 1px 1px 1px rgba(11, 94, 40, 0.22);
        }
        .theme-participation .sub-title {
          color: #b38728;
        }
        .theme-participation .recipient-name {
          color: #064e3b;
          border-bottom: 2px dashed #0b5e28;
        }
        .theme-participation .meta-grid {
          background: #f0fdf4;
          border: 1px solid #86efac;
        }
        .theme-participation .official-seal {
          border: 2px dashed #0b5e28;
          color: #0b5e28;
        }

        /* زخارف الزوايا الكلاسيكية */
        .corner {
          position: absolute;
          width: 32px;
          height: 32px;
          border: 3px solid;
        }
        .corner-tl { top: 4px; right: 4px; border-bottom: none; border-left: none; }
        .corner-tr { top: 4px; left: 4px; border-bottom: none; border-right: none; }
        .corner-bl { bottom: 4px; right: 4px; border-top: none; border-left: none; }
        .corner-br { bottom: 4px; left: 4px; border-top: none; border-right: none; }

        /* رأس الشهادة والترويسة الرسمية */
        .header-section {
          text-align: center;
          line-height: 1.32;
        }
        .bismillah {
          font-family: 'Reem Kufi', 'Aref Ruqaa', 'Amiri', serif;
          font-size: 14pt;
          font-weight: 700;
          color: #0b5e28;
          margin-bottom: 2px;
        }
        .republic {
          font-size: 11pt;
          font-weight: 700;
          color: #222;
        }
        .ministry {
          font-size: 10pt;
          color: #444;
        }
        .federation {
          font-size: 11.5pt;
          font-weight: 700;
          color: #922227;
          margin-top: 1px;
        }
        .federation-fr {
          font-family: sans-serif;
          font-size: 7pt;
          letter-spacing: 0.8px;
          color: #555;
          text-transform: uppercase;
          direction: ltr;
        }

        /* العنوان الرئيسي للشهادة */
        .title-box {
          text-align: center;
          margin: 2px 0;
        }
        .main-title {
          font-family: 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif;
          font-size: 26pt;
          font-weight: 700;
          line-height: 1.1;
        }
        .sub-title {
          font-family: sans-serif;
          font-size: 7.5pt;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          direction: ltr;
        }

        /* محتوى التكريم واسم البطل */
        .content-section {
          text-align: center;
        }
        .award-text {
          font-size: 11.5pt;
          color: #333;
        }
        .recipient-name {
          font-family: 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif;
          font-size: 29pt;
          font-weight: 700;
          margin: 2px 0;
          display: inline-block;
          padding: 0 35px;
        }
        .rank-badge {
          display: inline-block;
          background: linear-gradient(135deg, #d4af37, #f7e28b, #b38728);
          color: #2b1f02;
          padding: 3px 22px;
          border-radius: 20px;
          font-size: 11.5pt;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          margin: 3px 0;
        }
        .rank-badge.silver {
          background: linear-gradient(135deg, #94a3b8, #f1f5f9, #64748b);
          color: #0f172a;
        }
        .rank-badge.bronze {
          background: linear-gradient(135deg, #d97706, #fde68a, #b45309);
          color: #451a03;
        }
        .rank-badge.participation {
          background: linear-gradient(135deg, #059669, #a7f3d0, #047857);
          color: #064e3b;
        }
        .description {
          font-size: 10.5pt;
          line-height: 1.45;
          color: #333;
          max-width: 86%;
          margin: 0 auto;
        }

        /* تفاصيل المنافسة والفئة */
        .meta-grid {
          display: flex;
          justify-content: space-around;
          border-radius: 8px;
          padding: 5px 12px;
          margin: 4px auto;
          width: 90%;
          text-align: center;
        }
        .meta-item .meta-label {
          font-size: 8.5pt;
          color: #666;
        }
        .meta-item .meta-val {
          font-size: 10.5pt;
          font-weight: 700;
          color: #111;
        }

        /* التواقيع والأختام السفلية */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 35px 2px 35px;
        }
        .sig-block {
          text-align: center;
          width: 190px;
        }
        .sig-title {
          font-size: 10pt;
          font-weight: 700;
          color: #222;
          margin-bottom: 20px;
        }
        .sig-line {
          border-top: 1px solid #666;
          font-size: 8pt;
          color: #666;
          padding-top: 2px;
        }
        .official-seal {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          font-size: 7.5pt;
          font-weight: 700;
          margin: 0 auto;
          line-height: 1.25;
        }

        .footer-note {
          text-align: center;
          font-size: 7.5pt;
          color: #777;
          margin-top: 2px;
          border-top: 1px solid #eee;
          padding-top: 2px;
        }

        /* تحسينات الطباعة A4 بدون هوامش إضافية */
        @media print {
          html, body {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            display: block !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .certificate-sheet {
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .certificate-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      </style>
    </head>
    <body>
      ${sheetsHtml}
    </body>
    </html>
  `;
}

export function renderCertificateHtml(
  cert: CertificateDocItem,
  lang: DocumentLanguage = 'ar',
): string {
  return renderCertificatesDocumentHtml([cert], lang);
}
