import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextPow2,
  mulberry32,
  generateBracket,
  optimiseOrder,
  formName,
  computeAudit,
  type DrawParticipant,
} from './bracket.ts';

function participants(n: number): DrawParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    registrationId: i + 1,
    wilayaId: 1,
    cityId: 1,
    clubId: 1,
  }));
}

test('nextPow2', () => {
  assert.equal(nextPow2(1), 1);
  assert.equal(nextPow2(2), 2);
  assert.equal(nextPow2(3), 4);
  assert.equal(nextPow2(15), 16);
  assert.equal(nextPow2(16), 16);
  assert.equal(nextPow2(17), 32);
});

test('mulberry32 is deterministic', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('generateBracket: 15 athletes -> 16 slots, 1 bye', () => {
  const bracket = generateBracket(participants(15), { bronze: true, seed: 7 });
  assert.equal(bracket.size, 16);
  assert.equal(bracket.byes, 1);
  assert.equal(bracket.rounds, 4);
  assert.equal(bracket.matches[1]!.length, 8);
  const byes = bracket.matches[1]!.filter((m) => m.isBye);
  assert.equal(byes.length, 1);
});

test('generateBracket: 6 athletes -> 8 slots, 2 byes, byes never adjacent', () => {
  const bracket = generateBracket(participants(6), { bronze: true, seed: 3 });
  assert.equal(bracket.size, 8);
  assert.equal(bracket.byes, 2);
  const r1 = bracket.matches[1]!;
  for (const m of r1) {
    // no bye-vs-bye in round 1
    assert.ok(m.competitorAId != null || m.competitorBId != null);
  }
});

test('generateBracket: round 1 all player pairings', () => {
  const n = 8;
  const bracket = generateBracket(participants(n), { bronze: true, seed: 1 });
  const regs = new Set(bracket.matches[1]!.flatMap((m) => [m.competitorAId, m.competitorBId]).filter(Boolean));
  assert.equal(regs.size, n);
});

test('generateBracket: winner progression references are consistent', () => {
  const bracket = generateBracket(participants(16), { bronze: true, seed: 9 });
  const r2 = bracket.matches[2]!;
  assert.equal(r2.length, 4); // quarters of a 16-slot bracket
  for (let k = 0; k < r2.length; k++) {
    assert.deepEqual(r2[k]!.previous, {
      a: { round: 1, ordinal: 2 * k + 1 },
      b: { round: 1, ordinal: 2 * k + 2 },
    });
  }
});

test('generateBracket: single participant', () => {
  const bracket = generateBracket(participants(1), { bronze: true, seed: 1 });
  assert.equal(bracket.size, 1);
  assert.equal(bracket.matches[1]!.length, 1);
});

test('generateBracket: empty -> empty bracket', () => {
  const bracket = generateBracket([], { bronze: true, seed: 1 });
  assert.equal(bracket.size, 0);
});

test('formName', () => {
  assert.equal(formName(1), 'Finale');
  assert.equal(formName(2), 'Demi-finale');
  assert.equal(formName(4), 'Quart de finale');
  assert.equal(formName(16), 'Seizième de finale');
});

test('optimiseOrder reduces same-club pairings', () => {
  // Two clusters of 4 from different wilayas/clubs: penalty should drop to ~0
  const ps: DrawParticipant[] = [];
  for (let i = 0; i < 8; i++) {
    ps.push({
      registrationId: i + 1,
      wilayaId: i < 4 ? 1 : 2,
      cityId: i < 4 ? 1 : 2,
      clubId: i < 4 ? 1 : 2,
    });
  }
  const { score } = optimiseOrder(ps, 123);
  assert.ok(score === 0, `expected score 0, got ${score}`);
});

test('computeAudit counts same-region pairings from match data', () => {
  const ps: DrawParticipant[] = [
    { registrationId: 1, wilayaId: 1, cityId: 1, clubId: 1 },
    { registrationId: 2, wilayaId: 1, cityId: 1, clubId: 1 },
    { registrationId: 3, wilayaId: 2, cityId: 2, clubId: 2 },
    { registrationId: 4, wilayaId: 2, cityId: 3, clubId: 3 },
  ];
  const round1 = [
    { round: 1, status: 'PENDING', competitorAId: 1, competitorBId: 2 },
    { round: 1, status: 'PENDING', competitorAId: 3, competitorBId: 4 },
  ];
  const audit = computeAudit(round1, ps);
  assert.equal(audit.sameWilaya, 2); // 1v2 same wilaya, 3v4 same wilaya
  assert.equal(audit.sameCity, 1);   // 1v2 same city; 3v4 different cities
  assert.equal(audit.sameClub, 1);   // 1v2 same club; 3v4 different clubs
});

test('computeAudit skips bye matches', () => {
  const ps: DrawParticipant[] = [
    { registrationId: 1, wilayaId: 1, cityId: 1, clubId: 1 },
    { registrationId: 2, wilayaId: 1, cityId: 1, clubId: 1 },
  ];
  const round1 = [
    { round: 1, status: 'BYE', competitorAId: 1, competitorBId: null },
    { round: 1, status: 'BYE', competitorAId: 2, competitorBId: null },
  ];
  const audit = computeAudit(round1, ps);
  assert.equal(audit.sameWilaya, 0);
  assert.equal(audit.sameCity, 0);
  assert.equal(audit.sameClub, 0);
});
