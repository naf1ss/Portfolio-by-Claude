/**
 * Settings you are likely to change. Everything else is driven by works-data.js
 * and works-photography.js.
 */
window.SITE_CONFIG = {
  // Works that scan through the letters of "nuances." in the home page hero, in this order.
  heroSlides: [
    'A012', 'A002', 'A003', 'A030', 'A037', 'A025', 'A004', 'A010',
    'A034', 'A005', 'A038', 'A029', 'A011', 'A014', 'A017',
  ],

  // Works shown under "Selected work" on the home page, in this order.
  featuredIds: [
    'A030', 'A010', 'ceramics-44', 'A031',
    'A019', 'A036', 'ceramics-59', 'A002',
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
