// Polling stations used by GET /api/polling-stations.
//
// IMPORTANT: this is NOT the official IEBC register.
//  - Stations marked verified: true were copied from the IEBC polling station
//    list (Westlands constituency, Parklands/Highridge ward).
//  - Every other station is a team sample that has not been checked against
//    the IEBC register (verified: false). Check a name on the IEBC site, then
//    mark it verified.
//  - Coordinates are approximate: one point per area, not the school gate.
//    They are only used to find the nearest Group 10 landmark, because
//    Group 10's /rides endpoint only understands its own landmarks.
//
// To add a station: add a name to an area below (append, do not reorder, so
// the generated ids stay stable). To make a station verified, write it as
// { name: '...', verified: true }.

const AREAS = [
  {
    area: 'Westlands',
    constituency: 'Westlands',
    ward: null,
    location: { lat: -1.2673, lng: 36.8118 },
    stations: [
      { name: 'Westlands Primary School', verified: true, ward: 'Parklands/Highridge' },
      { name: 'Visa Oshwal Primary School', verified: true, ward: 'Parklands/Highridge' },
      { name: 'Muguga Green Primary School', verified: true, ward: 'Parklands/Highridge' },
      { name: 'Bhora Primary School', verified: true, ward: 'Parklands/Highridge' },
      { name: 'Hospital Hill Primary School', verified: true, ward: 'Parklands/Highridge' },
      'Consolata Shrine Primary School'
    ]
  },
  {
    area: 'Parklands',
    constituency: 'Westlands',
    ward: 'Parklands/Highridge',
    location: { lat: -1.2630, lng: 36.8180 },
    stations: [
      'City Primary School',
      'Parklands Primary School',
      'Highridge Primary School',
      'Aga Khan Primary School'
    ]
  },
  {
    area: 'CBD',
    constituency: 'Starehe',
    ward: 'Nairobi Central',
    location: { lat: -1.2864, lng: 36.8172 },
    stations: [
      'Moi Avenue Primary School',
      "St. Peter Clavers Primary School",
      'Muthurwa Primary School'
    ]
  },
  {
    area: 'Kilimani',
    constituency: 'Dagoretti North',
    ward: 'Kilimani',
    location: { lat: -1.2900, lng: 36.7850 },
    stations: [
      'Kilimani Primary School',
      'Nairobi Primary School',
      "St. George's Primary School",
      'Milimani Primary School',
      'Muthangari Primary School'
    ]
  },
  {
    area: 'Karen',
    constituency: "Lang'ata",
    ward: 'Karen',
    location: { lat: -1.3197, lng: 36.7107 },
    stations: [
      "Karen 'C' Primary School",
      "St. Mary's Primary School (Karen)",
      'Ngong Forest Primary School'
    ]
  },
  {
    area: 'Eastleigh',
    constituency: 'Kamukunji',
    ward: null,
    location: { lat: -1.2740, lng: 36.8500 },
    stations: [
      'Eastleigh High School',
      'Airbase Primary School',
      "St. Teresa's Girls Primary School",
      'Maina Wanjigi Secondary School'
    ]
  },
  {
    area: 'Lavington',
    constituency: 'Dagoretti North',
    ward: null,
    location: { lat: -1.2780, lng: 36.7700 },
    stations: [
      'Lavington Primary School',
      "St. Austin's Primary School"
    ]
  },
  {
    area: 'Upper Hill',
    constituency: null,
    ward: null,
    location: { lat: -1.2970, lng: 36.8160 },
    stations: [
      'Upper Hill Secondary School'
    ]
  },
  {
    area: 'Gigiri and Runda',
    constituency: 'Westlands',
    ward: 'Karura',
    location: { lat: -1.2330, lng: 36.8050 },
    stations: [
      'Gigiri Primary School',
      'Cheleta Primary School',
      'Karura Forest Primary School'
    ]
  },
  {
    area: 'Ruaka',
    county: 'Kiambu',
    constituency: 'Kiambaa',
    ward: 'Karuri',
    location: { lat: -1.2085, lng: 36.7765 },
    stations: [
      'Ruaka Primary School',
      'Gacharage Primary School',
      'Karuri Primary School'
    ]
  },
  {
    area: 'Roysambu and Kahawa West',
    constituency: 'Roysambu',
    ward: null,
    location: { lat: -1.2150, lng: 36.8950 },
    stations: [
      'Roysambu Primary School',
      'Garden Estate Primary School',
      'Marurui Primary School',
      'Thika Road Primary School',
      'Kahawa West Primary School'
    ]
  },
  {
    area: 'Kasarani',
    constituency: 'Kasarani',
    ward: 'Kasarani',
    location: { lat: -1.2200, lng: 36.8970 },
    stations: [
      'Kasarani Primary School',
      'Clay City Primary School',
      'Mwiki Primary School'
    ]
  },
  {
    area: 'Ngong Road',
    constituency: null,
    ward: null,
    location: { lat: -1.3000, lng: 36.7900 },
    stations: [
      "Joseph Kang'ethe Primary School",
      'Jamhuri High School',
      'Toi Primary School',
      'Kibera Primary School'
    ]
  },
  {
    area: 'South B',
    constituency: 'Starehe',
    ward: null,
    location: { lat: -1.3070, lng: 36.8330 },
    stations: [
      'Our Lady of Mercy Primary School (South B)',
      'St. Catherine Primary School',
      'South B Muslim Primary School'
    ]
  },
  {
    area: 'South C',
    constituency: "Lang'ata",
    ward: 'South C',
    location: { lat: -1.3290, lng: 36.8260 },
    stations: [
      'Kongoni Primary School',
      'Muungano Primary School',
      'Nairobi West Primary School'
    ]
  },
  {
    area: 'Kileleshwa',
    constituency: 'Dagoretti North',
    ward: 'Kileleshwa',
    location: { lat: -1.2780, lng: 36.7840 },
    stations: [
      'Kileleshwa Primary School',
      'Kenya High School',
      'State House Primary School'
    ]
  },
  {
    area: "Lang'ata",
    constituency: "Lang'ata",
    ward: null,
    location: { lat: -1.3420, lng: 36.7490 },
    stations: [
      "Lang'ata High School",
      'Uhuru Gardens Primary School',
      "Lang'ata Road Primary School"
    ]
  },
  {
    area: 'Embakasi',
    constituency: null,
    ward: null,
    location: { lat: -1.3050, lng: 36.9000 },
    stations: [
      'Embakasi Primary School'
    ]
  },
  {
    area: 'Donholm and Umoja',
    constituency: 'Embakasi West',
    ward: null,
    location: { lat: -1.2950, lng: 36.8900 },
    stations: [
      'Donholm Primary School',
      'Umoja Primary School',
      'Tumaini Primary School',
      'Unity Primary School'
    ]
  },
  {
    area: 'Buruburu',
    constituency: 'Makadara',
    ward: null,
    location: { lat: -1.2850, lng: 36.8750 },
    stations: [
      'Buruburu 1 Primary School',
      'Rabai Road Primary School',
      'Harambee Primary School'
    ]
  },
  {
    area: 'Madaraka',
    constituency: "Lang'ata",
    ward: 'Nairobi West',
    location: { lat: -1.3090, lng: 36.8130 },
    stations: [
      'Madaraka Primary School'
    ]
  }
];

const POLLING_STATIONS = [];
for (const group of AREAS) {
  for (const entry of group.stations) {
    const s = typeof entry === 'string' ? { name: entry } : entry;
    const n = POLLING_STATIONS.length + 1;
    POLLING_STATIONS.push({
      id: `ps_${String(n).padStart(3, '0')}`,
      name: s.name,
      area: group.area,
      county: group.county || 'Nairobi City',
      constituency: group.constituency,
      ward: s.ward !== undefined ? s.ward : group.ward,
      location: { lat: group.location.lat, lng: group.location.lng },
      locationApproximate: true,
      verified: s.verified === true
    });
  }
}

module.exports = POLLING_STATIONS;