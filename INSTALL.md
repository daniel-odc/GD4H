# Installation Guide

## Quick start

- Download the repo from [Gitlab](https://gitlab.com/data-challenge-gd4h/qualigeoenvi/-/tree/main)
- Open the project with your favorite IDE (tested with Pycharm 2023.1.2 and VS Code 1.79)
- Open the terminal and run:
  - `cd code/front`
  - `npm install`  *(this will install the dependencies from `package.json`)*
  - `npm start`   *(starts the development server)*

If after trying to run the app locally an error occurs mentionning `@babel` as a missing dependency, run the following in the terminal:

`npm install @babel`

## Dependencies

### React
`cd code/front`

`npm install antd`

`npm install react-router-dom`

`npm install danfojs`

`npm install leaflet`

`npm install react-leaflet`

/*  for react scripts compatibility */
`npm install @babel`

/* for markdown management: */

`npm install react-markdown`

`npm install axios`     

`npm install remark-gfm`

/*  for distance calculation:   */

`npm install geolib`

### Python

## Development

- Open the project with your favorite IDE (tested with Pycharm 2023.1.2 and VS Code 1.79)
- Open the terminal and run:
  - `cd code/front`
  - `npm install`  *(this will install the dependencies from `package.json`)*
  - `npm start`   *(starts the development server)*


## Production

Application deployed on Google App Engine. For app deployment, add an `app.yaml` file:

````shell
runtime: nodejs16
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