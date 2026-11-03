# Installation Guide

## Prerequisites

- [Node.js](https://nodejs.org/en/download) **24 LTS** (same major version as the Google App Engine runtime, see `app.yaml`).
  The version is pinned in `.nvmrc`: with [nvm-windows](https://github.com/coreybutler/nvm-windows) or `nvm`, run `nvm install 24` then `nvm use 24`.

## Quick start

- Download the repo from [Gitlab](https://gitlab.com/data-challenge-gd4h/qualigeoenvi/-/tree/main)
- Open the project with your favorite IDE
- Open the terminal and run:
  - `npm install`  *(this will install the dependencies from `package.json`)*
  - `npm start`   *(starts the [Vite](https://vite.dev/) development server on http://localhost:3000)*

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Development server with hot reload |
| `npm run build` | Production build in the `build/` folder |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the tests with [Vitest](https://vitest.dev/) |

## Dependencies

Main libraries (see `package.json` for versions):

- UI: `react`, `antd`, `@ant-design/icons`, `react-router`
- Data: `danfojs`, `axios`
- Maps & geo: `leaflet`, `react-leaflet`, `@turf/turf`, `proj4`, `geolib`
- Charts: `recharts`
- Markdown: `react-markdown`, `remark-gfm`

## Environment variables

Vite only exposes variables prefixed with `VITE_` (in a `.env` file at the project root), e.g.:

````shell
VITE_BASE_APP_URL=https://qualigeoenvi.fr
````

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
