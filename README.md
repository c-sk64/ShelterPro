# Shelter Pro 2.0 — Static Modular

A GitHub Pages-compatible progressive web app that does not require Node.js or administrator access.

## Included

- Existing Shelter Pro dashboard and driving workflow preserved
- Live GPS and map functionality preserved
- vWork CSV import preserved
- Today’s Jobs, Route Manager, Search, Favourites and Settings preserved
- Apple Maps, Google Maps and Waze launch options preserved
- CSS moved to `css/app.css`
- JavaScript split into maintainable files under `js/`
- GitHub Pages and iPhone Home Screen support

## Development workflow

1. Work on the `develop` branch.
2. Open `index.html` with Live Server in VS Code.
3. Test changes locally.
4. Commit and push using GitHub Desktop.
5. Merge into `main` only after testing.

No Node.js, npm, Vite or administrator access is required.


## Automatic updates
The app checks `version.json` on GitHub Pages. Publish a new higher version in `version.json`; installed iPhone copies will offer **Update Now**.
