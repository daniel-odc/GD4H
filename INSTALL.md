# Installation Guide

## Prerequisites

- [Node.js](https://nodejs.org/en/download) **24 LTS** (same major version as the Google App Engine runtime, see
  `app.yaml`).
  The version is pinned in `.nvmrc`: with [nvm-windows](https://github.com/coreybutler/nvm-windows) or `nvm`, run
  `nvm install 24` then `nvm use 24`.

## Quick start

- Download the repo from [Gitlab](https://julie.ineris.fr/dsi/dataviz/applications/qualigeoenvi/-/tree/main), or clone it:
  `git clone https://julie.ineris.fr/dsi/dataviz/applications/qualigeoenvi.git`
- Open the project with your favorite IDE
- Open the terminal and run:
    - `npm install`  *(this will install the dependencies from `package.json`)*
    - `npm start`   *(starts the [Vite](https://vite.dev/) development server on http://localhost:3000)*

## Scripts

| Command                     | Description                                       |
|-----------------------------|---------------------------------------------------|
| `npm start` / `npm run dev` | Development server with hot reload                |
| `npm run build`             | Production build in the `build/` folder           |
| `npm run preview`           | Serves the production build locally               |
| `npm test`                  | Runs the tests with [Vitest](https://vitest.dev/) |

## Dependencies

Main libraries (see `package.json` for versions):

- UI: `react` 19, `antd` 6, `react-router`
- Data: `danfojs` (pinned to 1.1.2: version 1.2.0 forces the `,` CSV delimiter, so `;` files are no longer detected),
  `axios`
- Maps & geo: `leaflet`, `react-leaflet`, `@turf/turf`, `proj4`, `geolib`
- Charts: `recharts`
- Markdown: `react-markdown`, `remark-gfm`

## Environment variables

Copy `.env.example` to `.env.local` (not committed) and fill in the values. Variables prefixed with `REACT_APP_` are
available as `process.env.REACT_APP_*` (mapped in `vite.config.js`), e.g.:

````shell
REACT_APP_CARTO_API_KEY=your-carto-key
REACT_APP_BASE_APP_URL=https://qualigeoenvi.fr
````

- `REACT_APP_CARTO_API_KEY`: [CARTO basemaps](https://carto.com/basemaps/apikey) key for the map background (free tier).
  Without it, the map falls back to OpenStreetMap tiles.
- The values are read at build time and embedded in the JavaScript sent to the browser: they are public. Restrict the
  CARTO key to the app's domains in the CARTO dashboard (CARTO requires a separate key for `localhost`).
- Restart `npm start` after changing `.env.local`.

## Production

Application deployed on Google App Engine. Build the app, then deploy with the `app.yaml` file:

````shell
npm run build
gcloud app deploy
````

`app.yaml`:

````shell
runtime: nodejs24
handlers:
# Serve all static files with url ending with a file extension
- url: /(.*\..+)$
  static_files: build/\1
  upload: build/(.*\..+)$
# Catch all handler to index.html
- url: /.*
  static_files: build/index.html
  upload: build/index.html
  secure: always
````
