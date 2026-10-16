# nuances by nafis

Portfolio of Nafis, an art student working in painting, ceramics, prints, photography, digital art and drawing.
A plain static site: HTML, CSS and a little JavaScript. No build step, no framework, no third-party requests.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `work.html`, `about.html`, `resume.html`, `contact.html` | The five pages (header and footer are repeated in each) |
| `css/styles.css` | All styling: tokens, layout, gallery, viewer |
| `js/works-data.js` | **The catalogue.** One record per work (title, year, medium, category, image info) |
| `js/works-photography.js` | The photographs: one compact row each (year, real widths, height). Untitled for now |
| `js/site-config.js` | Hero works, featured works, public contact details (email, Instagram, LinkedIn) |
| `js/contact-utils.js` | Turns the contact details into links; unit tested |
| `js/works-utils.js` | Pure helpers (srcset, filtering, captions); unit tested |
| `js/gallery.js`, `js/lightbox.js`, `js/pages.js` | Gallery tiles and filters, full-screen viewer, per-page wiring |
| `images/` | Web-sized copies of the artwork (`artwork/`, `ceramics/`, `photography/`), three widths each (photos: 600, 1100 and 1600 px wide) |
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

The catalogue checks also confirm every image referenced in `works-data.js` and `works-photography.js` exists in `images/`.

## Adding or changing work

1. Export the photo and run `python3 tools/optimize_images.py <folder-with-new-photos> images/artwork`.
2. Paste the printed record into `js/works-data.js` and fill in `id`, `title`, `year`, `medium`, `dimensions` and `category`
   (`painting`, `mixed`, `drawing`, `print`, `digital`, `photography` or `ceramics`).
3. To feature it on the home page, add its `id` to `featuredIds` in `js/site-config.js`. The three hero images are `heroIds`
   (large image first, then the two stacked on the right).
4. Run `npm test`, then commit and push.

Each work gets a shareable link: `work.html#a012` opens that piece, and `work.html?c=print` opens a filtered view.

## Photography

Photographs are listed in `js/works-photography.js` (one `[year, height]` row each; files are `photo-NNNN-600/1200/1800.jpg`, numbered by capture date), sorted last in "All" and shown without captions so they do not swamp the paintings.
To give a photo a title, or move a group into a series, edit its row or move it into `works-data.js`.

## Resume

`resume.html` is plain HTML (edit it directly) and prints cleanly via the "Print or save as PDF" button.
Phone number and school email are deliberately left off the public page.

## Publishing with GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, then choose `main` and `/ (root)`.
The site is then served at `https://<username>.github.io/<repository>/`. All paths are relative, so it works under that sub-path
and on a custom domain without changes.
