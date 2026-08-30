import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCompetitionRankings } from './rankings.ts';

describe('computeCompetitionRankings', () => {
  it('computes individual podium, club rankings and wilaya rankings with bronze match', () => {
    const categories = [{ id: 1, name: 'Cadets - -55 kg (M)', gender: 'M' }];
    const registrations = [
      { id: 101, athleteId: 1, athleteName: 'Anis Belkacem', clubId: 1, clubName: 'AS Kabyle', wilayaId: 15, wilayaName: 'Tizi Ouzou', subDepartmentId: 1, status: 'REGISTERED' },
      { id: 102, athleteId: 2, athleteName: 'Tarek Ait Slimane', clubId: 2, clubName: 'MC Alger', wilayaId: 16, wilayaName: 'Alger', subDepartmentId: 1, status: 'REGISTERED' },
      { id: 103, athleteId: 3, athleteName: 'Mehdi Bouzid', clubId: 3, clubName: 'ES Sétif', wilayaId: 19, wilayaName: 'Sétif', subDepartmentId: 1, status: 'REGISTERED' },
      { id: 104, athleteId: 4, athleteName: 'Adam Mebarki', clubId: 4, clubName: 'MC Oran', wilayaId: 31, wilayaName: 'Oran', subDepartmentId: 1, status: 'REGISTERED' },
    ];

    // Semifinals (Round 1) + Final (Round 2) + Bronze match
    const matches = [
      // Semi 1: 101 vs 103 -> 101 wins
      { id: 1, competitionCategoryId: 1, round: 1, ordinal: 1, isBronze: false, competitorAId: 101, competitorBId: 103, winnerRegistrationId: 101, status: 'COMPLETED' },
      // Semi 2: 102 vs 104 -> 102 wins
      { id: 2, competitionCategoryId: 1, round: 1, ordinal: 2, isBronze: false, competitorAId: 102, competitorBId: 104, winnerRegistrationId: 102, status: 'COMPLETED' },
      // Final: 101 vs 102 -> 101 wins
      { id: 3, competitionCategoryId: 1, round: 2, ordinal: 1, isBronze: false, competitorAId: 101, competitorBId: 102, winnerRegistrationId: 101, status: 'COMPLETED' },
      // Bronze: 103 vs 104 -> 103 wins
      { id: 4, competitionCategoryId: 1, round: 1, ordinal: 3, isBronze: true, competitorAId: 103, competitorBId: 104, winnerRegistrationId: 103, status: 'COMPLETED' },
    ];

    const res = computeCompetitionRankings(categories, registrations, matches, {
      bronzeMatchEnabled: true,
      pointsConfig: { gold: 5, silver: 3, bronze: 1 },
    });

    // Category podium
    assert.equal(res.categories[0]?.podium.length, 4);
    assert.equal(res.categories[0]?.podium[0]?.athleteName, 'Anis Belkacem');
    assert.equal(res.categories[0]?.podium[0]?.medal, 'gold');
    assert.equal(res.categories[0]?.podium[1]?.athleteName, 'Tarek Ait Slimane');
    assert.equal(res.categories[0]?.podium[1]?.medal, 'silver');
    assert.equal(res.categories[0]?.podium[2]?.athleteName, 'Mehdi Bouzid');
    assert.equal(res.categories[0]?.podium[2]?.medal, 'bronze');

    // Clubs
    assert.equal(res.clubs[0]?.clubName, 'AS Kabyle');
    assert.equal(res.clubs[0]?.points, 5);
    assert.equal(res.clubs[1]?.clubName, 'MC Alger');
    assert.equal(res.clubs[1]?.points, 3);
    assert.equal(res.clubs[2]?.clubName, 'ES Sétif');
    assert.equal(res.clubs[2]?.points, 1);

    // Wilayas
    assert.equal(res.wilayas[0]?.wilayaName, 'Tizi Ouzou');
    assert.equal(res.wilayas[0]?.points, 5);
    assert.equal(res.wilayas[1]?.wilayaName, 'Alger');
    assert.equal(res.wilayas[1]?.points, 3);
  });

  it('awards bronze to both semi losers when bronzeMatchEnabled is false', () => {
    const categories = [{ id: 1, name: 'Seniors - -67 kg (M)', gender: 'M' }];
    const registrations = [
      { id: 201, athleteId: 10, athleteName: 'Fighter 1', clubId: 1, clubName: 'Club A', wilayaId: 16, wilayaName: 'Alger', subDepartmentId: 1, status: 'REGISTERED' },
      { id: 202, athleteId: 20, athleteName: 'Fighter 2', clubId: 1, clubName: 'Club A', wilayaId: 16, wilayaName: 'Alger', subDepartmentId: 1, status: 'REGISTERED' },
      { id: 203, athleteId: 30, athleteName: 'Fighter 3', clubId: 2, clubName: 'Club B', wilayaId: 31, wilayaName: 'Oran', subDepartmentId: 1, status: 'REGISTERED' },
      { id: 204, athleteId: 40, athleteName: 'Fighter 4', clubId: 2, clubName: 'Club B', wilayaId: 31, wilayaName: 'Oran', subDepartmentId: 1, status: 'REGISTERED' },
    ];

    const matches = [
      { id: 1, competitionCategoryId: 1, round: 1, ordinal: 1, isBronze: false, competitorAId: 201, competitorBId: 203, winnerRegistrationId: 201, status: 'COMPLETED' },
      { id: 2, competitionCategoryId: 1, round: 1, ordinal: 2, isBronze: false, competitorAId: 202, competitorBId: 204, winnerRegistrationId: 202, status: 'COMPLETED' },
      { id: 3, competitionCategoryId: 1, round: 2, ordinal: 1, isBronze: false, competitorAId: 201, competitorBId: 202, winnerRegistrationId: 201, status: 'COMPLETED' },
    ];

    const res = computeCompetitionRankings(categories, registrations, matches, {
      bronzeMatchEnabled: false,
    });

    const podium = res.categories[0]!.podium;
    assert.equal(podium.length, 4);
    assert.equal(podium[0]?.medal, 'gold');
    assert.equal(podium[1]?.medal, 'silver');
    assert.equal(podium[2]?.medal, 'bronze');
    assert.equal(podium[3]?.medal, 'bronze');
  });
});
