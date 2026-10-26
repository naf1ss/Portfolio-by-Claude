/**
 * Long-form write-ups for a series page (series.html?s=<id>), keyed by series id and rendered by
 * series-story.js. A series with a story shows these pictures and words instead of a grid of its works.
 *
 *   intro     { workId, caption, lead, facts, index } a picture (optional) beside the series' note, a line (or lines) under it;
 *                                                 `facts: [{ label, text }]` lists particulars; `index: true` lists the chapters as links
 *   chapters  [{ id, label, aside, kicker, title, workId, caption, text: [paragraphs],
 *                source: { name, listing, url, linkText },      optional
 *                points: { title, items: [{ label, text }] },   optional (label optional too)
 *                detail: { label, text },                        optional
 *                strip: { title, items: [{ workId, label, caption }] } } ]   optional: a row of photos after the chapter
 *                                                 one per work, picture and text side by side, alternating
 *   related   { title, workId, caption, items: [{ title, text }], note }       optional
 *   works     [{ workId, text: [paragraphs] }]    optional: the works side by side, each labelled, its words beneath
 *   process   [{ title, text }]                   optional: the process as a band after the intro, before the works
 *   processTitle                                  optional heading for that band (default "Process")
 *   closing   { process (optional, beside the reflection), processTitle, reflectionFirst (reflection on the left), reflectionTitle, reflection: [paragraphs],
 *               credits (optional acknowledgements) }
 *
 * In any paragraph, *asterisks* mark the title of a work (shown in italics).
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
    process: [
      { title: 'Research', text: 'Close study of three ceramic artists: their forms, surfaces and finishes.' },
      { title: 'Development', text: 'Translating that study into a cohesive set of three original pieces.' },
      { title: 'Execution', text: 'Working through a range of glazes and finishes.' },
      { title: 'Connection', text: 'Building visual and technical relationships among the three pieces.' },
    ],
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
      reflectionTitle: 'Looking back',
      reflection: [
        'Studying Shaw’s restrained porcelain, Tao’s luminous reduction palettes and Oesterritter’s wood-fired expressiveness gave me a disciplined technical foundation.',
        'Rather than repeating a single motif, each piece combines these vocabularies: painterly energy on a flat plane, luminous depth, and considered thrown and altered form.',
        'The set is deliberately small. I would extend the same approach to larger groups, such as stacking bowls with lids, provided the forms remain equally disciplined.',
      ],
    },
  },
  // From the artist's notes on the two paintings (2026). Told as the two works side by side, then the series.
  'degrees-of-happiness': {
    works: [
      {
        workId: 'A030',
        text: [
          'In *Almost Happy* I wanted to paint the moment just before a feeling settles. Long diagonal strokes of violet, grey and muted teal move across the canvas, and in the lower right yellow, my colour for happiness, begins to gather.',
          'The brushwork keeps everything in motion, so it is never clear whether the yellow will take over or be pushed back. That uncertainty is the subject: a happiness that is close, but not yet here.',
        ],
      },
      {
        workId: 'A041',
        text: [
          'I work with colour the way some people argue: loud, direct and a little stubborn. In *Aggressive Happiness* the yellow has intensified into orange.',
          'I pushed thick squares of paint into a hot orange field and a cooler teal one, then let a rough white break cut across the middle like a fault line. What you see is less a picture of happiness than the physical push of it, pressing into the surface until it holds.',
        ],
      },
    ],
    closing: {
      reflectionTitle: 'About the series',
      reflection: [
        '*Degrees of Happiness* treats emotion as colour rather than as a subject to illustrate. Yellow, and the orange it becomes, stands for happiness throughout; each painting holds that colour at a different intensity and lets the handling of the paint carry the feeling.',
        'When the feeling is still arriving, the strokes are soft and blended. When it insists, the surface turns to hard edges, built-up squares and a single decisive line. Seen together, the paintings follow one emotion from suggestion to insistence: the colour stays the same, and what changes is how hard it pushes.',
      ],
    },
  },
  // From the artist's own account of why he keeps painting the tower (2026). The facts about the tower
  // (designers, dates, parts, the calculated curve) come from toureiffel.paris and ArchDaily.
  'eiffel-tower': {
    works: [
      { workId: 'A001', text: [] },
      { workId: 'A034', text: [] },
      { workId: 'A038', text: [] },
      { workId: 'A012', text: [] },
    ],
    closing: {
      reflectionFirst: true,
      processTitle: 'What I look at',
      process: [
        {
          title: 'Structure',
          text: 'Four lattice piers stand on a square plan, lean inward and meet in a single line. Each of the 18,038 iron parts was designed and calculated in advance, so the lattice is a drawing before it is a tower.',
        },
        {
          title: 'Curve',
          text: 'The curve of the legs was worked out mathematically to reduce the wind’s hold on the tower. The shape people find graceful is the shape that solves a problem.',
        },
        {
          title: 'Openings',
          text: 'The gaps in the lattice matter as much as the iron. To paint the tower is to paint the sky through it, and to decide what stays solid and what is left open.',
        },
        {
          title: 'Authorship',
          text: 'The engineers Maurice Koechlin and Émile Nouguier conceived it and the architect Stephen Sauvestre refined its form, including the arches at its base. It belongs to both disciplines.',
        },
      ],
      reflectionTitle: 'About the series',
      reflection: [
        'The Eiffel Tower began as a test. Long before it became a recurring subject, I set out to see whether I could render every part of its structure: the lattice of wrought iron, the arches at its base, the way its four legs gather into a single line.',
        'What kept me looking was how much of the form is reasoned. The curve of the legs, the proportion of arch to lattice, the thousands of parts each worked out before they were raised: beauty and logic are the same thing here, and I find that more convincing than ornament.',
        'It is also how I like to think, in plans and relationships: how a part sits in the whole, where weight gathers, how much space is left open. Painting the tower is a way to practise that, and it has drawn me toward architecture, the discipline that thinks this way for a living.',
        'I admire it as history, too: a tower built as the entrance to the 1889 World’s Fair, meant to be temporary and doubted by many at the time, that became the image of a city. Paris has stayed close to me ever since.',
        'I have returned to the tower across nearly a decade and several mediums, from poster colour to mixed media. Each return is a practice: the same silhouette set against a different sky, colour field or reflection, and a way of measuring how my hand and my eye have changed.',
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
          'This drawing demands precision and careful blending in pursuit of realism. I kept to one clear light source, held the contrast between light and dark throughout, and built the form of the table beneath the cloth.',
          'The violin case was the hardest part to begin. The varied tones of the patterned tablecloth are carried through graduated shades of charcoal.',
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
        caption: 'Drawn without looking at the paper.',
        text: [
          'I made this drawing without looking at the paper. My eyes remained on the still life throughout while my hand followed, which made the process intuitive, spontaneous and enjoyable.',
          'The shapes that resulted were not ones I planned. The handle of the violin case, for instance, became a banana beside the apple.',
        ],
      },
    ],
    closing: {
      reflectionTitle: 'Looking back',
      reflection: [
        'The first two drawings record the same arrangement in different terms: one through tone, the other through structure.',
        'My professor encouraged me to embrace the unusual angle of my drawing.',
        'If I were to extend one approach, it would be the input-output drawing. Its spontaneity felt liberating and points toward more experimental, expressive work.',
      ],
    },
  },
  // From the Monotype Series brief (Intro to Printmaking, 2026) and the six prints themselves.
  horizon: {
    intro: {
      workId: 'A016',
      caption: 'The six prints together.',
      lead: [
        'I set out to tell the passage of a day through a single view: a low horizon over open water.',
        'The horizon, the distant shoreline, the size and the orientation stay the same in every print. Only the light changes, and colour carries the narrative.',
      ],
      index: true,
    },
    process: [
      { title: 'Concept', text: 'One fixed view, told as a sequence of times of day.' },
      { title: 'Palette', text: 'A colour plan for the whole series, moving from warm light through cool night to clear blue.' },
      { title: 'Format', text: 'The same size and landscape orientation for all six prints, with the horizon held at a consistent height.' },
      { title: 'Technique', text: 'Each image painted onto a smooth plexiglass plate with no fixed image and printed once, so every print is unique.' },
    ],
    chapters: [
      {
        id: 'golden-hour',
        label: 'Golden hour',
        aside: 'Horizon 1',
        kicker: 'Horizon 1 \u00b7 monotype',
        title: 'Golden hour',
        workId: 'A019',
        caption: 'The sun resting on the horizon.',
        text: ['The series opens in saturated yellow and orange. The sun sits low on the shoreline, and its light breaks into horizontal strokes across the water.'],
      },
      {
        id: 'dusk',
        label: 'Dusk',
        aside: 'Horizon 2',
        kicker: 'Horizon 2 \u00b7 monotype',
        title: 'Dusk',
        workId: 'A020',
        caption: 'A red sun above a cooling sky.',
        text: ['A red sun hangs just above the shore while blue presses down from the top of the sky. Its reflection runs in a soft streak across the green water.'],
      },
      {
        id: 'afterglow',
        label: 'Afterglow',
        aside: 'Horizon 3',
        kicker: 'Horizon 3 \u00b7 monotype',
        title: 'Afterglow',
        workId: 'A021',
        caption: 'The sky after the sun has set.',
        text: ['With the sun gone, sky and water turn to red and deep orange. Long, dragged marks in the ink give both the same restless texture, and the shoreline becomes a dark silhouette.'],
      },
      {
        id: 'night',
        label: 'Night',
        aside: 'Horizon 4',
        kicker: 'Horizon 4 \u00b7 monotype',
        title: 'Night',
        workId: 'A022',
        caption: 'Stars over dark water.',
        text: ['Night replaces colour with a single deep blue. Flecks of white scatter across the sky and repeat in the water below, so the horizon becomes a mirror line.'],
      },
      {
        id: 'before-dawn',
        label: 'Before dawn',
        aside: 'Horizon 5',
        kicker: 'Horizon 5 \u00b7 monotype',
        title: 'Before dawn',
        workId: 'A023',
        caption: 'A paler band of light along the horizon.',
        text: ['The stars remain, but a lighter band gathers just above the shoreline: the first sign that the night is ending.'],
      },
      {
        id: 'daylight',
        label: 'Daylight',
        aside: 'Horizon 6',
        kicker: 'Horizon 6 \u00b7 monotype',
        title: 'Daylight',
        workId: 'A024',
        caption: 'Clear sky and moving water.',
        text: ['The sequence closes in full daylight. Clouds are built up in thick, light strokes, and the water breaks into small flashes of white beneath a clear blue sky.'],
      },
    ],
    closing: {
      reflectionTitle: 'Looking back',
      reflection: [
        'Holding the composition constant allowed colour and mark-making to do the narrative work: time passes, yet nothing else in the scene moves.',
        'Monotype suited the subject. Each print could be pulled only once, much like a moment of light that cannot be repeated.',
      ],
    },
  },
});
