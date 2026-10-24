/**
 * Projects: interdisciplinary and research work, each told as a case study on projects.html?p=<id>.
 * Series are for bodies of artwork; a project is a piece of work with a question, a method and an outcome.
 *
 *   id, title, kicker, summary     shown on the projects list and at the top of the case study
 *   cover                          work id for the projects list (shown whole, never cropped)
 *   hero    { workId, caption, size?, link? }   optional opening picture; size 'medium' keeps it narrower. Without one,
 *                                  the project at a glance sits beside the title. A case study shows each picture once (tested).
 *   glance  [{ label, text }]      the project at a glance (role, timeline, disciplines...)
 *   sections [{ id, label, number?, title, blocks }]   in reading order; `label` names it in the contents
 *
 * Blocks, rendered by js/project-page.js:
 *   { type: 'text', paragraphs }                       *asterisks* set a title in italics
 *   { type: 'question', text }                         the research question, set large
 *   { type: 'criteria', title?, items: [{ title, text }] }   titled "Design criteria" unless given, e.g. "How to read the chart"
 *   { type: 'stats', items: [{ value, label }] }
 *   { type: 'figure', workId, caption, size? }         one picture, whole; size 'medium' keeps it narrower
 *   { type: 'annotated', workId, caption, title, items: [{ title, text }] }   a picture with a guide to reading it beside it
 *   { type: 'row', items: [{ workId, caption }] }      pictures side by side at one height, none cropped
 *   { type: 'grid', columns?, items: [{ workId, label, caption }] }   same-shape pictures in an even grid
 *   { type: 'compare', items: [{ workId, label, caption }] } two stages of a design, side by side
 *   { type: 'decision', title, text, eyebrow? }        a key decision, set apart (eyebrow defaults to "Key decision")
 *   { type: 'findings', items: [{ question, answer, implication? }], implicationLabel? }   what a conversation taught; the label before each implication defaults to "For the design"
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
    // From the final presentation and poster (2026); the proposal only for how the plan changed.
    id: 'planet-walk',
    title: 'Planet Walk & Observatory Mural',
    kicker: 'Case study · 2026',
    cta: 'Read the case study',
    summary:
      'A walkable scale model of the solar system across Gettysburg College, from the planetarium to the Observatory: a measured route, eleven ceramic station markers, a four-panel mural and a companion website.',
    cover: 'pw-mural-mockup',
    hero: { workId: 'pw-mural-mockup', caption: 'The mural mocked up on the College Observatory, where the walk ends.' },
    glance: [
      { label: 'Role', text: 'Researcher and designer: route planning, ceramic markers, mural and website' },
      { label: 'Mentor', text: 'Dr. Ryan E. Johnson, Associate Professor of Physics' },
      { label: 'Timeline', text: 'Eight weeks, summer 2026' },
      { label: 'Disciplines', text: 'Astronomy, mathematics, site planning, ceramics, illustration, web design' },
      { label: 'Deliverables', text: 'Route and station plan, eleven markers, a four-panel mural, a website' },
    ],
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
          { type: 'figure', size: 'medium', workId: 'pw-route-map', caption: 'The route, from the planetarium at Masters Hall (the Sun) to the College Observatory (Pluto).' },
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
              'I prepared the clay and carved planetary surfaces into it: craters, the rings of Saturn, a canyon system. On the Saturn tile, depth stands for tone: the deeper a groove, the darker its ring, and the shallower, the lighter.',
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
              { workId: 'pw-carved-bands', caption: 'Saturn’s rings: deeper grooves for darker rings' },
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
          { type: 'figure', workId: 'pw-tile-wall', caption: 'Mockup: the marker set, from the Sun to Neptune, shown together on a brick wall.' },
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
              'The walk needed an ending that could be seen from across the field: a landmark that tells visitors they have arrived. The Observatory’s front wall has room for four panels, so the mural became a set of four, for Mars, Earth, Jupiter and Saturn.',
              'Each panel shows its planet graphically, with smaller celestial bodies around it, beside a mythical figure whose drapery takes on the planet’s colours, so the figure itself can be read as the planet. The figures draw on anime, on visual research gathered online and on my own imagination.',
              'The panels are digital mixed media. Most of the work is hand-drawn; I combined it with photo manipulation and collaged imagery, among them Hokusai’s *The Great Wave off Kanagawa* rising over Earth, and used generative tools to refine some details.',
            ],
          },
          { type: 'figure', workId: 'pw-mural-panels', caption: 'The four panels: Mars, Earth, Jupiter and Saturn.' },
          {
            type: 'decision',
            title: 'Print, not paint',
            text: 'I had planned to paint directly on the wall. After consulting the mural specialist Sarah Jacobs, MFA, on longevity and outdoor media, I created the artwork digitally for printing on vinyl: more durable outdoors, and practical to install on the Observatory’s metal wall.',
          },
          {
            type: 'text',
            paragraphs: [
              'The move to print also changed the mural’s place in the project. It began as the centrepiece; once it no longer called for painting by hand, my priorities shifted to the marker design system, the research and material tests behind it, and the walk tracker.',
            ],
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
              'The website was not in the original plan; it grew out of the walk itself. A walk this long needs something to keep visitors going from one station to the next.',
              'At its centre is a walk tracker. Visitors mark each station as they reach it and follow their progress outward from the Sun; when they finish, the site greets them with facts about the journey they have just made. Around the tracker sit a map of the stops and a page for each planet, so the walk carries on for visitors, campus tours and future outreach.',
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
              { title: 'Observatory mural', text: 'Four panels, printed on vinyl, with an on-site mockup.', status: 'Printed' },
              { title: 'Companion website', text: 'A walk tracker, a map of the stops and planet pages.', status: 'Live' },
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
            text: 'With thanks to my mentor, Dr. Ryan E. Johnson; Professor Tina Gebhart, for guidance in ceramics; and Sarah Jacobs, MFA, for advice on mural materials and installation.',
          },
        ],
      },
    ],
  },
  {
    // From the project scope, Gan Yu's written answers to the exhibition's research questions, the documentation of
    // the painting's earlier showings, the interview with him (June 2, 2025), the catalogue essay and the website. Only the painting
    // itself is shown, by courtesy of the artist: the page is about my research.
    id: 'digital-moving-mountain',
    title: 'A Digital Moving Mountain',
    kicker: 'Research project · 2025',
    summary:
      'A research project with the Chinese American artist Dr. Gan Yu, asking how a website could carry his participatory ink painting *A Moving Mountain* beyond the gallery wall. Presented in his exhibition *Footprints Across the Ocean* at the Schmucker Art Gallery, Gettysburg College.',
    cover: 'dmm-full',
    hero: {
      workId: 'dmm-full',
      caption: 'Gan Yu, A Moving Mountain: Dow Jones Performance in the First Decade of the 21st Century, ink on canvas, 30 × 240 in, begun 2000. Courtesy of the artist.',
      link: { text: 'About Gan Yu', url: 'https://www.ganyuart.com' },
    },
    glance: [
      { label: 'Collaborating artist', text: 'Dr. Gan Yu, Chinese American artist, curator and professor' },
      { label: 'My role', text: 'Student researcher; research, interaction design and development of the digital extension; catalogue essay' },
      { label: 'Advisors', text: 'Professor Yan Sun, Chair of Art and Art History; Sarah Kate Gillespie, Director of the Schmucker Art Gallery' },
      { label: 'Methods', text: 'Archival and visual research, artist interview, design trials, web design and development' },
      { label: 'Presented in', text: 'Footprints Across the Ocean: The Art of Gan Yu, Schmucker Art Gallery, September 3 to December 6, 2025' },
    ],
    sections: [
      {
        id: 'overview',
        label: 'Overview',
        title: 'Why I took on this research',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'In 2025 the Schmucker Art Gallery at Gettysburg College prepared *Footprints Across the Ocean*, a survey of forty-five years of work by the Chinese American artist Dr. Gan Yu. Two students joined the exhibition as researchers: Westley Rathbun on its art-historical side, and I on its digital and interactive side.',
              'I took the project on because it sits where my two fields meet. I study mathematics and studio art, and Gan Yu has spent eighteen years turning stock-market data into ink painting. I wanted to find out whether code, used with care, could do something for his work that a gallery wall cannot.',
              'Exhibitions are made for the people in the room. When a show closes, or for anyone who cannot travel to it, the conversation with the work stops. For most paintings that is a loss of access. For a painting completed by its viewers, it is a loss of the work itself.',
            ],
          },
        ],
      },
      {
        id: 'question',
        label: 'The question',
        title: 'Translation, not display',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'Putting pictures of the painting online would have been easy, and beside the point. The research asked what a participatory painting needs in order to keep living on a screen, and what it must not lose on the way.',
            ],
          },
          {
            type: 'question',
            text: 'How can a digital extension deepen the way audiences understand and take part in an artist’s work, while keeping faith with the original?',
          },
        ],
      },
      {
        id: 'research',
        label: 'The research',
        number: '01',
        title: 'Studying the artist and his subject',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'The project began with research, not design. Of the works in the exhibition I chose *A Moving Mountain*, and to understand it I studied what stands behind it: Gan Yu’s Wall Street series, eighteen years of work from *The Wall Street Diary* and *Trading System* to *Dow Moments*, *Memorandum* and *The GameStop Mania*; his written answers to the exhibition’s research questions; the documentation of the painting’s earlier showings, with the comments viewers left on each panel; and the market itself, the decade of the Dow Jones that the painting records.',
            ],
          },
          {
            type: 'findings',
            items: [
              {
                question: 'Where does the work come from?',
                answer: 'From the 2007–2009 financial crisis. Watching the market swing between greed and fear, Gan Yu came to see it as the largest group performance in the world, running without pause from New York to London, Hong Kong and Shanghai, and its charts as a landscape shaped by millions of human decisions.',
                implication: 'the market is presented as the painting’s subject, not only its imagery.',
              },
              {
                question: 'What does the painting record?',
                answer: 'The Dow Jones Industrial Average from 2000 to 2009, traced exactly, one panel for each year: the collapse of the dot-com bubble, the climb to a record high in 2007 and the fall of the 2008 crisis. His abstraction rests on real data; in *Trading System* and *The Wall Street Diary*, colour marks each day’s rise, fall or stillness.',
                implication: 'the panels stay in order, year by year, so the site reads as a record of the decade rather than as loose images.',
              },
              {
                question: 'Why ink on canvas?',
                answer: 'Gan Yu joins Eastern and Western materials to stand for a globalised market: Chinese ink on Western canvas is the economy the painting describes.',
                implication: 'the digital canvas welcomes every language and script, as the physical one does.',
              },
              {
                question: 'Why do viewers write on it?',
                answer: 'Because mass participation now defines the market: ordinary people, not only professional traders, move it. By inviting viewers to write, Gan Yu makes them part of the subject. More than 170 people have, in twelve languages, and he considers the painting finished only when the open sky above the peaks is full.',
                implication: 'participation, not viewing, is what the website has to carry.',
              },
            ],
          },
          {
            type: 'text',
            paragraphs: [
              'The research settled the direction of the project. Participation is not a feature of this painting; it is its medium. A digital version that left it out would be a reproduction, not an extension.',
            ],
          },
        ],
      },
      {
        id: 'interview',
        label: 'The interview',
        number: '02',
        title: 'Listening to the artist',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'On June 2, 2025, I interviewed Gan Yu with Westley, Professor Sun and Professor Gillespie. Westley’s questions traced his path from socialist realism to the Wall Street series; mine asked what the painting would need from a digital form. I also put my first proposal to him, a version of the canvas that visitors could write on with a finger or stylus, kept on a website and seen live in the gallery, and tested it against his answers.',
            ],
          },
          {
            type: 'findings',
            items: [
              {
                question: 'What did it feel like to watch people write on your work?',
                answer: 'Gan Yu wants every reaction, praise or criticism alike. Viewers’ sentiments about the market, the economy and the artist himself are, in his words, the value of the work.',
                implication: 'nothing is filtered for opinion; moderation guards only against abuse.',
              },
              {
                question: 'The canvas holds a dozen languages. Should any be favoured?',
                answer: 'Any language is welcome; English serves as the common one.',
                implication: 'visitors respond in whatever language is theirs.',
              },
              {
                question: 'Is a meeting of physical and digital a model for your future work?',
                answer: 'He called it essential: traditional ink painting has to meet new media and technology if it is to reach a new generation.',
                implication: 'the website is treated as part of the artwork’s life, not as a record of it.',
              },
              {
                question: 'What should visitors take away?',
                answer: 'A direct sense of what is happening around us. His work documents a complicated world; art is a historical record as much as something to admire.',
                implication: 'the painting travels with its context: the artist’s biography and an overview of the research sit beside the canvas.',
              },
            ],
          },
        ],
      },
      {
        id: 'translation',
        label: 'Translation',
        number: '03',
        title: 'Keeping the original in view',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'My first plan was to redraw the panels as digital paintings. I made trial versions and then set them aside: a copy, however careful, would have people writing on my version of the painting instead of his.',
            ],
          },
          {
            type: 'decision',
            title: 'The original canvas, not a redrawn copy',
            text: 'The website is built on photographs of the painting itself, so every contribution lands on Gan Yu’s brushwork, beside the handwriting of the viewers who came before.',
          },
          {
            type: 'text',
            paragraphs: [
              'The interactive canvas follows the rules of the physical one. The ten yearly panels are laid out in order, and a visitor can click anywhere on them to leave a comment at that exact spot: typed, or drawn and handwritten with a finger or stylus. It is saved the moment it is posted, so anyone who opens the painting a second later finds it in place, just as a comment on the canvas stays where it was written.',
            ],
          },
          {
            type: 'decision',
            title: 'Open to every view, guarded against abuse',
            text: 'Gan Yu wants praise and criticism alike, so nothing is filtered for opinion. Typed comments with vulgar language are blocked automatically, and drawings and handwriting go to an approval queue, where Gan Yu can approve or remove them.',
          },
          {
            type: 'text',
            paragraphs: [
              'I designed and built the site myself, keeping the interface quiet and precise so that the painting, and the voices on it, stay in front.',
            ],
          },
        ],
      },
      {
        id: 'outcome',
        label: 'Outcome',
        number: '04',
        title: 'What the research produced',
        blocks: [
          {
            type: 'outcomes',
            items: [
              {
                title: 'A Digital Moving Mountain',
                status: 'Live',
                text: 'A website with a gallery of the ten panels, the artist’s biography, my reflections, an overview of the research and the interactive canvas, where visitors anywhere add their reflections to a painting that is still evolving.',
              },
              {
                title: 'In the exhibition',
                status: 'Presented',
                text: 'The digital extension was presented as part of *Footprints Across the Ocean: The Art of Gan Yu* at the Schmucker Art Gallery, where I am credited as one of the exhibition’s two student researchers.',
              },
              {
                title: 'Exhibition catalogue',
                status: 'Printed',
                text: 'I wrote the catalogue essay on the digital extension, setting out how it carries the painting’s invitation to write from the gallery wall to the screen.',
              },
            ],
          },
          { type: 'link', text: 'Visit A Digital Moving Mountain', url: 'https://a-digital-moving-mountain-landing.vercel.app' },
        ],
      },
      {
        id: 'reflection',
        label: 'Reflection',
        title: 'What the mountain taught me',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'I never expected anyone to make art about the stock market. The first time I saw *A Moving Mountain* I was surprised, a little confused, and then curious: how could finance become poetry? That curiosity started this project.',
              'Working on it made me think about art that crosses boundaries between fields, cultures and people. Turning the painting into a digital space was as much about discovery as preservation, and every contribution reminded me that a work keeps growing through the people who meet it, not only through the artist’s first marks.',
              'Above all, it showed me that an unlikely subject can create connection, and that technology, used with care, can bring people closer to art instead of pushing them away. Collaborating with an established artist on his own exhibition taught me to listen first and build second.',
            ],
          },
          {
            type: 'credits',
            text: 'With thanks to Dr. Gan Yu; Professor Yan Sun, Chair of Art and Art History; Sarah Kate Gillespie, Director of the Schmucker Art Gallery; and Westley Rathbun.',
          },
        ],
      },
    ],
  },
  {
    // From the Recreate/Remix notebook, the DataUSA data, the infographic and its sources (data visualization course).
    // The wage ratios are calculated from the course dataset (Recreate.csv, 2014–2022). No opening picture, so each picture appears once.
    id: 'women-in-the-art-world',
    title: 'Women in the Art World: Data and Design',
    kicker: 'Data visualization',
    cta: 'Read the case study',
    summary:
      'Two pieces of data work on one question: how do women fare in the art world? I rebuilt a chart of wages in art professions and remixed it, then turned research on museums, exhibitions and the art market into a four-panel infographic.',
    cover: 'dv-infographic-women',
    glance: [
      { label: 'Role', text: 'Researcher, data analyst and designer' },
      { label: 'Context', text: 'A data visualization course' },
      { label: 'Disciplines', text: 'Data visualization, art-world research, graphic design' },
      { label: 'Tools', text: 'Python (pandas, Matplotlib), Procreate, Picsart' },
      { label: 'Data', text: 'DataUSA; National Museum of Women in the Arts; Burns Halperin Report; PLOS One; Freelands Foundation' },
    ],
    sections: [
      {
        id: 'overview',
        label: 'Overview',
        title: 'An art student looks at the numbers',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'I study art and mathematics, and this project is where the two meet. Women earn most of the fine arts degrees in the United States, yet they are a small share of the artists in museum collections. I wanted to see that gap in data, and then design it so that someone who has never read a report would understand it at a glance.',
              'The work has two parts. First I rebuilt an existing chart of artists’ wages to learn how it was made, and remixed it. Then I gathered research from several sources and designed an infographic that moves from the problem to what could change it.',
            ],
          },
          {
            type: 'question',
            text: 'How can data and design make a gap in the art world clear to a general audience, and show what it would take to close it?',
          },
        ],
      },
      {
        id: 'recreate',
        label: 'Recreate, remix',
        number: '01',
        title: 'Rebuilding a chart to understand it',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'I began with a line chart from DataUSA showing the average yearly wage of men and women working as artists and related workers in the United States, from 2014 to 2022. I rebuilt it in Python as closely as I could: the blue and red for each gender, the pale background, the gridlines, the dollar labels and the small gender symbols in the legend. The one thing I could not match was the typeface.',
              'For the remix I kept the data, colours and background and changed one thing: the lines became pairs of bars, so that the two wages for each year stand side by side.',
            ],
          },
          {
            type: 'compare',
            items: [
              { workId: 'dv-recreate', label: 'Recreate', caption: 'The original line chart, rebuilt in Python.' },
              { workId: 'dv-remix', label: 'Remix', caption: 'The same data as pairs of bars, one pair per year.' },
            ],
          },
          {
            type: 'criteria',
            title: 'How to read the charts',
            items: [
              { title: 'Across', text: 'The years, from 2014 to 2022.' },
              { title: 'Up', text: 'The average yearly wage, from $0 to about $80,000.' },
              { title: 'Colour', text: 'Dark blue is men; red is women.' },
              { title: 'What to notice', text: 'Red sits well below blue every year, and the two rise together, so the gap between them barely closes.' },
            ],
          },
          {
            type: 'stats',
            items: [
              { value: '64–68%', label: 'Women’s average wage as a share of men’s, in every year from 2014 to 2022' },
              { value: '$49,882', label: 'Women’s average wage in 2022, against $74,780 for men' },
              { value: '18–19%', label: 'How much each wage rose from 2014 to 2022, so the gap held steady' },
            ],
          },
          {
            type: 'decision',
            eyebrow: 'Key insight',
            title: 'What the remix does and does not do',
            text: 'Bars make each year easy to compare, but a gap is a ratio, and neither chart shows one. Working it out from the data was the real finding: women earned about two-thirds of what men did in every year, and that share barely moved. If I made the chart again, I would plot that ratio directly.',
          },
        ],
      },
      {
        id: 'infographic',
        label: 'Infographic',
        number: '02',
        title: 'From figures to a story',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'The infographic draws on the National Museum of Women in the Arts, the Burns Halperin Report, Artnet News, a PLOS One study of museum collections and the Freelands Foundation. I designed it in four panels that read from top to bottom like a short argument: the contrast, the evidence, signs of progress and a call to action.',
            ],
          },
          {
            type: 'annotated',
            workId: 'dv-infographic-women',
            caption: 'Women Underrepresented in the Art World, designed in Procreate and Picsart.',
            title: 'How to read the infographic',
            items: [
              { title: 'Dramatic contrast', text: 'The top panel sets two facts side by side: 70% of US art graduates are women, yet 87% of the artists in major museum collections are men.' },
              { title: 'Gap by numbers', text: 'The circle shows museum collections, with the black share for men (87%) and the small magenta wedge for women. Below it, 33%: the share of exhibitions given to women.' },
              { title: 'Progress', text: 'Signs of change: women were 53% of the artists in the 2019 Venice Biennale, and the Baltimore Museum of Art committed to acquiring only works by women in 2020.' },
              { title: 'Call to action', text: 'A balance scale weighs a woman artist against a man, with the line that representation shapes careers, earnings and visibility.' },
            ],
          },
          {
            type: 'decision',
            title: 'One colour for women',
            text: 'A single magenta marks women throughout: the small wedge of the museum chart, the graduate’s cap, the figure at the easel. Black and grey carry everything else, so the eye can follow one thread through all four panels, which are divided by torn-paper edges.',
          },
        ],
      },
      {
        id: 'reflection',
        label: 'Reflection',
        title: 'What I take from it',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'Data and design ask the same question: what does the viewer see first? Recreating a chart taught me how many small choices, such as colour, scale and an axis that starts at zero, decide what a picture of numbers says. Designing the infographic taught me that numbers need a structure before they persuade. I bring that way of looking back to my painting, where I also decide what the eye meets first.',
            ],
          },
          { type: 'link', text: 'See the code and data on GitHub', url: 'https://github.com/naf1ss/DSportfolio' },
          {
            type: 'credits',
            text: 'Data: DataUSA (artists and related workers); National Museum of Women in the Arts; Burns Halperin Report (Artnet News, 2022); UNESCO Courier; Gendered Prices (The Review of Financial Studies); Hyperallergic. GitHub Copilot helped with the bar chart code, and ChatGPT with brainstorming and drafting the written reports; the infographic is my own design.',
          },
        ],
      },
    ],
  },
  {
    // Written from the notebook (Sami_SoccerNTeam.ipynb, re-run on the repository's data) and the DS 325 final report.
    // The repository README is not used: its accuracy, label and file list do not match the code. No opening picture.
    id: 'national-team-selection',
    title: 'Can Club Statistics Predict National Team Selection?',
    kicker: 'Data science',
    cta: 'Read the case study',
    summary:
      'A machine-learning test of a common belief in football: that the players with the strongest club numbers are the ones picked for World Cup squads. Two models, 2,847 players and 30 statistics each, and a clear answer: club statistics alone are not enough.',
    cover: 'ml-confusion',
    glance: [
      { label: 'Role', text: 'Analyst: data preparation, modelling, evaluation and report' },
      { label: 'Context', text: 'Final project for a data science course' },
      { label: 'Disciplines', text: 'Statistics, machine learning, sports analytics' },
      { label: 'Tools', text: 'Python, pandas, scikit-learn, Seaborn, Matplotlib' },
      { label: 'Data', text: 'Top five European leagues, 2023–24; World Cup squads, 1930–2022' },
    ],
    sections: [
      {
        id: 'overview',
        label: 'Overview',
        title: 'Testing an assumption',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'Alongside my art, I study mathematics, and I like to test what people take for granted. In football it is often assumed that national teams are built from the players with the best club records. I wanted to see whether the numbers bear that out.',
            ],
          },
          {
            type: 'question',
            text: 'Can a player’s club statistics reliably predict whether he has been selected for a World Cup squad?',
          },
        ],
      },
      {
        id: 'method',
        label: 'Method',
        number: '01',
        title: 'Two datasets, two models',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'I combined two datasets. The first describes 2,852 players in the top five European leagues in the 2023–24 season: age, appearances, minutes, goals, assists, cards, expected goals and assists, progressive passes and carries, and the same figures per 90 minutes. The second lists the players in every World Cup squad from 1930 to 2022.',
              'I matched the two by player name, and labelled a player “selected” if his name appears in a World Cup squad. After setting aside the columns that are not performance measures (name, club, league, position, nationality, birth year and rank) and the five rows with missing values, 2,847 players remained, each described by 30 numerical statistics.',
              'I held back 20% of the players as a test set, keeping the same share of selected players in both parts, and trained two models on the rest: a logistic regression, simple and easy to interpret, and a random forest, which can pick up patterns a straight line cannot. Each model then had to sort the test players it had never seen.',
            ],
          },
          {
            type: 'stats',
            items: [
              { value: '2,847', label: 'Players, each described by 30 club statistics' },
              { value: '487', label: 'Labelled as selected: about 17% of all players' },
              { value: '570', label: 'Players held back for testing, 98 of them selected' },
            ],
          },
        ],
      },
      {
        id: 'results',
        label: 'Results',
        number: '02',
        title: 'Right most of the time, but not about the players who matter',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'Both models were right about 82% of the time, which sounds strong. The chart below shows why it is not: almost all of those correct answers are players who were not selected.',
            ],
          },
          { type: 'figure', workId: 'ml-confusion', caption: 'Each model’s answers for the 570 test players: logistic regression in blue, random forest in green.' },
          {
            type: 'criteria',
            title: 'How to read the chart',
            items: [
              { title: 'Rows and columns', text: 'Each row is the truth and each column is the model’s answer. 0 means not selected, 1 means selected.' },
              { title: 'Top left', text: 'Players correctly called not selected: 459 and 458. This is where most of the accuracy comes from.' },
              { title: 'Bottom right', text: 'Selected players the model found: only 6 and 8.' },
              { title: 'The other two', text: 'Mistakes. Bottom left, the selected players it missed (92 and 90); top right, players it wrongly called selected (13 and 14).' },
            ],
          },
          {
            type: 'findings',
            implicationLabel: 'What it means',
            items: [
              {
                question: 'Is 82% accuracy good?',
                answer: 'Not here. 83% of the test players were not selected, so a model that always answered “not selected” would score slightly higher.',
                implication: 'When one outcome is much more common, accuracy alone says little.',
              },
              {
                question: 'Could the models find the selected players?',
                answer: 'Rarely: 6 of 98 for the logistic regression and 8 of 98 for the random forest. When they did answer “selected”, they were right about a third of the time.',
                implication: 'This share of selected players found, called recall, is the measure that matters, and it was low.',
              },
            ],
          },
        ],
      },
      {
        id: 'statistics',
        label: 'Statistics',
        number: '03',
        title: 'Which numbers mattered, and how little',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'To see why the models struggled, I looked at how each statistic relates to selection on its own, and at which statistics the random forest leaned on.',
            ],
          },
          {
            type: 'row',
            items: [
              { workId: 'ml-correlation', caption: 'Each statistic’s correlation with selection' },
              { workId: 'ml-importance', caption: 'The statistics the random forest relied on most' },
            ],
          },
          {
            type: 'criteria',
            title: 'How to read the charts',
            items: [
              { title: 'Correlation, left', text: 'Each number measures how closely a statistic rises and falls with selection. 0 means no link and 1 a perfect one; the top row, 1, is selection compared with itself. Every statistic scores 0.24 or less: a weak link.' },
              { title: 'Importance, right', text: 'How much the random forest depended on each statistic when deciding. Longer bars mattered more, but no single bar stands far above the rest.' },
              { title: 'What to notice', text: 'Age comes first in both, ahead of goals and assists. Expected assists and progressive passes follow in correlation; progressive passes and minutes played in the random forest.' },
            ],
          },
          {
            type: 'decision',
            eyebrow: 'A closer look',
            title: 'Why age might lead',
            text: 'Age may stand for experience rather than form: an older player has simply had more tournaments in which to be picked. That is a reminder that a model can only find what its labels let it find.',
          },
        ],
      },
      {
        id: 'limits',
        label: 'Limits',
        number: '04',
        title: 'What the result shows, and what it cannot',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'The answer to the question is no: club statistics alone do not reliably predict who is selected. I reported recall as well as accuracy, because accuracy alone would have hidden that.',
              'Some limits come from the data. Only about one player in six is labelled selected, which pulls both models toward answering “not selected”. The labels come from World Cup squads over many decades, matched on names, while the statistics describe a single later season. And much of what coaches weigh is not in the data at all: tactical fit, injuries, leadership and reputation.',
              'A next version would label players from national team call-ups in the same season, add position and team strength, and use methods that correct for the imbalance between the two groups.',
            ],
          },
        ],
      },
      {
        id: 'reflection',
        label: 'Reflection',
        title: 'What I take from it',
        blocks: [
          {
            type: 'text',
            paragraphs: [
              'This project taught me how easily a number can look like an answer. A model that explains why it falls short taught me more than a high score would have. It is a habit I bring to the studio as well: look closely, test the assumption, and say plainly what the work does and does not show.',
            ],
          },
          { type: 'link', text: 'See the notebook and report on GitHub', url: 'https://github.com/naf1ss/Sami_SoccerPotentialNationalTeam' },
          {
            type: 'credits',
            text: 'Data: Orkun Aktas, All Football Players Stats in Top 5 Leagues 23/24 (Kaggle); World Cup squads from the jfjelstul/worldcup database. ChatGPT assisted with editing and formatting the written report.',
          },
        ],
      },
    ],
  },
]);
