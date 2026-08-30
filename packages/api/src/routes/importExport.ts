import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { eq, getTableColumns } from 'drizzle-orm';
import { getDb } from '@sport-competition/core';
import {
  athletes as athletesTable,
  cities as citiesTable,
  clubs,
  wilayas,
} from '@sport-competition/core';

export const importExportRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const HEADERS = ['Nom', 'Prénom', 'Date de naissance', 'Sexe', 'Poids (kg)', 'Téléphone', 'Club'];

// ---------------------------------------------------------------------------
// Import athletes from Excel
// ---------------------------------------------------------------------------

importExportRouter.post('/import/athletes', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const workbook = new ExcelJS.Workbook();
    type XlsxInput = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];
    await workbook.xlsx.load(req.file.buffer as unknown as XlsxInput);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'Fichier Excel vide' });

    const db = getDb();
    const allClubs = db.select({ id: clubs.id, name: clubs.name }).from(clubs).all();
    const clubByName = new Map(allClubs.map((c) => [c.name.toLowerCase(), c.id]));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const known = new Set(
      db.select({ f: athletesTable.firstName, l: athletesTable.lastName, d: athletesTable.birthDate }).from(athletesTable).all().map((r) => `${r.f}|${r.l}|${r.d}`),
    );

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const cells: (string | number)[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col <= HEADERS.length) cells[col - 1] = cell.text.trim();
      });
      const [lastName, firstName, birthDate, gender, weight, phone, clubName] = cells.map((v) => (v == null ? '' : String(v)));

      if (!lastName || !firstName || !birthDate) {
        errors.push(`Ligne ${rowNumber}: nom, prénom et date requis`);
        return;
      }
      if (gender !== 'M' && gender !== 'F') {
        errors.push(`Ligne ${rowNumber}: sexe invalide (« ${gender} »)`);
        return;
      }
      const key = `${firstName}|${lastName}|${birthDate}`;
      if (known.has(key)) {
        skipped++;
        return;
      }
      let clubId: number | null = null;
      if (clubName) {
        clubId = clubByName.get(clubName.toLowerCase()) ?? null;
        if (clubId == null) errors.push(`Ligne ${rowNumber}: club inconnu « ${clubName} »`);
      }
      db.insert(athletesTable)
        .values({
          firstName,
          lastName,
          birthDate,
          gender: gender as 'M' | 'F',
          weightKg: weight ? Number(weight) : null,
          phone: phone || null,
          clubId,
        })
        .run();
      known.add(key);
      created++;
    });

    res.json({ created, skipped, errors });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

function sendWorkbook(res: Response, wb: ExcelJS.Workbook, filename: string) {
  (async () => {
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-z0-9\-_.]/gi, '_')}"`);
    res.send(Buffer.from(buf));
  })().catch((e) => {
    res.status(500).json({ error: String(e) });
  });
}

export function buildWorkbook(headers: string[], rows: (string | number | null)[][]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Données');
  sheet.addRow(headers);
  for (const r of rows) sheet.addRow(r);
  sheet.getRow(1).font = { bold: true };
  return wb;
}

importExportRouter.get('/export/template', (_req, res) => {
  const wb = buildWorkbook(HEADERS, [[
    'Exemple',
    'Athlète',
    '2010-01-15',
    'M',
    48,
    '0550123456',
    'Club Exemple',
  ]]);
  sendWorkbook(res, wb, 'Athletes.xlsx');
});

importExportRouter.get('/export/athletes', (_req, res) => {
  const db = getDb();
  const rows = db
    .select({
      ...getTableColumns(athletesTable),
      clubName: clubs.name,
    })
    .from(athletesTable)
    .leftJoin(clubs, eq(athletesTable.clubId, clubs.id))
    .all();
  const data = rows.map((r) => [
    r.lastName,
    r.firstName,
    r.birthDate,
    r.gender,
    r.weightKg,
    r.phone ?? '',
    r.clubName ?? '',
  ]);
  const wb = buildWorkbook(HEADERS, data);
  sendWorkbook(res, wb, 'athletes.xlsx');
});

importExportRouter.get('/export/clubs', (_req, res) => {
  const db = getDb();
  const rows = db
    .select({
      ...getTableColumns(clubs),
      wilayaFr: wilayas.nameFr,
      cityFr: citiesTable.nameFr,
    })
    .from(clubs)
    .innerJoin(wilayas, eq(clubs.wilayaId, wilayas.id))
    .innerJoin(citiesTable, eq(clubs.cityId, citiesTable.id))
    .all();
  const data = rows.map((r) => [r.name, r.wilayaFr, r.cityFr, r.email ?? '', r.phone ?? '', r.address ?? '', r.notes ?? '']);
  const wb = buildWorkbook(['Nom', 'Wilaya', 'Commune', 'Email', 'Téléphone', 'Adresse', 'Notes'], data);
  sendWorkbook(res, wb, 'clubs.xlsx');
});