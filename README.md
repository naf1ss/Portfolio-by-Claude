# nuances by nafis

Portfolio of Nafis, an art student working in painting, ceramics, prints, digital art and drawing.
A plain static site: HTML, CSS and a little JavaScript. No build step, no framework, no third-party requests.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `work.html`, `about.html`, `contact.html` | The four pages |
| `css/styles.css` | All styling: tokens, layout, gallery, viewer |
| `js/works-data.js` | **The catalogue.** One record per work (title, year, medium, category, image info) |
| `js/site-config.js` | Featured works on the home page, public contact details |
| `js/works-utils.js` | Pure helpers (srcset, filtering, captions); unit tested |
| `js/gallery.js`, `js/lightbox.js`, `js/pages.js` | Gallery tiles and filters, full-screen viewer, per-page wiring |
| `images/` | Web-sized copies of the artwork (`artwork/`, `ceramics/`), three widths each |
| `fonts/` | Self-hosted Instrument Serif and Hanken Grotesk (SIL OFL) |
| `tools/optimize_images.py` | Makes web-sized, metadata-free copies of new photos |
| `tests/` | Unit tests and catalogue checks |

## Preview locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Tests

```sh
npm test    # Node 20+; no dependencies to install
```

The catalogue checks also confirm every image referenced in `works-data.js` exists in `images/`.

## Adding or changing work

1. Export the photo and run `python3 tools/optimize_images.py <folder-with-new-photos> images/artwork`.
2. Paste the printed record into `js/works-data.js` and fill in `id`, `title`, `year`, `medium`, `dimensions` and `category`
   (`painting`, `mixed`, `drawing`, `print`, `digital` or `ceramics`).
3. To feature it on the home page, add its `id` to `featuredIds` in `js/site-config.js`.
4. Run `npm test`, then commit and push.

Each work gets a shareable link: `work.html#a012` opens that piece, and `work.html?c=print` opens a filtered view.

## Publishing with GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, then choose `main` and `/ (root)`.
The site is then served at `https://<username>.github.io/<repository>/`. All paths are relative, so it works under that sub-path
and on a custom domain without changes.
