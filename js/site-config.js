/**
 * Settings you are likely to change. Everything else is driven by works-data.js
 * and works-photography.js.
 */
window.SITE_CONFIG = {
  // The home page hero cuts "nuances." out of a slideshow: these works open it, in this order,
  // and then every other visible work in these categories follows.
  heroLead: ['A012', 'A002', 'A003', 'A030'],
  heroCategories: ['painting', 'print'],

  // The gallery's order within a medium, best first: listed works lead in this order, the rest follow
  // (newest first). Horizon's prints hang together on the wall wherever the first of them falls.
  galleryOrder: {
    print: ['A019', 'A020', 'A021', 'A022', 'A023', 'A024', 'A027', 'A025', 'A026'],
    design: [
      'flyer-mindfulness', 'flyer-hsa-trip', 'flyer-meet-daniel-collins', 'flyer-ash-wednesday', 'flyer-chicken-fingers',
      'sangam-team', 'sangam-vice-president', 'sangam-secretary', 'sangam-treasurer', 'sangam-photographer',
    ],
  },

  // The big "Latest work" feature on the home page.
  latestId: 'A041',

  // "Selected work" on the home page, in this order: the artworks of 2025 and 2026 worth leading with. Photographs
  // and ceramics are shown in their own sections of the gallery; the six Horizon monotypes stay in their series.
  selectedIds: [
    'A042', 'A010', 'A017', 'A028', 'A012', 'A041', 'A030', 'A027', 'A018', 'A011', 'A043', 'A014',
  ],

  // Kept off the gallery's grid view, but still hung on the wall and shown in Three Ways of Seeing: two of
  // the three still-life drawings, which only make sense beside the others.
  gridHiddenIds: ['A008', 'A009'],

  // "Browse by medium" on the home page shows one work beside each medium. A visitor's first home page in a
  // session shows each `best`; after that every visit shows a random work from the same medium. A medium
  // without a `best` (photography) always shows a random one.
  mediumPicks: [
    { category: 'painting', best: 'A043' },
    { category: 'print', best: 'A027' },
    { category: 'ceramics', best: 'ceramics9' },
    { category: 'digital', best: 'A014' },
    { category: 'design', best: 'flyer-mindfulness' },
    { category: 'drawing', best: 'A007' },
    { category: 'photography' },
  ],

  // Shown as live clocks on the contact page; timeZone is an IANA name.
  places: [
    { label: 'Gettysburg', timeZone: 'America/New_York' },
    { label: 'Dhaka', timeZone: 'Asia/Dhaka' },
  ],

  // Only the items you fill in are shown on the contact and resume pages.
  contact: {
    email: 'nafisulhasansamimd@gmail.com',
    instagram: 'nuancesbynafis', // handle without the @
    linkedin: 'https://www.linkedin.com/in/nafisulhasansami',
  },
};
