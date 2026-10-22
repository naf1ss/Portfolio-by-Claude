/**
 * Settings you are likely to change. Everything else is driven by works-data.js
 * and works-photography.js.
 */
window.SITE_CONFIG = {
  // The home page hero cuts "nuances." out of a slideshow: these works open it, in this order,
  // and then every other visible work in these categories follows.
  heroLead: ['A012', 'A002', 'A003', 'A030'],
  heroCategories: ['painting', 'print'],

  // The big "Latest work" feature on the home page.
  latestId: 'A041',

  // "Browse by medium" on the home page shows one work beside each medium. A visitor's first home page in a
  // session shows each `best`; after that every visit shows a random work from the same medium. A medium
  // without a `best` (photography) always shows a random one.
  mediumPicks: [
    { category: 'painting', best: 'A043' },
    { category: 'print', best: 'A027' },
    { category: 'ceramics', best: 'ceramics9' },
    { category: 'digital', best: 'A031' },
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
