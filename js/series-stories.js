/**
 * Long-form write-ups for a series page (series.html?s=<id>), keyed by series id and rendered by
 * series-story.js. A series with a story shows these pictures and words instead of a grid of its works.
 *
 *   intro     { workId, lead, chapters: true }   the picture beside the series' note, plus a line under it;
 *                                               `chapters` lists the chapters as links
 *   chapters  [{ id, label, maker, title, workId, lead, source: { name, listing, url },
 *                absorbs: [{ maker, text }], glazes }]
 *                                               one per work, picture and text side by side, alternating
 *   related   { title, workId, caption, items: [{ title, text }], note }
 *   closing   { process: [{ title, text }], reflection: [paragraphs] }
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
      chapters: true,
    },
    chapters: [
      {
        id: 'plate',
        label: 'The plate',
        maker: 'Lindsay Oesterritter',
        title: 'A painterly tabletop',
        workId: 'ceramics-33',
        lead: 'The circular plane becomes an atmospheric field: brushy dark marks skim across a matte, speckled light ground.',
        source: {
          name: 'Lindsay Oesterritter, Dinner Plate',
          listing: 'Iron-rich stoneware; wood-fired with a cool reduction profile; wheel-thrown. About ¾ in. high and 9 in. wide.',
          url: 'https://schallergallery.com/collections/plates/products/dinner-plate-33',
        },
        absorbs: [
          { maker: 'Oesterritter', text: 'Atmospheric contrast across the plane; directional dark marks skim a speckled light glaze.' },
          { maker: 'Tao', text: 'Warm kiln logic keeps the browns restrained, so the marks feel intentional, not muddy.' },
          { maker: 'Shaw', text: 'The circular geometry of the wheel stays legible beneath the gestures.' },
        ],
        glazes: 'black slip, chun and GEB white',
      },
      {
        id: 'mug',
        label: 'The mug',
        maker: 'Akiko Tao',
        title: 'An upright vessel for the hand',
        workId: 'ceramics-32',
        lead: 'The proportions of the handle and the flare of the rim, and the wish for luminous depth from reduction firing, even though my glaze turns a richer brown.',
        source: {
          name: 'Akiko Tao, Mug',
          listing: 'Stoneware with black slip, chun and celadon glaze; gas-fired reduction. About 3¾ in. high, 5¼ in. wide and 4 in. deep.',
          url: 'https://schallergallery.com/collections/mugs/products/mug-418',
        },
        absorbs: [
          { maker: 'Oesterritter', text: 'Clay breaks and rim accents echo iron stoneware, even at this compact height.' },
          { maker: 'Tao', text: 'The main scaffold for the wall, the flare and the rhythm of the handle.' },
          { maker: 'Shaw', text: 'The flared foot and clean throwing tie the mug back to the refinement of the bowl.' },
        ],
        glazes: 'Korean celadon, then raspberry in two coats',
      },
      {
        id: 'bowl',
        label: 'The bowl',
        maker: 'Andy Shaw',
        title: 'An open, pooled interior',
        workId: 'ceramics-34',
        lead: 'An expanded cereal-bowl silhouette, a subtle flare at the foot, and translucent glaze that pools like layered celadon: a cool pool of teal, with the same moving logic.',
        source: {
          name: 'Andy Shaw, Cereal Bowl',
          listing: 'Wheel-thrown and altered porcelain with Mamo lavender and Korean celadon glaze; electric-fired. About 2¾ in. high and 6½ in. wide.',
          url: 'https://schallergallery.com/collections/bowls/products/cereal-bowl-5',
        },
        absorbs: [
          { maker: 'Shaw', text: 'The open form, the subtle foot and celadon-like glaze movement, adapted into pooled teal gloss.' },
          { maker: 'Oesterritter', text: 'The unpredictable tones of wood firing, reinterpreted through pooling and thinner breaks.' },
          { maker: 'Tao', text: 'Glossy, pooled depth that echoes the luminous surfaces of reduction firing.' },
        ],
        glazes: 'Mamo lavender and Korean celadon',
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
});
