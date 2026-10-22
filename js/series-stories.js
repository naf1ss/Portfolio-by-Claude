/**
 * Long-form write-ups for a series page (series.html?s=<id>), keyed by series id and rendered by
 * series-story.js. A series with a story shows these pictures and words instead of a grid of its works.
 *
 *   intro     { workId, caption, lead, index }     a picture beside the series' note, a line (or lines) under it;
 *                                                 `index: true` lists the chapters as links
 *   chapters  [{ id, label, aside, kicker, title, workId, caption, text: [paragraphs],
 *                source: { name, listing, url, linkText },      optional
 *                points: { title, items: [{ label, text }] },   optional (label optional too)
 *                detail: { label, text } }]                     optional
 *                                                 one per work, picture and text side by side, alternating
 *   related   { title, workId, caption, items: [{ title, text }], note }       optional
 *   closing   { process: [{ title, text }] (optional), reflectionTitle, reflection: [paragraphs] }
 *
 * Every workId must be in the catalogue (the tests check).
 */
(function (root, stories) {
  if (typeof module === 'object' && module.exports) {
    module.exports = stories;
  } else {
    root.PORTFOLIO_SERIES_STORIES = stories;
  }
})(typeof self !== 'undefined' ? self : this, {
  // From the Final Trio presentation and the glazing record (Introduction to Ceramics, May 2026).
  'cross-wired': {
    intro: {
      workId: 'ceramics-41',
      lead: 'Each vessel is guided by one maker and informed by the other two.',
      index: true,
    },
    chapters: [
      {
        id: 'plate',
        label: 'The plate',
        aside: 'Lindsay Oesterritter',
        kicker: 'The plate · guided by Lindsay Oesterritter',
        title: 'Atmosphere and gesture',
        workId: 'ceramics-33',
        text: ['The plate treats the circular plane as an atmospheric field. Dark, brushed marks move across a matte, speckled ground, in the manner of Oesterritter’s wood-fired stoneware.'],
        source: {
          name: 'Lindsay Oesterritter, Dinner Plate',
          listing: 'Iron-rich stoneware; wood-fired with a cool reduction profile; wheel-thrown. About ¾ in. high and 9 in. wide.',
          linkText: 'See it at Schaller Gallery',
          url: 'https://schallergallery.com/collections/plates/products/dinner-plate-33',
        },
        points: {
          title: 'Influence of the three makers',
          items: [
            { label: 'Oesterritter', text: 'Atmospheric contrast across the plane, with directional dark marks over a speckled, light glaze.' },
            { label: 'Tao', text: 'A warm, restrained palette of browns that keeps the marks deliberate rather than muddy.' },
            { label: 'Shaw', text: 'The geometry of the wheel remains legible beneath the gesture.' },
          ],
        },
        detail: { label: 'Glazes', text: 'black slip, chun and GEB white' },
      },
      {
        id: 'mug',
        label: 'The mug',
        aside: 'Akiko Tao',
        kicker: 'The mug · guided by Akiko Tao',
        title: 'Proportion and the hand',
        workId: 'ceramics-32',
        text: ['The mug takes its proportions from Tao: the scale of the handle and the flare of the rim. I also sought the luminous depth of reduction firing, although my glaze resolves as a richer brown.'],
        source: {
          name: 'Akiko Tao, Mug',
          listing: 'Stoneware with black slip, chun and celadon glaze; gas-fired reduction. About 3¾ in. high, 5¼ in. wide and 4 in. deep.',
          linkText: 'See it at Schaller Gallery',
          url: 'https://schallergallery.com/collections/mugs/products/mug-418',
        },
        points: {
          title: 'Influence of the three makers',
          items: [
            { label: 'Oesterritter', text: 'Breaks in the clay body and accents at the rim recall iron-rich stoneware, even at this compact height.' },
            { label: 'Tao', text: 'The primary structure: the walls, the flare and the rhythm of the handle.' },
            { label: 'Shaw', text: 'A flared foot and clean throwing connect the mug to the refinement of the bowl.' },
          ],
        },
        detail: { label: 'Glazes', text: 'Korean celadon, then raspberry in two coats' },
      },
      {
        id: 'bowl',
        label: 'The bowl',
        aside: 'Andy Shaw',
        kicker: 'The bowl · guided by Andy Shaw',
        title: 'Open form and pooled glaze',
        workId: 'ceramics-34',
        text: ['The bowl adopts Shaw’s open cereal-bowl silhouette and subtle flare at the foot. A translucent glaze pools into a cool teal, echoing the movement of layered celadon.'],
        source: {
          name: 'Andy Shaw, Cereal Bowl',
          listing: 'Wheel-thrown and altered porcelain with Mamo lavender and Korean celadon glaze; electric-fired. About 2¾ in. high and 6½ in. wide.',
          linkText: 'See it at Schaller Gallery',
          url: 'https://schallergallery.com/collections/bowls/products/cereal-bowl-5',
        },
        points: {
          title: 'Influence of the three makers',
          items: [
            { label: 'Shaw', text: 'The open form, delicate foot and flowing, celadon-like glaze, adapted here as a pooled teal gloss.' },
            { label: 'Oesterritter', text: 'The unpredictable tonal variation of wood firing, reinterpreted through pooling and thinner breaks in the glaze.' },
            { label: 'Tao', text: 'A glossy, pooled depth that recalls the luminous surfaces of reduction firing.' },
          ],
        },
        detail: { label: 'Glazes', text: 'Mamo lavender and Korean celadon' },
      },
    ],
    related: {
      title: 'Related, not identical',
      workId: 'ceramics-43',
      caption: 'Underside view: the thrown feet shared by the three pieces.',
      items: [
        { title: 'Cohesion', text: 'A shared vocabulary drawn from the wheel (throwing rings, rim flare, considered feet) and a tonal bridge of warm iron browns.' },
        { title: 'Distinct roles', text: 'The plate functions as a painterly surface, the bowl as a study of volume and pooled glaze, and the mug as a study of proportion for the hand.' },
      ],
      note: 'Repeating a single motif across three identical volumes would have reduced cohesion to decoration. Here, unity comes from deliberate relationships between the forms and a shared technical language.',
    },
    closing: {
      process: [
        { title: 'Research', text: 'Close study of three ceramic artists: their forms, surfaces and finishes.' },
        { title: 'Development', text: 'Translating that study into a cohesive set of three original pieces.' },
        { title: 'Execution', text: 'Working through a range of glazes and finishes.' },
        { title: 'Connection', text: 'Building visual and technical relationships among the three pieces.' },
      ],
      reflection: [
        'Studying Shaw’s restrained porcelain, Tao’s luminous reduction palettes and Oesterritter’s wood-fired expressiveness gave me a disciplined technical foundation.',
        'Rather than repeating a single motif, each piece combines these vocabularies: painterly energy on a flat plane, luminous depth, and considered thrown and altered form.',
        'The set is deliberately small. I would extend the same approach to larger groups, such as stacking bowls with lids, provided the forms remain equally disciplined.',
      ],
    },
  },
  // From the Final Written Critique (drawing, 2024).
  'three-ways-of-seeing': {
    intro: {
      workId: 'still-life-setup',
      caption: 'The still-life setup.',
      lead: [
        'This series studies a single, unchanging subject through three approaches.',
        'Each drawing makes a different demand of the same scene: observational precision, structural analysis, or trust in intuition.',
      ],
      index: true,
    },
    chapters: [
      {
        id: 'chiaroscuro',
        label: 'Light and shadow',
        aside: 'Chiaroscuro',
        kicker: 'Chiaroscuro · charcoal on paper',
        title: 'Light and shadow',
        workId: 'A007',
        caption: 'Observational realism built on light and shadow.',
        text: [
          'This drawing demands precision and careful blending in pursuit of realism. The light source is clear, the contrast between light and dark is sustained, and the form of the table reads beneath the cloth.',
          'The violin case was difficult at the outset but resolved convincingly, and the varied tones of the patterned tablecloth are carried through graduated shades of charcoal.',
        ],
      },
      {
        id: 'composition-map',
        label: 'Structure',
        aside: 'Composition map',
        kicker: 'Composition map · charcoal on paper',
        title: 'Structure and geometry',
        workId: 'A008',
        caption: 'The structure and geometry underlying the scene.',
        text: [
          'The composition map required me to think in terms of design and abstraction. Geometric blocks represent the folds of the cloth and the way light falls across them.',
        ],
      },
      {
        id: 'input-output',
        label: 'Intuition',
        aside: 'Input-output',
        kicker: 'Input-output drawing · charcoal on paper',
        title: 'Intuitive drawing',
        workId: 'A009',
        caption: 'Playful, imperfect shapes that invite curiosity.',
        text: [
          'I made this drawing without looking at the paper. My eyes remained on the still life throughout while my hand followed, which made the process intuitive, spontaneous and enjoyable.',
          'The resulting shapes are unexpected and expressive. The handle of the violin case, for instance, became a banana beside the apple: unintended, and a pleasure to discover.',
        ],
      },
    ],
    closing: {
      reflection: [
        'I am pleased with how faithfully the drawings record the arrangement, and with the care given to each.',
        'My professor encouraged me to embrace the unusual angle of my drawing, which gives the scene a distinct perspective.',
        'If I were to extend one approach, it would be the input-output drawing. Its spontaneity felt liberating and points toward more experimental, expressive work.',
      ],
    },
  },
});
