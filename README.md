# Device Wiki

Static device wiki, published at https://BunnHack.github.io/device-wiki/.

## Local preview

```sh
python -m http.server 8000
```

Open http://localhost:8000. Serve over HTTP so the device table can fetch `devices.csv`.

## Deploy

GitHub Pages serves the repository root from the `main` branch. Push changes to `main` to publish; `.nojekyll` disables Jekyll processing. No build or secrets are required.

`index.html` contains the homepage; `devices.html` loads the support table from `devices.csv`. Device names link to `device.html?id=CODENAME`, a wiki-style detail page with a contents sidebar, article sections, hardware and feature infoboxes, and saved text-size/page-width preferences. Both pages use the shared parser in `assets/device-data.js`.

The CSV is the source of truth for all 29 device pages. New fields are `Bluetooth`, `GPS`, `CPU`, `Storage`, and `Based by`. Unknown values remain `-`; no hardware or support information is inferred. Feature statuses use `Y` (works), `P` (partial), `N` (broken), and `-` (untested/not recorded). CPU accepts hardware descriptions, Storage accepts a specification or a support status, and Based by accepts a base device name/codename or a text description. A matching base device becomes a link. Article sections explicitly identify missing documentation instead of inventing maintainers or flashing instructions.

Apple product category links select the matching OS tab. Existing homepage guide/resource links are placeholders, and the Apple table entries are sample data.

## Tests

```sh
npm ci
npm test
```

Tests cover CSV parsing, all device pages and table links, OS filtering, sorting, support statuses, appearance controls, error states, and safe text rendering. Dependencies are development-only; deployment remains a plain static site.

Product artwork and the Apple SVG logo are stored locally in `assets/`; see [image sources](assets/SOURCES.md). Generic interface icons are inline SVG. This is an independent wiki, not affiliated with Apple Inc.
