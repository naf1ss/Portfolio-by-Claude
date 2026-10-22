/**
 * Long-form write-ups shown under a series' works on its page (series.html?s=<id>), keyed by series id.
 * Rendered by series-story.js. A story has an optional `context` line and a list of sections, each one of:
 *
 *   { kind: 'text',    title, paragraphs: [...] }
 *   { kind: 'list',    title, ordered, items: [...] }
 *   { kind: 'sources', title, intro, items: [{ maker, piece, listing, onMine: { label, text }, carries, url, workId }] }
 *     (a source's workId names the pot it leads; it is checked by the tests but not pictured)
 *   { kind: 'compare', title, items: [{ title, text }], note }
 *   { kind: 'columns', title, intro, columns: [{ title, workId, glaze, items: [...] }] }
 *   { kind: 'steps',   title, items: [{ title, text }] }
 *
 * `workId` shows a small picture of that work from the catalogue.
 */
(function (root, stories) {
  if (typeof module === 'object' && module.exports) {
    module.exports = stories;
  } else {
    root.PORTFOLIO_SERIES_STORIES = stories;
  }
})(typeof self !== 'undefined' ? self : this, {
  // From "Final Trio Pots" and "Glazing Surfaces" (Introduction to Ceramics, May 2026).
  'final-trio': {
    context: 'Introduction to Ceramics · Professor Tina Gebhart · May 2026',
    sections: [
      {
        kind: 'list',
        title: 'The brief',
        ordered: true,
        items: [
          'Study three makers from the Schaller Gallery, each representing a different artist and culture through their forms, and translate them into the forms studied this term.',
          'Keep wheel throwing as the scaffold; let glazing and surface be where the testing happens.',
          'Trace how each maker’s priorities flow through every vessel, instead of copying any one of them.',
        ],
      },
      {
        kind: 'sources',
        title: 'Three sources',
        intro: 'Each pot takes its lead from one maker, then borrows from the other two.',
        items: [
          {
            maker: 'Lindsay Oesterritter',
            piece: 'Dinner Plate',
            listing: 'Iron-rich stoneware; wood-fired with a cool reduction profile; wheel-thrown. About ¾ in. high and 9 in. wide.',
            onMine: {
              label: 'Leads the plate',
              text: 'The circular plane becomes an atmospheric field: brushy dark marks skim across a matte, speckled light ground.',
            },
            carries:
              'In the mug and bowl, clay breaks at the rims and the tonal variation echoes iron-rich stoneware, even where the surfaces read glossier. Glaze inspiration: Korean celadon, iron, ash.',
            url: 'https://schallergallery.com/collections/plates/products/dinner-plate-33',
            workId: 'ceramics-33',
          },
          {
            maker: 'Akiko Tao',
            piece: 'Mug',
            listing: 'Stoneware with black slip, chun and celadon glaze; gas-fired reduction. About 3¾ in. high, 5¼ in. wide and 4 in. deep.',
            onMine: {
              label: 'Leads the mug',
              text: 'The proportions of the handle and the flare of the rim, and the wish for luminous depth from reduction firing, even though my glaze turns a richer brown.',
            },
            carries:
              'In the plate, the warm tones stay disciplined so the marks never mute the clay. In the bowl, pooling gloss and a controlled rim play out a quiet reduction drama in teal instead of Tao’s amber.',
            url: 'https://schallergallery.com/collections/mugs/products/mug-418',
            workId: 'ceramics-32',
          },
          {
            maker: 'Andy Shaw',
            piece: 'Cereal Bowl',
            listing: 'Wheel-thrown and altered porcelain with Mamo lavender and Korean celadon glaze; electric-fired. About 2¾ in. high and 6½ in. wide.',
            onMine: {
              label: 'Leads the bowl',
              text: 'An expanded cereal-bowl silhouette, a subtle flare at the foot, and translucent glaze that pools like layered celadon: a cool pool of teal, with the same moving logic.',
            },
            carries:
              'In the plate, a disciplined round architecture under expressive marks. In the mug, the same attention to the foot and an easy flare, so the upright form still refers back to the open bowl.',
            url: 'https://schallergallery.com/collections/bowls/products/cereal-bowl-5',
            workId: 'ceramics-34',
          },
        ],
      },
      {
        kind: 'compare',
        title: 'Related, not cloned',
        items: [
          {
            title: 'Cohesion',
            text: 'A shared vocabulary from the wheel (throwing rings, rim flare, considered feet) and a tonal bridge of warm iron browns.',
          },
          {
            title: 'Variety without gimmicks',
            text: 'The plate behaves like a painterly tabletop canvas, the bowl centres on volume and pooling glaze, and the mug on the proportions of the hand.',
          },
        ],
        note: 'Pressing one repeating stamp onto three identical volumes would have flattened cohesion into decoration. Here it comes from disciplined relationships between the forms and a shared technical vocabulary.',
      },
      {
        kind: 'columns',
        title: 'How every pot absorbs all three',
        intro: 'So the set does more than match.',
        columns: [
          {
            title: 'Plate: a painterly tabletop',
            workId: 'ceramics-33',
            glaze: 'Black slip, chun and GEB white',
            items: [
              'Oesterritter: atmospheric contrast across the plane; directional dark marks skim a speckled light glaze.',
              'Tao: warm kiln logic keeps the browns restrained, so the marks feel intentional, not muddy.',
              'Shaw: the circular geometry of the wheel stays legible beneath the gestures.',
            ],
          },
          {
            title: 'Mug: an upright vessel for the hand',
            workId: 'ceramics-32',
            glaze: 'Korean celadon, then raspberry in two coats',
            items: [
              'Oesterritter: clay breaks and rim accents echo iron stoneware, even at this compact height.',
              'Tao: the main scaffold for the wall, the flare and the rhythm of the handle.',
              'Shaw: the flared foot and clean throwing tie the mug back to the refinement of the bowl.',
            ],
          },
          {
            title: 'Bowl: an open, pooled interior',
            workId: 'ceramics-34',
            glaze: 'Mamo lavender and Korean celadon',
            items: [
              'Shaw: the open form, the subtle foot and celadon-like glaze movement, adapted into pooled teal gloss.',
              'Oesterritter: the unpredictable tones of wood firing, reinterpreted through pooling and thinner breaks.',
              'Tao: glossy, pooled depth that echoes the luminous surfaces of reduction firing.',
            ],
          },
        ],
      },
      {
        kind: 'steps',
        title: 'Process',
        items: [
          { title: 'Source analysis', text: 'Studied three ceramic artists, looking closely at their textures, finishes and forms.' },
          { title: 'A small body of work', text: 'Turned what I found into a cohesive trio of original pieces.' },
          { title: 'Technical execution', text: 'Worked through varied finishes and glazes.' },
          { title: 'Relationships', text: 'Built visual and technical connections between all three pieces.' },
        ],
      },
      {
        kind: 'text',
        title: 'Reflection',
        paragraphs: [
          'Working across Shaw’s restrained porcelain, Tao’s shimmering reduction palettes and Oesterritter’s wood-fired expressiveness built a disciplined foundation.',
          'Instead of stamping one repeatable motif, each pot cross-wires those vocabularies: painterly energy on a plane, luminous depth, and nuanced thrown and altered geometry.',
          'The set stays deliberately small, but the same loop is how I would grow toward larger sets, such as stacking bowls with lids, once the forms stay this disciplined.',
        ],
      },
    ],
  },
});
