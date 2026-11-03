# Device Wiki

Static device wiki, published at https://BunnHack.github.io/device-wiki/.

## Local preview

```sh
python -m http.server 8000
```

Open http://localhost:8000. Serve over HTTP so the device table can fetch `devices.csv`.

## Deploy

GitHub Pages serves the repository root from the `main` branch. Push changes to `main` to publish; `.nojekyll` disables Jekyll processing. No build or secrets are required.

`index.html` contains the homepage; `devices.html` loads the support table from `devices.csv`. Apple product category links select the matching OS tab. Existing guide/resource links are placeholders, and the Apple table entries are sample data.

Product artwork and the Apple SVG logo are stored locally in `assets/`; see [image sources](assets/SOURCES.md). Generic interface icons are inline SVG. This is an independent wiki, not affiliated with Apple Inc.
