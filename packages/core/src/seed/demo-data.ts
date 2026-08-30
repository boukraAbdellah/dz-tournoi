// Demo seed data: clubs + athletes for testing.
// Extend this file to add competitions later.

export interface SeedClub {
  name: string;
  wilayaCode: number;
  communeNameFr: string;
  phone?: string;
}

export interface SeedAthlete {
  firstName: string;
  lastName: string;
  birthDate: string; // ISO yyyy-mm-dd
  gender: 'M' | 'F';
  weightKg: number | null;
  clubIndex: number; // 0-based index into SEED_CLUBS
  phone?: string;
}

// ── Clubs ─────────────────────────────────────────────────────────────────

export const SEED_CLUBS: SeedClub[] = [
  { name: 'AS Kabyle', wilayaCode: 15, communeNameFr: 'Tizi-Ouzou', phone: '0555001001' },
  { name: 'JS Djurdjura', wilayaCode: 6, communeNameFr: 'Bejaia', phone: '0555001002' },
  { name: 'MC Alger', wilayaCode: 16, communeNameFr: 'Alger Centre', phone: '0555001003' },
  { name: 'USM Alger', wilayaCode: 16, communeNameFr: 'Hussein Dey', phone: '0555001004' },
  { name: 'CR Belouizdad', wilayaCode: 16, communeNameFr: 'Mohamed Belouzdad', phone: '0555001005' },
  { name: 'ES Sétif', wilayaCode: 19, communeNameFr: 'Setif', phone: '0555001006' },
  { name: 'JS Kabylie', wilayaCode: 15, communeNameFr: 'Tizi-Ouzou', phone: '0555001007' },
  { name: 'MO Béjaïa', wilayaCode: 6, communeNameFr: 'Bejaia', phone: '0555001008' },
  { name: 'ASO Chlef', wilayaCode: 2, communeNameFr: 'Chlef', phone: '0555001009' },
  { name: 'US Biskra', wilayaCode: 7, communeNameFr: 'Biskra', phone: '0555001010' },
  { name: 'MC Oran', wilayaCode: 31, communeNameFr: 'Oran', phone: '0555001011' },
  { name: 'USM Oran', wilayaCode: 31, communeNameFr: 'Oran', phone: '0555001012' },
  { name: 'CA Batna', wilayaCode: 5, communeNameFr: 'Batna', phone: '0555001013' },
  { name: 'AB Tlemcen', wilayaCode: 13, communeNameFr: 'Tlemcen', phone: '0555001014' },
  { name: 'IRB Mouzaïa', wilayaCode: 9, communeNameFr: 'Mouzaia', phone: '0555001015' },
  { name: 'JS Djelfa', wilayaCode: 17, communeNameFr: 'Djelfa', phone: '0555001016' },
  { name: 'US Constantine', wilayaCode: 25, communeNameFr: 'Constantine', phone: '0555001017' },
  { name: 'MB Tlemcen', wilayaCode: 13, communeNameFr: 'Tlemcen', phone: '0555001018' },
  { name: 'HB Chelghoum Laïd', wilayaCode: 43, communeNameFr: 'Chelghoum Laid', phone: '0555001019' },
  { name: 'CRB Tlemcen', wilayaCode: 13, communeNameFr: 'Tlemcen', phone: '0555001020' },
];

// ── Athletes ──────────────────────────────────────────────────────────────
// clubIndex refers to SEED_CLUBS[clubIndex]
// birthDates spread across age categories to test auto-assignment

export const SEED_ATHLETES: SeedAthlete[] = [
  // ── Karate Seniors (age 21+) ──
  { firstName: 'Mohamed', lastName: 'Benali', birthDate: '2000-03-15', gender: 'M', weightKg: 67, clubIndex: 0, phone: '0661001001' },
  { firstName: 'Youcef', lastName: 'Khelifi', birthDate: '1998-07-22', gender: 'M', weightKg: 75, clubIndex: 2, phone: '0661001002' },
  { firstName: 'Amine', lastName: 'Bouzid', birthDate: '2001-11-08', gender: 'M', weightKg: 84, clubIndex: 5, phone: '0661001003' },
  { firstName: 'Rachid', lastName: 'Mebarki', birthDate: '1995-01-30', gender: 'M', weightKg: 55, clubIndex: 8, phone: '0661001004' },
  { firstName: 'Samir', lastName: 'Charef', birthDate: '1999-06-12', gender: 'M', weightKg: 60, clubIndex: 10, phone: '0661001005' },
  { firstName: 'Karim', lastName: 'Djaballah', birthDate: '2002-09-03', gender: 'M', weightKg: 68, clubIndex: 12, phone: '0661001006' },
  { firstName: 'Nabil', lastName: 'Hamdi', birthDate: '1997-04-18', gender: 'M', weightKg: 72, clubIndex: 14, phone: '0661001007' },
  { firstName: 'Hichem', lastName: 'Aoudia', birthDate: '2000-12-25', gender: 'M', weightKg: 78, clubIndex: 16, phone: '0661001008' },
  { firstName: 'Farid', lastName: 'Zeroual', birthDate: '1996-08-05', gender: 'M', weightKg: 58, clubIndex: 1, phone: '0661001009' },
  { firstName: 'Adel', lastName: 'Bensemmane', birthDate: '2003-02-14', gender: 'M', weightKg: 63, clubIndex: 3, phone: '0661001010' },
  { firstName: 'Sofiane', lastName: 'Ait Ali', birthDate: '1994-10-20', gender: 'M', weightKg: 88, clubIndex: 6, phone: '0661001011' },
  { firstName: 'Redouane', lastName: 'Bouziane', birthDate: '2001-05-09', gender: 'M', weightKg: 52, clubIndex: 9, phone: '0661001012' },
  { firstName: 'Ilyes', lastName: 'Ghezali', birthDate: '1999-03-28', gender: 'M', weightKg: 48, clubIndex: 11, phone: '0661001013' },
  { firstName: 'Zakaria', lastName: 'Mansouri', birthDate: '2000-07-16', gender: 'M', weightKg: 70, clubIndex: 13, phone: '0661001014' },
  { firstName: 'Omar', lastName: 'Taleb', birthDate: '1998-11-02', gender: 'M', weightKg: 82, clubIndex: 15, phone: '0661001015' },

  // ── Karate Seniors Females ──
  { firstName: 'Amina', lastName: 'Hadj', birthDate: '2001-04-12', gender: 'F', weightKg: 55, clubIndex: 0, phone: '0662001001' },
  { firstName: 'Fatima', lastName: 'Zohra', birthDate: '1999-08-20', gender: 'F', weightKg: 61, clubIndex: 2, phone: '0662001002' },
  { firstName: 'Nadia', lastName: 'Boukrouba', birthDate: '2000-01-05', gender: 'F', weightKg: 68, clubIndex: 5, phone: '0662001003' },
  { firstName: 'Lina', lastName: 'Ait Ahmed', birthDate: '2002-06-18', gender: 'F', weightKg: 50, clubIndex: 7, phone: '0662001004' },
  { firstName: 'Yasmine', lastName: 'Benaissa', birthDate: '1997-12-01', gender: 'F', weightKg: 57, clubIndex: 10, phone: '0662001005' },
  { firstName: 'Sabrina', lastName: 'Mansouri', birthDate: '2003-03-22', gender: 'F', weightKg: 45, clubIndex: 12, phone: '0662001006' },
  { firstName: 'Houda', lastName: 'Cherif', birthDate: '1998-09-14', gender: 'F', weightKg: 63, clubIndex: 14, phone: '0662001007' },
  { firstName: 'Meriem', lastName: 'Bouazza', birthDate: '2001-02-28', gender: 'F', weightKg: 52, clubIndex: 16, phone: '0662001008' },

  // ── Karate Cadets (14-15) ──
  { firstName: 'Anis', lastName: 'Belkacem', birthDate: '2011-05-10', gender: 'M', weightKg: 45, clubIndex: 0, phone: '0663001001' },
  { firstName: 'Tarek', lastName: 'Ait Slimane', birthDate: '2012-03-25', gender: 'M', weightKg: 52, clubIndex: 1, phone: '0663001002' },
  { firstName: 'Rayan', lastName: 'Khelifi', birthDate: '2010-11-18', gender: 'M', weightKg: 58, clubIndex: 2, phone: '0663001003' },
  { firstName: 'Mehdi', lastName: 'Bouzid', birthDate: '2011-07-02', gender: 'M', weightKg: 48, clubIndex: 3, phone: '0663001004' },
  { firstName: 'Adam', lastName: 'Mebarki', birthDate: '2012-01-15', gender: 'M', weightKg: 42, clubIndex: 4, phone: '0663001005' },
  { firstName: 'Ines', lastName: 'Hadj', birthDate: '2011-09-08', gender: 'F', weightKg: 40, clubIndex: 0, phone: '0663001006' },
  { firstName: 'Lamia', lastName: 'Bouazza', birthDate: '2010-06-20', gender: 'F', weightKg: 47, clubIndex: 2, phone: '0663001007' },
  { firstName: 'Mariem', lastName: 'Cherif', birthDate: '2012-04-03', gender: 'F', weightKg: 53, clubIndex: 5, phone: '0663001008' },

  // ── Karate Juniors (16-17) ──
  { firstName: 'Walid', lastName: 'Aoudia', birthDate: '2009-02-12', gender: 'M', weightKg: 60, clubIndex: 6, phone: '0664001001' },
  { firstName: 'Bilal', lastName: 'Zeroual', birthDate: '2009-08-30', gender: 'M', weightKg: 65, clubIndex: 7, phone: '0664001002' },
  { firstName: 'Yacine', lastName: 'Bensemmane', birthDate: '2010-01-05', gender: 'M', weightKg: 55, clubIndex: 8, phone: '0664001003' },
  { firstName: 'Imed', lastName: 'Ghezali', birthDate: '2009-05-18', gender: 'M', weightKg: 70, clubIndex: 9, phone: '0664001004' },
  { firstName: 'Salim', lastName: 'Taleb', birthDate: '2010-10-22', gender: 'M', weightKg: 48, clubIndex: 10, phone: '0664001005' },
  { firstName: 'Dalila', lastName: 'Ait Ali', birthDate: '2009-12-10', gender: 'F', weightKg: 55, clubIndex: 6, phone: '0664001006' },
  { firstName: 'Asma', lastName: 'Boukrouba', birthDate: '2010-04-28', gender: 'F', weightKg: 60, clubIndex: 8, phone: '0664001007' },
  { firstName: 'Radia', lastName: 'Benaissa', birthDate: '2009-07-14', gender: 'F', weightKg: 45, clubIndex: 11, phone: '0664001008' },

  // ── Karate Minimes (12-13) ──
  { firstName: 'Khaled', lastName: 'Ait Yahia', birthDate: '2013-03-08', gender: 'M', weightKg: 38, clubIndex: 0, phone: '0665001001' },
  { firstName: 'Samy', lastName: 'Bouzian', birthDate: '2013-09-15', gender: 'M', weightKg: 42, clubIndex: 1, phone: '0665001002' },
  { firstName: 'Younes', lastName: 'Mansouri', birthDate: '2014-01-22', gender: 'M', weightKg: 35, clubIndex: 2, phone: '0665001003' },
  { firstName: 'Islam', lastName: 'Boumiza', birthDate: '2012-06-30', gender: 'M', weightKg: 45, clubIndex: 3, phone: '0665001004' },
  { firstName: 'Nour', lastName: 'Hadj', birthDate: '2013-11-12', gender: 'F', weightKg: 36, clubIndex: 0, phone: '0665001005' },
  { firstName: 'Rania', lastName: 'Cherif', birthDate: '2014-04-05', gender: 'F', weightKg: 40, clubIndex: 2, phone: '0665001006' },

  // ── Athletes WITHOUT weight (to test unresolved) ──
  { firstName: 'Rachid', lastName: 'Slimani', birthDate: '1999-06-10', gender: 'M', weightKg: null, clubIndex: 4, phone: '0666001001' },
  { firstName: 'Zineb', lastName: 'Bouzid', birthDate: '2001-08-22', gender: 'F', weightKg: null, clubIndex: 6, phone: '0666001002' },
  { firstName: 'Tarek', lastName: 'Ait Ali', birthDate: '2011-03-18', gender: 'M', weightKg: null, clubIndex: 8, phone: '0666001003' },

  // ── Athletes OUTSIDE age ranges (to test unresolved) ──
  { firstName: 'Abdelkader', lastName: 'Bouhenna', birthDate: '1980-05-15', gender: 'M', weightKg: 75, clubIndex: 10, phone: '0667001001' },
  { firstName: 'Fatima', lastName: 'Zerhouni', birthDate: '2015-09-01', gender: 'F', weightKg: 30, clubIndex: 12, phone: '0667001002' },

  // ── Karate Cadets Male -55 kg (for draw testing, 16 athletes) ──
  { firstName: 'Anis', lastName: 'Belkacem', birthDate: '2011-05-10', gender: 'M', weightKg: 51, clubIndex: 0, phone: '0668001001' },
  { firstName: 'Tarek', lastName: 'Ait Slimane', birthDate: '2012-03-25', gender: 'M', weightKg: 53, clubIndex: 2, phone: '0668001002' },
  { firstName: 'Mehdi', lastName: 'Bouzid', birthDate: '2011-07-02', gender: 'M', weightKg: 50, clubIndex: 3, phone: '0668001003' },
  { firstName: 'Adam', lastName: 'Mebarki', birthDate: '2012-01-15', gender: 'M', weightKg: 54, clubIndex: 4, phone: '0668001004' },
  { firstName: 'Khaled', lastName: 'Ait Yahia', birthDate: '2011-09-18', gender: 'M', weightKg: 52, clubIndex: 6, phone: '0668001005' },
  { firstName: 'Samy', lastName: 'Bouzian', birthDate: '2012-06-30', gender: 'M', weightKg: 55, clubIndex: 8, phone: '0668001006' },
  { firstName: 'Younes', lastName: 'Mansouri', birthDate: '2011-11-12', gender: 'M', weightKg: 51, clubIndex: 10, phone: '0668001007' },
  { firstName: 'Islam', lastName: 'Boumiza', birthDate: '2012-04-05', gender: 'M', weightKg: 53, clubIndex: 12, phone: '0668001008' },
  { firstName: 'Ryad', lastName: 'Charef', birthDate: '2011-02-20', gender: 'M', weightKg: 50, clubIndex: 14, phone: '0668001009' },
  { firstName: 'Abderrahmane', lastName: 'Djamel', birthDate: '2012-08-14', gender: 'M', weightKg: 54, clubIndex: 1, phone: '0668001010' },
  { firstName: 'Walid', lastName: 'Ghezali', birthDate: '2011-12-01', gender: 'M', weightKg: 52, clubIndex: 3, phone: '0668001011' },
  { firstName: 'Bilal', lastName: 'Zeroual', birthDate: '2012-07-18', gender: 'M', weightKg: 55, clubIndex: 5, phone: '0668001012' },
  { firstName: 'Yacine', lastName: 'Bensemmane', birthDate: '2011-04-22', gender: 'M', weightKg: 51, clubIndex: 7, phone: '0668001013' },
  { firstName: 'Imed', lastName: 'Taleb', birthDate: '2012-10-08', gender: 'M', weightKg: 53, clubIndex: 9, phone: '0668001014' },
  { firstName: 'Salim', lastName: 'Aoudia', birthDate: '2011-08-30', gender: 'M', weightKg: 50, clubIndex: 11, phone: '0668001015' },
  { firstName: 'Hichem', lastName: 'Khelifi', birthDate: '2012-02-14', gender: 'M', weightKg: 54, clubIndex: 13, phone: '0668001016' },

  // ── Karate Cadets Male -60 kg (for draw testing, 16 athletes) ──
  { firstName: 'Rayan', lastName: 'Hadj', birthDate: '2011-06-15', gender: 'M', weightKg: 57, clubIndex: 2, phone: '0668002001' },
  { firstName: 'Nassim', lastName: 'Cherif', birthDate: '2012-09-03', gender: 'M', weightKg: 59, clubIndex: 0, phone: '0668002002' },
  { firstName: 'Redouane', lastName: 'Bouziane', birthDate: '2011-01-28', gender: 'M', weightKg: 56, clubIndex: 3, phone: '0668002003' },
  { firstName: 'Zakaria', lastName: 'Mansouri', birthDate: '2012-05-10', gender: 'M', weightKg: 60, clubIndex: 4, phone: '0668002004' },
  { firstName: 'Ahmed', lastName: 'Benaissa', birthDate: '2011-10-22', gender: 'M', weightKg: 58, clubIndex: 6, phone: '0668002005' },
  { firstName: 'Fouad', lastName: 'Hamdi', birthDate: '2012-03-14', gender: 'M', weightKg: 57, clubIndex: 8, phone: '0668002006' },
  { firstName: 'Rachid', lastName: 'Slimani', birthDate: '2011-07-05', gender: 'M', weightKg: 59, clubIndex: 10, phone: '0668002007' },
  { firstName: 'Omar', lastName: 'Aoudia', birthDate: '2012-11-19', gender: 'M', weightKg: 56, clubIndex: 12, phone: '0668002008' },
  { firstName: 'Karim', lastName: 'Bouzid', birthDate: '2011-03-08', gender: 'M', weightKg: 60, clubIndex: 14, phone: '0668002009' },
  { firstName: 'Adel', lastName: 'Bensemmane', birthDate: '2012-06-25', gender: 'M', weightKg: 58, clubIndex: 1, phone: '0668002010' },
  { firstName: 'Sofiane', lastName: 'Ait Ali', birthDate: '2011-12-12', gender: 'M', weightKg: 57, clubIndex: 5, phone: '0668002011' },
  { firstName: 'Farid', lastName: 'Zeroual', birthDate: '2012-08-01', gender: 'M', weightKg: 59, clubIndex: 7, phone: '0668002012' },
  { firstName: 'Samir', lastName: 'Bouzian', birthDate: '2011-05-18', gender: 'M', weightKg: 56, clubIndex: 9, phone: '0668002013' },
  { firstName: 'Abdelkader', lastName: 'Mebarki', birthDate: '2012-01-30', gender: 'M', weightKg: 60, clubIndex: 11, phone: '0668002014' },
  { firstName: 'Mounir', lastName: 'Khelifi', birthDate: '2011-09-14', gender: 'M', weightKg: 58, clubIndex: 13, phone: '0668002015' },
  { firstName: 'Nassim', lastName: 'Djamel', birthDate: '2012-04-28', gender: 'M', weightKg: 57, clubIndex: 15, phone: '0668002016' },
];
