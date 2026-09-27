import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findCategory,
  findResolvableCategory,
  type CategoryDefinition,
  type AgeCategoryCriteria,
  type WeightDivisionCriteria,
  type ResolvableCategory,
} from './categories.ts';

test('findCategory (map-based lookup)', async (t) => {
  const cats: CategoryDefinition[] = [
    { id: 101, gender: 'M', ageCategoryId: 1, weightDivisionId: 10, enabled: true },
    { id: 102, gender: 'M', ageCategoryId: 1, weightDivisionId: 11, enabled: true },
    { id: 103, gender: 'F', ageCategoryId: 1, weightDivisionId: 12, enabled: true },
    { id: 104, gender: 'M', ageCategoryId: 2, weightDivisionId: 13, enabled: false }, // disabled
    { id: 105, gender: 'M', ageCategoryId: 3, weightDivisionId: 14, enabled: true }, // open age max
  ];

  const ageCatMap = new Map<number, AgeCategoryCriteria>([
    [1, { minAge: 18, maxAge: 21 }],
    [2, { minAge: 22, maxAge: 35 }],
    [3, { minAge: 36, maxAge: null }], // open upper age bound
  ]);

  const weightMap = new Map<number, WeightDivisionCriteria>([
    [10, { minKg: null, maxKg: 60 }], // -60kg
    [11, { minKg: 60.1, maxKg: 70 }], // 60.1-70kg
    [12, { minKg: null, maxKg: 55 }], // -55kg female
    [13, { minKg: 70.1, maxKg: 80 }],
    [14, { minKg: 80.1, maxKg: null }], // +80.1kg open upper weight
  ]);

  await t.test('resolves exact match within age and weight bounds', () => {
    const result = findCategory(cats, ageCatMap, weightMap, 'M', 20, 58);
    assert.equal(result, 101);
  });

  await t.test('resolves boundary values inclusive', () => {
    // min age 18, max weight 60
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 18, 60), 101);
    // max age 21, min weight 60.1
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 21, 60.1), 102);
  });

  await t.test('returns null if weight is null', () => {
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 20, null), null);
  });

  await t.test('filters strictly by gender', () => {
    // Age 20, weight 50: Male matches 101, Female matches 103
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 20, 50), 101);
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'F', 20, 50), 103);
  });

  await t.test('skips disabled categories', () => {
    // Age 25, weight 75 matches category 104, but it is disabled
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 25, 75), null);
  });

  await t.test('handles open upper age and weight bounds (null max)', () => {
    // Age 45 (minAge 36, maxAge null), weight 95 (minKg 80.1, maxKg null)
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 45, 95), 105);
  });

  await t.test('returns null when athlete is too young or weight exceeds divisions', () => {
    // Too young (16 < 18)
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 16, 55), null);
    // Weight out of any male category for age 20 (75kg doesn't fit -60 or 60.1-70)
    assert.equal(findCategory(cats, ageCatMap, weightMap, 'M', 20, 75), null);
  });
});

test('findResolvableCategory (flattened categories)', async (t) => {
  const flatCats: ResolvableCategory[] = [
    { id: 201, gender: 'M', minAge: 16, maxAge: 17, minKg: null, maxKg: 65, enabled: true },
    { id: 202, gender: 'M', minAge: 16, maxAge: 17, minKg: 65.1, maxKg: 75, enabled: true },
    { id: 203, gender: 'M', minAge: 16, maxAge: 17, minKg: 75.1, maxKg: null, enabled: false }, // disabled
  ];

  await t.test('resolves matching flat category', () => {
    assert.equal(findResolvableCategory(flatCats, 'M', 16, 62), 201);
    assert.equal(findResolvableCategory(flatCats, 'M', 17, 70), 202);
  });

  await t.test('skips disabled flat category', () => {
    assert.equal(findResolvableCategory(flatCats, 'M', 16, 80), null);
  });

  await t.test('returns null when weight is null or gender differs', () => {
    assert.equal(findResolvableCategory(flatCats, 'M', 16, null), null);
    assert.equal(findResolvableCategory(flatCats, 'F', 16, 62), null);
  });
});
