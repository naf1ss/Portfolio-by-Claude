# nuances by nafis

Portfolio of Nafis, an art student working in painting, ceramics, prints, photography, digital art and drawing.
A plain static site: HTML, CSS and a little JavaScript. No framework and no third-party requests. The HTML pages are assembled from small templates by a tiny Node script (`npm run build`) and the result is committed, so GitHub Pages serves plain files.

## Layout

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | **Edit pages here.** One file per page: a short front matter block (title, description, extra scripts) followed by that page's own content |
| `src/layout.html`, `src/partials/` | The shared page skeleton, head, header, footer and image viewer |
| `src/site.json` | The nav links, script order and dependencies, font preloads and the footer's copyright year |
| `index.html`, `gallery.html`, `series.html`, `artist-statement.html`, `resume.html`, `contact.html`, `404.html`, plus the redirect pages for old addresses (`redirects` in `src/site.json`) | **Generated** from `src/` by `npm run build`; do not edit by hand |
| `tools/build-pages.js`, `tools/page-builder.js` | The build script and its unit-tested template logic |
| `css/styles.css` | All styling: tokens, layout, gallery, viewer |
| `js/works-data.js` | **The catalogue.** One record per work (title, year, medium, category, image info) |
| `js/works-photography.js` | The photographs: one compact row each (year, real widths, height). Untitled for now |
| `js/site-config.js` | Hero works, featured works, the clock places, public contact details (email, Instagram, LinkedIn). The build also reads the contact details for the footer |
| `js/contact-utils.js` | Turns the contact details into links, composes the note's mailto link and the clocks' times; unit tested |
| `js/contact.js` | Contact page: note composer, copy email, live clocks (`places` in `site-config.js`) |
| `js/painted-text.js` | Fills lettering marked `data-painted` with random photographs or paintings from the catalogue (footer "n.", contact headline) |
| `js/works-utils.js` | Pure helpers (srcset, filtering, captions); unit tested |
| `js/theme-utils.js` | Pure light/dark rules (saved choice beats the device setting); unit tested |
| `js/theme.js` | Header toggle, remembered choice, circular reveal when switching; loads in `<head>` to avoid a flash |
| `js/intro-utils.js` | Pure rule for when the opening animation plays (arrival or reload of the home page); unit tested |
| `js/intro.js` | Opening animation: large "n." that travels into the header logo while the cover closes onto it |
| `js/series-data.js` | Named groups of works for the Series pages (edit here to regroup) |
| `js/magnifier-utils.js`, `js/magnifier.js` | Round hover magnifier: geometry (unit tested) and the lens itself |
| `js/motion.js` | The page-ready signal that starts entrances, and scroll reveals; does nothing when reduced motion is requested |
| `js/hero-window-utils.js`, `js/hero-window.js` | Home hero: the name is cut out of a slideshow of paintings on a canvas. Geometry and timing (unit tested) and the canvas itself |
| `js/site-menu.js` | Phone menu: under 40rem the header links fold behind a Menu button and open as a full-screen panel |
| `js/interactions.js` | Pill hover fill, label roll, magnetic buttons, scroll progress line, "View" label that follows the pointer over pictures |
| `js/gallery.js`, `js/medium-picker.js`, `js/lightbox.js`, `js/pages.js` | Gallery tiles, the medium picker, full-screen viewer, per-page wiring |
| `js/gallery-room-utils.js`, `js/gallery-room.js` | The gallery room for paintings, drawings and prints: real sizes, grouping and scale (unit tested) and the lit wall itself |
| `images/room/`, `tools/room-textures.html` | The room's plaster and oak-floor textures, and the seeded generator that drew them (open it in a browser to redraw) |
| `images/` | Web-sized copies of the artwork (`artwork/`, `ceramics/`, `photography/`), three widths each (photos: 600, 1100 and 1600 px wide) |
| `fonts/` | Self-hosted Bodoni Moda (headings), Cormorant Garamond (reading text) and Manrope (labels), all SIL OFL |
| `tools/stamp-assets.js` | Content-hash stamps for css/js addresses (used by the build) |
| `tools/optimize_images.py` | Makes web-sized, metadata-free copies of new photos |
| `tools/cutout-portrait.py` | Cuts a subject out of a black backdrop into transparent, optionally sharpened WebP files (`images/about/`, `images/gallery/`) |
| `tests/` | Unit tests and catalogue checks |

## Colours

Text is only black, white or the accent: blue on the white light theme, red on the black dark theme (`--ink`, `--on-ink`, `--accent` in the tokens at the top of `css/styles.css`; the footer is always black
with white text). Secondary text uses the same colour and is set apart by size and weight, via `--ink-muted`.
To bring back a softer grey, change that one token.

## Preview locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Tests

```sh
npm test    # Node 20+; no dependencies to install
```

The catalogue checks also confirm every image referenced in `works-data.js` and `works-photography.js` exists in `images/`.

## Adding or changing work

1. Export the photo and run `python3 tools/optimize_images.py <folder-with-new-photos> images/artwork`.
2. Paste the printed record into `js/works-data.js` and fill in `id`, `title`, `year`, `medium`, `dimensions` and `category`
   (`painting`, `drawing`, `print`, `digital`, `photography`, `ceramics` or `wall-magazine`).
3. The home page's big "Latest work" is `latestId` in `js/site-config.js`; "Browse by medium" shows a small picture beside each medium (`mediumPicks`): the `best` work on a visitor's first home page of a session, a random work of that medium after that. The hero's "nuances." scans through every visible painting and print automatically (`heroCategories`), opening with the works in `heroLead`; hide a work from it with `hidden: true` in its record.
4. Run `npm test`, then commit and push.

If you later replace a photo under the same file name (a re-edit), bump that record's `rev` in `js/works-data.js` (`rev: 2`, then `3`, ...) so visitors' browsers fetch the new picture instead of a cached one.

Each work gets a shareable link: `gallery.html#a012` opens that piece, and `gallery.html?c=print` opens a filtered view (`?c=all` for everything; with no `?c=` the gallery opens on Painting).

### Series write-ups

A series can be told as a write-up instead of a grid: pictures beside their words (an intro, one chapter per work, a closing). Add it to `js/series-stories.js` under the series' `id`; see the Cross-Wired entry and the format at the top of that file.

### The gallery room

Paintings, drawings and prints open on a wall instead of a grid (the Wall / Grid choice is remembered). The medium picker (`js/medium-picker.js`) takes three forms that share one state: on wide screens, small lettered media above the grid, or a "You are in Prints" placard in the corner of the wall whose menu pictures each medium; on phones, a frosted-glass capsule that floats over the wall or the grid. Works hang in gallery order at true relative size, read from `dimensions` (either order, e.g. `12x9 inches`); paintings get a black frame with a dark float gap, drawings and prints a black frame and a white mat (the categories and their framing are `FRAMING` in `js/gallery-room-utils.js`). A series with `hangTogether: true` in `js/series-data.js` hangs on one stretch of wall (Horizon and Three Ways of Seeing do); its label lists the titles left to right (groups of up to four) and links to the series page.

A write-up's top-level `process` (Horizon) sits as a band between the intro and the works; short text is centred beside its picture.

The header's Series menu lists every series in `js/series-data.js` (`"childrenFrom": "series"` in `src/site.json`), so a new series appears there on the next `npm run build`.

On the Series page each card shows up to three works side by side at one height on a plain wall: the series' `coverIds`, or its first three works. The picture lights are on by default; a brass pull cord hanging from the top of the wall turns them off and on. The wall is deep slate in the light theme and deep red in the dark theme (`.room` in `css/styles.css`).

To hang an "About the work" note beside a work, add `notes: '...'` to its record in `js/works-data.js` (for a series hung together, the series' `note` appears under "About the series"). Works hung together in one row each get their own picture light.

## Photography

Photographs are listed in `js/works-photography.js` (one `[year, height]` row each; files are `photo-NNNN-600/1200/1800.jpg`, numbered by capture date), sorted last in "All" and shown without captions so they do not swamp the paintings.
To give a photo a title, or move a group into a series, edit its row or move it into `works-data.js`.

## Resume

`src/pages/resume.html` is plain HTML (edit it, then `npm run build`). Each role is a `.ledger-row`; `js/resume-ledger.js` makes rows collapsible (no script = everything open), and print always shows every row in full. Add a role by copying a row into the list (newest first); add `is-now` to its date for the pulsing "present" dot.
Phone number and school email are deliberately left off the public page.

## Publishing with GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, then choose `main` and `/ (root)`.
The site is then served at `https://<username>.github.io/<repository>/`. All paths are relative, so it works under that sub-path
and on a custom domain without changes.

## After changing a page, the nav, or any CSS or JS

Run `npm run build`. It regenerates the six HTML pages from `src/` and adds a short content hash to every stylesheet and script address (`css/styles.css?v=1a2b3c4d`), so browsers re-download a file the moment it changes instead of showing an old cached copy.
`npm test` fails if any page is out of date, so a forgotten build cannot be pushed unnoticed.

- **Change the nav, footer or viewer:** edit `src/site.json` or the file in `src/partials/`, then build. All pages follow.
- **Add a page:** create `src/pages/<name>.html` (copy `contact.html`'s front matter), add it to `nav` in `src/site.json` if it should be linked, build.
- **Add a script:** put it in `js/`, list it in `scripts` in `src/site.json` (the order there is the load order; add `"requires"` for scripts it depends on), and name it in the `scripts:` line of each page that needs it.
- **Change the copyright year:** `copyrightYear` in `src/site.json`.
