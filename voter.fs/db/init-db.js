const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'voter.db');
const db = new Database(dbPath);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);
console.log(`Database ready at ${dbPath}`);

const candidateCount = db.prepare('SELECT COUNT(*) AS n FROM candidates').get().n;

if (candidateCount === 0) {
  const insertCandidate = db.prepare(`
    INSERT INTO candidates (id, initials, name, party, description, experience, vision, fiscal, agriculture, governance, cost_of_living)
    VALUES (@id, @initials, @name, @party, @description, @experience, @vision, @fiscal, @agriculture, @governance, @cost_of_living)
  `);

  const candidates = [
    {
      id: 'ruto',
      initials: 'WR',
      name: 'Dr. William Ruto',
      party: 'Kenya Kwanza Alliance / UDA',
      description: 'Focusing on economic transformation through a bottom-up economic agenda, prioritizing agricultural subsidies, digital infrastructure expansion, and micro-SME financial structures.',
      experience: 'Current President of Kenya (2022-2026), former Deputy President (2013-2022).',
      vision: 'The Bottom-Up Economic Transformation Agenda (BETA), aimed at empowering ordinary citizens.',
      fiscal: 'Expanding the formal tax base to manage public debt, alongside a broad-based coalition government approach.',
      agriculture: 'Subsidized farm inputs and fertilizer distribution, with support for local manufacturing value-chains.',
      governance: 'Protecting and increasing funding to the 47 counties, plus reforms aimed at judicial independence.',
      cost_of_living: 'Cutting consumer levies and production taxes, with subsidies on basic commodities.'
    },
    {
      id: 'kalonzo',
      initials: 'KM',
      name: 'Stephen Kalonzo Musyoka',
      party: 'Azimio la Umoja / Wiper',
      description: 'Centering his campaign platform on strict constitutional compliance, judicial independence, multi-sectoral devolution frameworks, and aggressive anti-corruption initiatives.',
      experience: 'Former Vice President of Kenya (2008-2013), veteran diplomat, and Minister for Foreign Affairs.',
      vision: 'Development grounded in rule of law, anti-corruption efforts, and protecting local industry.',
      fiscal: 'Restructuring external loans, cutting commercial borrowing, and offering tax relief for small businesses.',
      agriculture: 'Irrigation projects across arid and semi-arid regions to reduce dependence on rainfall for farming.',
      governance: 'Strengthening separation of powers and oversight bodies, with more resource control devolved to counties.',
      cost_of_living: 'Removing manufacturing fuel levies to lower production costs and retail prices.'
    },
    {
      id: 'matiangi',
      initials: 'FM',
      name: "Dr. Fred Matiang'i",
      party: 'Independent Platform',
      description: 'Emphasizing security sector stabilization, sweeping administrative efficiency, public institutional accountability, and aggressive infrastructural development grids.',
      experience: 'Former Cabinet Secretary for Interior and Coordination of National Government, Education, and ICT.',
      vision: 'A disciplined, streamlined civil service using digital tools for better public service delivery.',
      fiscal: 'Capping recurrent public spending while closing revenue leaks inside state corporations.',
      agriculture: 'Modernizing crop transport logistics to cut post-harvest losses for rural communities.',
      governance: 'Reducing bureaucratic bottlenecks by setting up integrated digital administrative hubs.',
      cost_of_living: 'Enforcing fair pricing rules across supply chains to cut out predatory middlemen.'
    },
    {
      id: 'maraga',
      initials: 'DM',
      name: 'David Kenani Maraga',
      party: 'Judicial Integrity Coalition',
      description: 'Championing institutional sanitization, sweeping legal reforms, systemic constitutional defense mechanisms, and structural rule of law restorations.',
      experience: 'Retired 14th Chief Justice of Kenya (2016-2021), historic defender of judicial independence.',
      vision: 'A society built on institutional ethics, justice, and equality before the law.',
      fiscal: 'Auditing mega-infrastructure spending from prior regimes to recover embezzled public funds.',
      agriculture: 'Setting up agricultural tribunals to resolve long-running land tenure disputes.',
      governance: 'Strict enforcement of Chapter Six of the Constitution on leadership and integrity.',
      cost_of_living: 'Subsidizing judicial access and protecting consumers from cartels through antitrust enforcement.'
    }
  ];

  for (const c of candidates) insertCandidate.run(c);
  console.log(`Seeded ${candidates.length} candidates.`);
} else {
  console.log(`candidates table already has ${candidateCount} row(s), skipping candidate seed.`);
}

const reviewCount = db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n;

if (reviewCount === 0) {
  const insertReview = db.prepare(`
    INSERT INTO reviews (candidate_id, user, rating, text, date)
    VALUES (@candidate_id, @user, @rating, @text, @date)
  `);

  insertReview.run({
    candidate_id: 'ruto',
    user: 'Anonymous Voter',
    rating: 4,
    text: "Clear focus on devolution structural systems, but need more clarity on agricultural subsidy time-tables.",
    date: '2026-06-25'
  });

  console.log('Seeded 1 starter review.');
} else {
  console.log(`reviews table already has ${reviewCount} row(s), skipping review seed.`);
}

// Calculation for API later.
console.log('\nComputed ratings (candidate_ratings view):');
console.log(db.prepare('SELECT * FROM candidate_ratings').all());

db.close();