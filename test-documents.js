import { createApp } from './packages/api/src/app.ts';
import { initDb } from '@sport-competition/core';
import { dbPath, ensureDataDir } from './packages/api/src/config.ts';
import assert from 'node:assert';

async function runTests() {
  console.log('=== PHASE 07 DOCUMENT GENERATION TEST ===\n');

  ensureDataDir();
  initDb(dbPath());

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const compListRes = await fetch(`${baseUrl}/competitions`);
  const compList = await compListRes.json();
  const targetComp = compList.find((c) => c.status === 'COMPLETED') || compList[0];
  const compId = targetComp.id;
  console.log(`Using competition #${compId} (${targetComp.name}, status: ${targetComp.status})`);

  try {
    // 1. Check Catalog
    console.log(`1. Checking Document Catalog for competition #${compId}...`);
    const catalogRes = await fetch(`${baseUrl}/competitions/${compId}/documents`);
    assert.strictEqual(catalogRes.status, 200, 'Catalog endpoint returned 200');
    const catalogData = await catalogRes.json();
    console.log(`   Found ${catalogData.catalog.length} document entries in catalog.`);
    assert.ok(catalogData.catalog.length >= 6, 'Catalog has all required document types');
    console.log('   Catalog check passed!\n');

    // 2. Check HTML Document generation for all types (French & Arabic)
    const docEndpoints = [
      { name: 'Participants (FR)', url: `${baseUrl}/competitions/${compId}/documents/participants?format=html&lang=fr` },
      { name: 'Participants (AR RTL)', url: `${baseUrl}/competitions/${compId}/documents/participants?format=html&lang=ar` },
      { name: 'Categories (FR)', url: `${baseUrl}/competitions/${compId}/documents/categories?format=html&lang=fr` },
      { name: 'Brackets (FR)', url: `${baseUrl}/competitions/${compId}/documents/brackets?format=html&lang=fr` },
      { name: 'Brackets (AR RTL)', url: `${baseUrl}/competitions/${compId}/documents/brackets?format=html&lang=ar` },
      { name: 'Match Sheets (FR)', url: `${baseUrl}/competitions/${compId}/documents/match-sheets?format=html&lang=fr` },
      { name: 'Rankings (FR)', url: `${baseUrl}/competitions/${compId}/documents/rankings?format=html&lang=fr` },
      { name: 'Rankings (AR RTL)', url: `${baseUrl}/competitions/${compId}/documents/rankings?format=html&lang=ar` },
      { name: 'Certificates Participation (FR)', url: `${baseUrl}/competitions/${compId}/documents/certificates?format=html&lang=fr&certType=participation` },
      { name: 'Certificates Winner (AR RTL)', url: `${baseUrl}/competitions/${compId}/documents/certificates?format=html&lang=ar&certType=winner` },
    ];

    console.log('2. Testing HTML document rendering for all types (FR & AR)...');
    for (const item of docEndpoints) {
      const res = await fetch(item.url);
      assert.strictEqual(res.status, 200, `${item.name} should return 200`);
      const html = await res.text();
      assert.ok(html.includes('<!DOCTYPE html>'), `${item.name} contains html doctype`);
      assert.ok(html.length > 500, `${item.name} has content length > 500`);
      if (item.name.includes('AR RTL')) {
        assert.ok(html.includes('dir="rtl"'), `${item.name} has dir="rtl"`);
      }
      console.log(`   ✓ ${item.name} OK (${html.length} chars)`);
    }

    // 3. Check Native PDF Generation
    console.log('\n3. Testing offline PDF generation...');
    console.log('   Generating Participants PDF...');
    const pdfRes1 = await fetch(`${baseUrl}/competitions/${compId}/documents/participants?format=pdf&lang=fr`);
    assert.strictEqual(pdfRes1.status, 200, 'Participants PDF returns 200');
    assert.strictEqual(pdfRes1.headers.get('content-type'), 'application/pdf', 'Content-Type is application/pdf');
    const pdfBuf1 = await pdfRes1.arrayBuffer();
    console.log(`   ✓ Participants PDF successfully generated (${pdfBuf1.byteLength} bytes)`);
    assert.ok(pdfBuf1.byteLength > 1000, 'PDF buffer size > 1000 bytes');

    console.log('   Generating Certificates (Winner) PDF in Arabic RTL...');
    const pdfRes2 = await fetch(`${baseUrl}/competitions/${compId}/documents/certificates?format=pdf&lang=ar&certType=winner`);
    assert.strictEqual(pdfRes2.status, 200, 'Certificates PDF returns 200');
    assert.strictEqual(pdfRes2.headers.get('content-type'), 'application/pdf', 'Content-Type is application/pdf');
    const pdfBuf2 = await pdfRes2.arrayBuffer();
    console.log(`   ✓ Certificates PDF successfully generated (${pdfBuf2.byteLength} bytes)`);
    assert.ok(pdfBuf2.byteLength > 1000, 'PDF buffer size > 1000 bytes');

    console.log('\n=== ALL PHASE 07 TESTS PASSED SUCCESSFULLY! ===');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
