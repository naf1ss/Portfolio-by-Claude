/**
 * Projects: interdisciplinary and research work, each told as a case study on projects.html?p=<id>.
 * Series are for bodies of artwork; a project is a piece of work with a question, a method and an outcome.
 *
 *   id, title, kicker, summary     shown on the projects list and at the top of the case study
 *   cover                          work id for the projects list (shown whole, never cropped)
 *   hero    { workId, caption }    the opening picture
 *   glance  [{ label, text }]      the project at a glance (role, timeline, disciplines...)
 *   link    { text, url }          optional: the project's own site
 *   sections [{ id, label, number?, title, blocks }]   in reading order; `label` names it in the contents
 *
 * Blocks, rendered by js/project-page.js:
 *   { type: 'text', paragraphs }                       *asterisks* set a title in italics
 *   { type: 'question', text }                         the research question, set large
 *   { type: 'criteria', items: [{ title, text }] }
 *   { type: 'stats', items: [{ value, label }] }
 *   { type: 'figure', workId, caption }                one picture, whole
 *   { type: 'row', items: [{ workId, caption }] }      pictures side by side at one height, none cropped
 *   { type: 'grid', items: [{ workId, label, caption }] }   same-shape pictures in an even grid
 *   { type: 'compare', items: [{ workId, label, caption }] } two stages of a design, side by side
 *   { type: 'decision', title, text }                  a key decision, set apart
 *   { type: 'outcomes', items: [{ title, text, status? }] }
 *   { type: 'changes', items: [{ title, from, to }] }  how the plan changed
 *   { type: 'link', text, url }
 *   { type: 'credits', text }
 *
 * Every workId must be in the catalogue (the tests check). Exposes window.PORTFOLIO_PROJECTS.
 */
(function (root, projects) {
  if (typeof module === 'object' && module.exports) {
    module.exports = projects;
  } else {
    root.PORTFOLIO_PROJECTS = projects;
  }
})(typeof self !== 'undefined' ? self : this, [
  {
    // From the Kolbe final presentation and poster (2026); the proposal only for how the plan changed.
    id: 'planet-walk',
    title: 'Planet Walk & Observatory Mural',
    kicker: 'Kolbe Summer Research Fellowship · 2026',
    summary:
      'A walkable scale model of the solar system across Gettysburg College, from the planetarium to the Observatory: a measured route, eleven ceramic station markers, a four-panel mural and a companion website.',
    cover: 'pw-mural-mockup',
    hero: { workId: 'pw-mural-mockup', caption: 'The mural mocked up on the College Observatory, where the walk ends.' },
    glance: [
      { label: 'Role', text: 'Researcher and designer: route planning, ceramic markers, mural and website' },
      { label: 'Mentor', text: 'Dr. Ryan E. Johnson' },
      { label: 'Timeline', text: 'Eight weeks, summer 2026' },
      { label: 'Disciplines', text: 'Astronomy, mathematics, site planning, ceramics, illustration, web design' },
      { label: 'Deliverables', text: 'Route and station plan, eleven markers, a four-panel mural, a website' },
    ],
    link: { text: 'Visit the companion website', url: 'https://planet-walk.vercel.app/' },
    sections: [
      {
        id: 'overview',
        label: 'Overview',
        title: 'Making the scale of space walkable',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'The solar system is almost entirely empty space, yet diagrams and textbooks pack the planets side by side. Most people never feel the distances. A scale model can change that: it turns the astronomical unit, an abstraction, into footsteps.',
              'The project set out to build one across campus in support of Physics and Astronomy outreach: a walk that begins with the Sun in the planetarium at Masters Hall and ends at Pluto, at the College Observatory, with a mural that makes the Observatory a destination worth walking to.',
            ],
          },
          {
            type: 'question',
            text: 'How can Gettysburg College design a scientifically accurate, spatially feasible and accessible planet walk, alongside an Observatory mural that engages a broad public audience?',
          },
          {
            type: 'criteria',
            items: [
              { title: 'Astronomical accuracy', text: 'Every station sits at its true distance from the Sun on one consistent scale.' },
              { title: 'Feasibility and access', text: 'Stations lie on an everyday route: visible, safe and open to anyone walking it.' },
              { title: 'Durability', text: 'Markers and mural must withstand years of weather and handling with little upkeep.' },
              { title: 'Iterative testing', text: 'Each decision is tested on site, in mockups or in test tiles before it is fixed.' },
            ],
          },
        ],
      },
      {
        id: 'route',
        label: 'Scale and route',
        number: '01',
        title: 'Fitting the solar system to a campus',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'I prepared a campus map in FITS, the image format astronomers work in, and laid over it a model of the solar system drawn to one scale. I then tested candidate sites through mapping and on-site walks, weighing accuracy against what the campus allows: visibility, safety, access, and whether a marker could stay in place for years.',
            ],
          },
          {
            type: 'stats',
            items: [
              { value: '1 ft ≈ 485,000 mi', label: 'The scale: each foot of campus covers about two trips from Earth to the Moon' },
              { value: '2,304 m', label: 'The route on foot, measured with Facilities equipment (7,561.3 ft)' },
              { value: '11', label: 'Stations: the Sun, the eight planets, Ceres and Pluto' },
            ],
          },
          { type: 'figure', workId: 'pw-route-map', caption: 'The route, from the planetarium at Masters Hall (the Sun) to the College Observatory (Pluto).' },
          {
            type: 'decision',
            title: 'Scale and route kept apart',
            text: 'Stations sit at their true scaled distances; the route is simply the path a visitor walks between them. Keeping the two separate let the science stay exact while the walk follows real paths, doors and corridors.',
          },
        ],
      },
      {
        id: 'markers',
        label: 'Markers',
        number: '02',
        title: 'A surface for every world',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'Each station needed a marker that could live outdoors, be touched, and age well. I chose ceramic tile, and a research trip to Baltimore to study glazes shaped the final look.',
              'I prepared the clay and carved planetary surfaces into it: craters, cloud bands, a canyon system.',
            ],
          },
          {
            type: 'row',
            items: [
              { workId: 'pw-clay', caption: 'Tiles cut and drying' },
              { workId: 'pw-carved', caption: 'First carving tests' },
              { workId: 'pw-carved-craters', caption: 'Craters' },
            ],
          },
          {
            type: 'row',
            items: [
              { workId: 'pw-carved-bands', caption: 'Bands' },
              { workId: 'pw-carved-canyon', caption: 'A canyon' },
            ],
          },
          {
            type: 'text',
            paragraphs: ['Colour came next. I made 66 test tiles to work out glaze, texture and finish, comparing them side by side under the same light.'],
          },
          {
            type: 'row',
            items: [
              { workId: 'pw-colour-tests', caption: 'Glaze tests' },
              { workId: 'pw-tiles-table', caption: 'Tests compared side by side' },
            ],
          },
          { type: 'figure', workId: 'pw-tile-wall', caption: 'The marker set, from the Sun to Neptune.' },
          {
            type: 'decision',
            title: 'One format, many surfaces',
            text: 'Every marker shares the same size and layout, so the eleven stations read as one walk. Within that format, each carries a surface carved and glazed for its own world.',
          },
        ],
      },
      {
        id: 'stations',
        label: 'Stations',
        number: '03',
        title: 'Placing the stations',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'With the markers designed, I mocked each one up at its site to check how it reads from a few steps away, whether it can be found, and how it sits on the wall around it.',
            ],
          },
          {
            type: 'grid',
            items: [
              { workId: 'pw-station-sun', label: 'Sun', caption: 'Centre of the planetarium' },
              { workId: 'pw-station-mercury', label: 'Mercury', caption: 'Wall of the planetarium' },
              { workId: 'pw-station-venus', label: 'Venus', caption: 'Physics and Astronomy Atrium' },
              { workId: 'pw-station-earth', label: 'Earth', caption: 'Physics Student Lounge' },
              { workId: 'pw-station-mars', label: 'Mars', caption: 'Plank basement' },
              { workId: 'pw-station-ceres', label: 'Ceres', caption: 'Glatfelter Lodge' },
              { workId: 'pw-station-jupiter', label: 'Jupiter', caption: 'Science Center walkway' },
              { workId: 'pw-station-saturn', label: 'Saturn', caption: 'Glatfelter basement' },
              { workId: 'pw-station-uranus', label: 'Uranus', caption: 'Schmucker Studio wall' },
              { workId: 'pw-station-neptune', label: 'Neptune', caption: 'Admissions wall' },
              { workId: 'pw-station-pluto', label: 'Pluto', caption: 'College Observatory' },
            ],
          },
        ],
      },
      {
        id: 'mural',
        label: 'Mural',
        number: '04',
        title: 'A landmark at the destination',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'The walk needed an ending that could be seen from across the field. My first study filled the Observatory wall with a single map of the Martian surface: accurate, but quiet from a distance, and it spoke only to science.',
              'The final design pairs science with story. Each of four panels, for Mars, Earth, Jupiter and Saturn, sets a stylised figure from the planet’s mythology against the planet itself, tied together by orbital lines.',
            ],
          },
          {
            type: 'compare',
            items: [
              { workId: 'pw-mural-study', label: 'Early study', caption: 'A single panel of the Martian surface' },
              { workId: 'pw-mural-panels', label: 'Final design', caption: 'Myth and science in four panels' },
            ],
          },
          {
            type: 'decision',
            title: 'Print, not paint',
            text: 'I had planned to paint directly on the wall. After consulting the mural specialist Sarah Jacobs, MFA, on longevity and outdoor media, I created the artwork digitally for printing on vinyl: more durable outdoors, and practical to install on the Observatory’s metal wall.',
          },
        ],
      },
      {
        id: 'website',
        label: 'Website',
        number: '05',
        title: 'Carrying the walk online',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'The website was not in the original plan; it grew out of the walk itself. A visitor needs to find the next station, and to know what they are looking at once they arrive.',
              'I built an interactive companion with a map of the stops, a page for each planet with key facts, and a tracker that follows a visitor from the Sun to Pluto. It links the physical installation to a digital one for visitors, campus tours and future outreach.',
            ],
          },
          { type: 'link', text: 'Open the Planet Walk website', url: 'https://planet-walk.vercel.app/' },
        ],
      },
      {
        id: 'outcome',
        label: 'Outcome',
        title: 'Where it stands',
        blocks: [
          {
            type: 'outcomes',
            items: [
              { title: 'Route and station plan', text: 'A finalised, measured route on a scientifically consistent scale.', status: 'Complete' },
              { title: 'Station markers', text: 'A marker system backed by 66 material tests; production tiles made.', status: 'Ready to glaze and fire' },
              { title: 'Observatory mural', text: 'Four panels, designed for vinyl, with an on-site mockup.', status: 'Print-ready' },
              { title: 'Companion website', text: 'Map, planet pages and a walk tracker.', status: 'Live' },
              { title: 'Documentation', text: 'A package for installation coordination and future use.', status: 'Complete' },
            ],
          },
          {
            type: 'changes',
            items: [
              { title: 'Markers', from: 'Printed, laminated signs', to: 'Carved and glazed ceramic tiles, chosen through material research' },
              { title: 'Mural', from: 'Painted directly on the wall', to: 'A printed vinyl mural, on expert advice about durability' },
              { title: 'Website', from: 'Not planned', to: 'An interactive companion for visitors and tours' },
            ],
          },
        ],
      },
      {
        id: 'reflection',
        label: 'Reflection',
        title: 'Looking back',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'This project asked me to work as a scientist, a maker and a designer at once. Training in mathematics and data science carried the scaling and the measurement; my studio practice carried the clay, the glazes and the mural; the website asked for a language I learned along the way.',
              'The research question never changed, but the answers did. Each change came from testing the plan against the site, the materials and the people the walk is for. The best moments were physical: choosing where each marker would live, carving the planet surfaces, and walking the route from the Sun to Pluto. The hardest were finding a clay that would hold its detail and settling the design of the mural.',
              'What remains is installation: glazing and firing the markers, mounting the mural, adding QR links at each station, and working with campus tours, with a long-term plan to care for the materials outdoors.',
            ],
          },
          {
            type: 'credits',
            text: 'With thanks to Dr. Ryan E. Johnson, my mentor; Professor Tina Gebhart, for guidance in ceramics; Sarah Jacobs, MFA, for advice on mural materials and installation; and the Kolbe Fellowship Committee.',
          },
        ],
      },
    ],
  },
]);
