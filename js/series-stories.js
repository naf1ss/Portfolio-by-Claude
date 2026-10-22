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
      lead: 'Each pot takes its lead from one maker, then borrows from the other two.',
      index: true,
    },
    chapters: [
      {
        id: 'plate',
        label: 'The plate',
        aside: 'Lindsay Oesterritter',
        kicker: 'The plate \u00b7 led by Lindsay Oesterritter',
        title: 'A painterly tabletop',
        workId: 'ceramics-33',
        text: ['The circular plane becomes an atmospheric field: brushy dark marks skim across a matte, speckled light ground.'],
        source: {
          name: 'Lindsay Oesterritter, Dinner Plate',
          listing: 'Iron-rich stoneware; wood-fired with a cool reduction profile; wheel-thrown. About ¾ in. high and 9 in. wide.',
          linkText: 'See it at Schaller Gallery',
          url: 'https://schallergallery.com/collections/plates/products/dinner-plate-33',
        },
        points: {
          title: 'All three makers in the plate',
          items: [
            { label: 'Oesterritter', text: 'Atmospheric contrast across the plane; directional dark marks skim a speckled light glaze.' },
            { label: 'Tao', text: 'Warm kiln logic keeps the browns restrained, so the marks feel intentional, not muddy.' },
            { label: 'Shaw', text: 'The circular geometry of the wheel stays legible beneath the gestures.' },
          ],
        },
        detail: { label: 'Glazes', text: 'black slip, chun and GEB white' },
      },
      {
        id: 'mug',
        label: 'The mug',
        aside: 'Akiko Tao',
        kicker: 'The mug \u00b7 led by Akiko Tao',
        title: 'An upright vessel for the hand',
        workId: 'ceramics-32',
        text: ['The proportions of the handle and the flare of the rim, and the wish for luminous depth from reduction firing, even though my glaze turns a richer brown.'],
        source: {
          name: 'Akiko Tao, Mug',
          listing: 'Stoneware with black slip, chun and celadon glaze; gas-fired reduction. About 3¾ in. high, 5¼ in. wide and 4 in. deep.',
          linkText: 'See it at Schaller Gallery',
          url: 'https://schallergallery.com/collections/mugs/products/mug-418',
        },
        points: {
          title: 'All three makers in the mug',
          items: [
            { label: 'Oesterritter', text: 'Clay breaks and rim accents echo iron stoneware, even at this compact height.' },
            { label: 'Tao', text: 'The main scaffold for the wall, the flare and the rhythm of the handle.' },
            { label: 'Shaw', text: 'The flared foot and clean throwing tie the mug back to the refinement of the bowl.' },
          ],
        },
        detail: { label: 'Glazes', text: 'Korean celadon, then raspberry in two coats' },
      },
      {
        id: 'bowl',
        label: 'The bowl',
        aside: 'Andy Shaw',
        kicker: 'The bowl \u00b7 led by Andy Shaw',
        title: 'An open, pooled interior',
        workId: 'ceramics-34',
        text: ['An expanded cereal-bowl silhouette, a subtle flare at the foot, and translucent glaze that pools like layered celadon: a cool pool of teal, with the same moving logic.'],
        source: {
          name: 'Andy Shaw, Cereal Bowl',
          listing: 'Wheel-thrown and altered porcelain with Mamo lavender and Korean celadon glaze; electric-fired. About 2¾ in. high and 6½ in. wide.',
          linkText: 'See it at Schaller Gallery',
          url: 'https://schallergallery.com/collections/bowls/products/cereal-bowl-5',
        },
        points: {
          title: 'All three makers in the bowl',
          items: [
            { label: 'Shaw', text: 'The open form, the subtle foot and celadon-like glaze movement, adapted into pooled teal gloss.' },
            { label: 'Oesterritter', text: 'The unpredictable tones of wood firing, reinterpreted through pooling and thinner breaks.' },
            { label: 'Tao', text: 'Glossy, pooled depth that echoes the luminous surfaces of reduction firing.' },
          ],
        },
        detail: { label: 'Glazes', text: 'Mamo lavender and Korean celadon' },
      },
    ],
    related: {
      title: 'Related, not cloned',
      workId: 'ceramics-43',
      caption: 'Turned over: the thrown feet the three share.',
      items: [
        { title: 'Cohesion', text: 'A shared vocabulary from the wheel (throwing rings, rim flare, considered feet) and a tonal bridge of warm iron browns.' },
        { title: 'Variety without gimmicks', text: 'The plate behaves like a painterly tabletop canvas, the bowl centres on volume and pooling glaze, and the mug on the proportions of the hand.' },
      ],
      note: 'Pressing one repeating stamp onto three identical volumes would have flattened cohesion into decoration. Here it comes from disciplined relationships between the forms and a shared technical vocabulary.',
    },
    closing: {
      process: [
        { title: 'Source analysis', text: 'Studied three ceramic artists, looking closely at their textures, finishes and forms.' },
        { title: 'A small body of work', text: 'Turned what I found into a cohesive trio of original pieces.' },
        { title: 'Technical execution', text: 'Worked through varied finishes and glazes.' },
        { title: 'Relationships', text: 'Built visual and technical connections between all three pieces.' },
      ],
      reflection: [
        'Working across Shaw’s restrained porcelain, Tao’s shimmering reduction palettes and Oesterritter’s wood-fired expressiveness built a disciplined foundation.',
        'Instead of stamping one repeatable motif, each pot cross-wires those vocabularies: painterly energy on a plane, luminous depth, and nuanced thrown and altered geometry.',
        'The set stays deliberately small, but the same loop is how I would grow toward larger sets, such as stacking bowls with lids, once the forms stay this disciplined.',
      ],
    },
  },
  // From the Final Written Critique (drawing, 2024).
  'three-ways-of-seeing': {
    intro: {
      workId: 'still-life-setup',
      caption: 'The setup, photographed.',
      lead: [
        'The project asked me to look at a single arrangement from several directions: to sharpen my skills, and to trust my instincts.',
        'Each drawing asks something different of the same scene, and each felt different to make.',
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
        caption: 'Realism, and the play of light and shadow.',
        text: [
          'This one asked for precision and careful blending to reach realism. The light source is clear, the contrasts between light and dark hold, and the shape of the table reads beneath the cloth.',
          'The violin case was a struggle at first, but it came out convincing, and the many-coloured tablecloth is carried by varied shades of charcoal.',
        ],
      },
      {
        id: 'composition-map',
        label: 'A map of shapes',
        aside: 'Composition map',
        kicker: 'Composition map · charcoal on paper',
        title: 'A map of shapes',
        workId: 'A008',
        caption: 'The structure and geometry beneath the scene.',
        text: [
          'The composition map pushed me to think in terms of design and abstraction. Geometric blocks stand for the folds of the cloth and the way the light falls across them.',
        ],
      },
      {
        id: 'input-output',
        label: 'Drawing by instinct',
        aside: 'Input-output',
        kicker: 'Input-output drawing · charcoal on paper',
        title: 'Drawing by instinct',
        workId: 'A009',
        caption: 'Playful, imperfect shapes that invite amusement and intrigue.',
        text: [
          'Intuitive and spontaneous, this one was freeing and funny to make, and it produced unexpected, expressive shapes. The handle of the violin case came out looking like a banana next to the apple: unintentional, and a delight.',
        ],
      },
    ],
    closing: {
      reflectionTitle: 'Looking back',
      reflection: [
        'I am proud of how closely the trio captures the arrangement, and of how carefully each piece is made.',
        'My professor encouraged me to embrace the unusual angle of my drawing, which gives the scene a perspective of its own.',
        'If I took one approach further, it would be the input-output drawing: its spontaneity felt liberating, and it opens the way to more experimental, expressive work.',
      ],
    },
  },
});
