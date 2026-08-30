// Pure single-elimination bracket engine.
// Deterministic for a given seed. Standard seed-based leaf assignment (bit-reversal
// permutation) guarantees byes only occur in round 1 and never meet each other.

export interface DrawParticipant {
  registrationId: number;
  wilayaId: number | null;
  cityId: number | null;
  clubId: number | null;
}

// Preference weights: avoiding same wilaya matters most, then city, then club.
export const PREFERENCE_WEIGHTS = {
  wilaya: 8,
  city: 4,
  club: 2,
} as const;

export interface RoundMatchRef {
  round: number;
  ordinal: number;
}

export interface RoundMatch {
  round: number; // 1-based
  ordinal: number; // 1-based within round
  form: string;
  competitorAId: number | null; // registrationId
  competitorBId: number | null;
  isBye: boolean;
  isBronze: boolean;
  previous: {
    a: RoundMatchRef | null;
    b: RoundMatchRef | null;
  };
}

export interface Bracket {
  seed: number;
  size: number; // bracket slot count (power of two)
  n: number; // participant count
  byes: number;
  rounds: number;
  matches: Record<number, RoundMatch[]>; // round (1-based) -> matches
  audit: { sameWilaya: number; sameCity: number; sameClub: number };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Mulberry32 PRNG - fast, deterministic, good enough for draw shuffling. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextPow2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Bit-reverse `x` over `bits` bits. */
function bitReverse(x: number, bits: number): number {
  let r = 0;
  for (let i = 0; i < bits; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r;
}

/** French display name for a round with `matchesInRound` matches. */
export function formName(matchesInRound: number): string {
  const map: Record<number, string> = {
    1: 'Finale',
    2: 'Demi-finale',
    4: 'Quart de finale',
    8: 'Huitième de finale',
    16: 'Seizième de finale',
    32: 'Trente-deuxième de finale',
  };
  return map[matchesInRound] ?? `Tour ${Math.log2(matchesInRound) + 1}`;
}

export function pairPenalty(
  a: DrawParticipant,
  b: DrawParticipant,
  weights: { wilaya: number; city: number; club: number } = PREFERENCE_WEIGHTS,
): number {
  let p = 0;
  if (a.wilayaId != null && a.wilayaId === b.wilayaId) p += weights.wilaya;
  if (a.cityId != null && a.cityId === b.cityId) p += weights.city;
  if (a.clubId != null && a.clubId === b.clubId) p += weights.club;
  return p;
}

// ---------------------------------------------------------------------------
// Bracket construction
// ---------------------------------------------------------------------------

/**
 * Build a single-elimination bracket where `participants[ordinals[i]]` is placed
 * in seed slot `i`. Seeds 0..n-1 hold players; seeds n..size-1 are empty (byes).
 */
export function buildBracketFromOrder(
  participants: DrawParticipant[],
  ordinals: number[],
  _opts: { bronze: boolean; seed: number },
): Bracket {
  const n = ordinals.length;
  if (n === 0) {
    return { seed: _opts.seed, size: 0, n: 0, byes: 0, rounds: 0, matches: {}, audit: { sameWilaya: 0, sameCity: 0, sameClub: 0 } };
  }
  const size = nextPow2(n);
  const byes = size - n;
  const roundCount = Math.max(1, Math.round(Math.log2(size)));
  const bits = Math.max(1, Math.round(Math.log2(size)));
  const matches: Record<number, RoundMatch[]> = {};

  const playerAtSeed = (seedIdx: number): number => {
    const order = ordinals[seedIdx]!;
    return participants[order]!.registrationId;
  };
  const seedAtLeaf = (leaf: number): number => bitReverse(leaf, bits);

  // Round 1 matches
  const round1: RoundMatch[] = [];
  for (let i = 0; i < size / 2; i++) {
    const seedA = seedAtLeaf(2 * i);
    const seedB = seedAtLeaf(2 * i + 1);
    const hasA = seedA < n;
    const hasB = seedB < n;
    round1.push({
      round: 1,
      ordinal: i + 1,
      form: formName(size / 2),
      competitorAId: hasA ? playerAtSeed(seedA) : null,
      competitorBId: hasB ? playerAtSeed(seedB) : null,
      isBye: !hasA || !hasB,
      isBronze: false,
      previous: { a: null, b: null },
    });
  }
  matches[1] = round1;

  // Subsequent rounds
  for (let r = 2; r <= roundCount; r++) {
    const rMatches = Math.floor(2 ** (roundCount - r));
    const list: RoundMatch[] = [];
    for (let k = 0; k < rMatches; k++) {
      list.push({
        round: r,
        ordinal: k + 1,
        form: formName(rMatches),
        competitorAId: null,
        competitorBId: null,
        isBye: false,
        isBronze: false,
        previous: {
          a: { round: r - 1, ordinal: 2 * k + 1 },
          b: { round: r - 1, ordinal: 2 * k + 2 },
        },
      });
    }
    matches[r] = list;
  }

  // Audit round-1 pairings
  const byReg = new Map(participants.map((p) => [p.registrationId, p]));
  let sameWilaya = 0;
  let sameCity = 0;
  let sameClub = 0;
  for (const m of round1) {
    if (m.isBye) continue;
    const a = byReg.get(m.competitorAId!)!;
    const b = byReg.get(m.competitorBId!)!;
    if (a.wilayaId != null && a.wilayaId === b.wilayaId) sameWilaya++;
    if (a.cityId != null && a.cityId === b.cityId) sameCity++;
    if (a.clubId != null && a.clubId === b.clubId) sameClub++;
  }

  return {
    seed: _opts.seed,
    size,
    n,
    byes,
    rounds: roundCount,
    matches,
    audit: { sameWilaya, sameCity, sameClub },
  };
}

/**
 * Optimise the seed ordering to minimise first-round same-wilaya/city/club
 * pairings. Greedy local search seeded by the PRNG. Returns assignment where
 * best.ordinals[i] = index into participants placed at seed slot i.
 */
export function optimiseOrder(
  participants: DrawParticipant[],
  seed: number,
  iterations = 3000,
  weights: { wilaya: number; city: number; club: number } = PREFERENCE_WEIGHTS,
): { ordinals: number[]; score: number } {
  const n = participants.length;
  if (n < 2) {
    return { ordinals: Array.from({ length: n }, (_, i) => i), score: 0 };
  }
  const rng = mulberry32(seed);
  const size = nextPow2(n);
  const bits = max(1, Math.round(Math.log2(size)));

  const partnerSeed = (seedIdx: number): number => bitReverse(bitReverse(seedIdx, bits) ^ 1, bits);

  const score = (o: number[]): number => {
    let total = 0;
    for (let seedIdx = 0; seedIdx < n; seedIdx++) {
      const p = partnerSeed(seedIdx);
      if (p < n && p > seedIdx) {
        total += pairPenalty(participants[o[seedIdx]!]!, participants[o[p]!]!, weights);
      }
    }
    return total;
  };

  let ordinals: number[] = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ordinals[i], ordinals[j]] = [ordinals[j]!, ordinals[i]!];
  }
  let best = { ordinals: [...ordinals], score: score(ordinals) };

  for (let it = 0; it < iterations; it++) {
    const a = Math.floor(rng() * n);
    let b = Math.floor(rng() * n);
    if (b === a) b = (a + 1) % n;
    [ordinals[a], ordinals[b]] = [ordinals[b]!, ordinals[a]!];
    const s = score(ordinals);
    if (s <= best.score) {
      best = { ordinals: [...ordinals], score: s };
      if (s === 0) break;
    } else {
      [ordinals[a], ordinals[b]] = [ordinals[b]!, ordinals[a]!];
    }
  }
  return { ordinals: best.ordinals, score: best.score };
}

/** High-level: optimise ordering then build the bracket. Deterministic per seed. */
export function generateBracket(
  participants: DrawParticipant[],
  opts: { bronze: boolean; seed: number },
): Bracket {
  const { ordinals } = optimiseOrder(participants, opts.seed);
  return buildBracketFromOrder(participants, ordinals, opts);
}

/**
 * Recompute audit counts for round-1 pairings from live match data.
 * Useful after a swap to get updated sameWilaya/sameCity/sameClub counts.
 */
export function computeAudit(
  round1Matches: Array<{
    round: number;
    status?: string;
    competitorAId: number | null;
    competitorBId: number | null;
  }>,
  participants: DrawParticipant[],
): { sameWilaya: number; sameCity: number; sameClub: number } {
  const byReg = new Map(participants.map((p) => [p.registrationId, p]));
  let sameWilaya = 0;
  let sameCity = 0;
  let sameClub = 0;
  for (const m of round1Matches) {
    if (m.status === 'BYE') continue;
    if (m.competitorAId == null || m.competitorBId == null) continue;
    const a = byReg.get(m.competitorAId);
    const b = byReg.get(m.competitorBId);
    if (!a || !b) continue;
    if (a.wilayaId != null && a.wilayaId === b.wilayaId) sameWilaya++;
    if (a.cityId != null && a.cityId === b.cityId) sameCity++;
    if (a.clubId != null && a.clubId === b.clubId) sameClub++;
  }
  return { sameWilaya, sameCity, sameClub };
}

function max(a: number, b: number): number {
  return a > b ? a : b;
}