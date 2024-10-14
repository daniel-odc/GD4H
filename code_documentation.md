## Introduction

Web application developped with [React.js](https://react.dev/).
For an introduction to React, see for example [Code academy resources](https://www.codecademy.com/learn/react-101). A basic knowledge of Javascript is required.

For a quick development start, see the [installation guide](../../INSTALL.md).

## App url:

> - https://qualigeoenvi.ew.r.appspot.com/ (dev)
>
> - https://qualigeoenvi.fr/ (prod)

## Code structure

```markdown
front/
    │ code_documentation.md
    │ app.yaml                  /*  For App Engine deployment. Not required for development     */
    │ package.json              /*  Installation packages                                       */
    │
    └─── Public/
    │       │ index.html        /*  Change page title and description here                      */
    │   
    └─── src/
          │ index.js
          │ App.js              /*  Header, footer and routes  */
          │   
          └─── components/
          │         │
          │         └─── doc/
          │         │       │ MkDoc.js          /* <MkDoc /> Generic markdown container for instruction sections on each page   */
          │         │
          │         └─── layout/
          │         │       │ HeaderOdc.js      /*  <HeaderMenuOdc /> Generic header component                                  */
          │         │       │ FooterOdc.js      /*  <FooterOdc /> Generic footer component                                      */
          │         │       │ TableOdc.js       /*  <TableOdc /> Generic table component taking a danfo dataframe as an input   */
          │         │    
          │         └─── maps/
          │                 │ leaflet.css       /*  map css style                                                       */
          │                 │ DistrGeo.js       /*  Map component                                                       */
          │                 │ OpGeo.js          /*  Module converting the csv input with addresses fields to lat lng    */
          │   
          └─── data/
          │     │   AppInfo.js                  /*  where the links and navigation header are defined    */
          │   
          └─── generic_js/
          │     │   addressConversion.js        /*  BAN API functions           */
          │     │   fieldsDetection.js          /*  Project specific libraries  */
          │     │   generic.js                  /*  Generic js functions        */
          │
          └─── i18n/
          │     │
          │     └─── fr/
          │         │ read_me_home_page.md      /*  instructions in markdown format of the Home page            */
          │         │ read_me_table_page.md     /*  instructions in markdown format of the field selection page */
          │         │ read_me_distrgeo.md       /*  instructions in markdown format of the Map page             */
          │         │ ...
          │
          └─── img/
          │     │ logo.png                      /*  where the header logo is defined    */
          │   
          └─── pages/
                │ AboutPage.js                  /*  <AboutPage/> component (https://qualigeoenvi.fr/about)  */
                │ HomePage.js                   /*  <HomePage/> component (https://qualigeoenvi.fr/)        */
                │ TablePage.js                  /*  Where the selected table fields are listed              */
                │ DataCheckPage.js              /*  Page with map and address conversion functionalities    */
                │ TemplatePage.js               /*  Template for creating new pages                         */

```

## Code flow

---

### Flow

````markdown

<App />
    │
    └─── <HomePage />                               /*  File selection                              */
            │
            └─── <TablePage />                      /*  Headers display and selection for analysis  */
                    │
                    └─── <DataCheckPage />          /*  Analysis Tabs                               */
                            │
                            └─── <DistrGeo />           /*  Geo data mapping                            */
                            │
                            └─── <OpGeo />              /*  Addresses geo-conversions (BAN API calls)   */
                            

````

### Inputs / Outputs

#### Components

*Note:*

See [Global variables and Object keys](#global-variables-and-object-keys) for a description of the `dataCheck` parameter.

| Component           | Inputs                       | Outputs                                         | Functions call                      |
|---------------------|------------------------------|-------------------------------------------------|-------------------------------------|
| `<HomePage />`      | -                            | `{fileObj: 'geofile.csv', df: Danfo dataframe}` | -                                   |
| `<TablePage />`     | `{fileObj, df}`              | `{df: full data, dataCheck: list of columns}`   | `analyseHeaders`                    |
| `<DataCheckPage />` | `{fileObj, df, dataCheck}`   | -                                               | `buildCoordCol` <br> `buildAddrCol` |
| `<DistrGeo />`      | `{df, listColCoord}`         | -                                               | -                                   |
| `<OpGeo />`         | `{fileObj, df, listColAddr}` | -                                               | `addressToLatLng`                   |

#### Functions

| Module              | Function                                        | Inputs      | Outputs                                                            | Comments                                                                                                                  |
|---------------------|-------------------------------------------------|-------------|--------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `fieldsDetection`   | `buildCoordCol`                                 | `dataCheck` | `[['longitude', 'latitude'], ['x', 'y']]`                          | List of 2-element arrays made of `X-Y` column names. For now only handles one pair of values <br> LOGIC TO IMPROVE        |
| `addressConversion` | `addressToLatLng`                               | `fileObj`   | Dataframe with addresses inputs and lat lng added from the BAN API | If the selected file has comma delimiter and commas are present in the fields, this will introduce an offset in the data! |
| `generic`           | `loadDataframe` <br> `loadMarkdown` <br> `etc.` | `...`       | `...`                                                          | All generic functions used in the app                                                                                     |


### Global variables and Object keys

---

````javascript
/*  in fieldsDetection.js:   */
export const KEY_DATE = 'date';
export const KEY_COORD = 'coord';
export const KEY_ADDR = 'addr';
export const KEY_OTHER = 'other';

export const STR_FIELDS = {
    'date': 'Date',
    'coord': 'Coordonnées',
    'addr': 'Adresse',
    'other': 'Autres',
};

export const DATA_CHECK_OBJ = {key: null, col: null, type: null, check: null};
/*  Columns data (in TablePage.js) */
dataCheck = [
    {key: 0, col: 'area_id', type: 'other', check: false},
    {key: 1, col: 'latitude', type: 'coord', check: true},
    // ...
]

/*  Data returned by `analyseHeaders`:  */
typedCol = {
    'col1': {
        'pc_na': 0, // % of NaN records
        'type': 'date', // or 'geo' or 'address' or 'other'
        'check': true
    },
    'col2': '...'
}

````



