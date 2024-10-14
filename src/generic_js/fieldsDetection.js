/* --------------------------------------------------
*   Project-specific functions identifying the fields types
*   ==> Module to improve
* -------------------------------------------------- */

/*  Global values   */
/*      List of strings identifying dates fields: TO COMPLETE   */
import {printMsg} from "./generic";

const L_DATE_STR = ['date'];
/*      List of strings identifying address fields: TO COMPLETE   */
const L_ADDR_STR = ['adresse', 'rue', 'bd', 'ville', 'commune', 'departement', 'codgeo',
    'code insee', 'code postal', 'code_insee', 'code_postal', 'code commune', 'code_commune'];

/*      List of x-geo, y-geo fields    */
const L_X_COORD = ['longitude', 'lng', 'long']; /*  , 'x' not applicable as too many fields might have 'x' in them  */
const L_Y_COORD = ['latitude', 'lat']; /*  , 'y' not applicable as too many fields might have 'y' in them  */

/*      List of strings identifying coordinates fields: TO COMPLETE   */
const L_COORD_STR = [...L_X_COORD, ...L_Y_COORD];

/*      Keys defining the 'date' and 'coordinate' fields
*       UPDATE in STR_FIELDS if updated here...          */
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

/**
 *  Function that formats the column name to lower case and remove accents etc.
 */
export function formatName(colName) {
    let nameTmp = colName.toLowerCase();
    nameTmp = nameTmp.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return nameTmp;
}

/**
 * Function that calls formatName() to format all headers from the input dataframe
 * @param df: danfo dataframe
 * */
export function formatDfColumnNames(df) {
    let colMapping = {};
    df.columns.map(col => {
        colMapping[col] = formatName(col);
    });
    return df.rename(colMapping);
}

/**
 * Function that returns a list of column names from a list of DATA_CHECK_OBJ
 * @param dataCheck: list of DATA_CHECK_OBJ type objects
 * @returns listCol: ['latitude', 'longitude', 'date', '...']
 * */
function listColFromObj(dataCheck) {
    let listCol = [];
    /*  Loop through dataCheck  */
    dataCheck.map(obj => {
        listCol.push(obj['col']);
    })
    return listCol;
}

/**
 * Function that given a list of columns which types have been identified, returns only the sub-object for a given type
 * @param dataCheck: [
 *     {key: 0, col: 'area_id', type: 'other', check: false},
 *     {key: 1, col: 'latitude', type: 'coord', check: true},
 *     // ...
 * ]
 * @param colType: 'coord', 'addr', 'date' or 'other'
 * @param checkedOnly: true by default
 * @returns subDataCheck: [...]
 * */
export function extractColType(dataCheck, colType, checkedOnly) {
    const checked = (checkedOnly === undefined) ? true : checkedOnly;

    let subDataCheck = [];
    /*  Loop through object entries and */
    dataCheck.map(obj => {
        if (obj['type'] === colType) {
            if ((obj['check'] === true) || (!checked)) {
                subDataCheck.push({...obj});
            }
        }
    })
    return subDataCheck;
}

/**
 * Function that given the header name returns the type ('geo', 'date' or 'other') and whether should be checked or not
 * TO COMPLETE
 * @param {string} colName: name of the header
 * @returns {object}
 */
export const detectColType = (colName) => {
    /*  returned object */
    let colType = {'type': KEY_OTHER, 'check': false};

    /*  convert colName to ascii and lower case */
    let nameTmp = formatName(colName);

    const getColType = (cName, key, lVal) => {
        /*  Sub function that loops through lVal to check if colName contains the substring in lVal */
        for (let i = 0; i < lVal.length; i++) {
            let tmpStr = lVal[i];
            if (cName.includes(tmpStr)) {
                colType['type'] = key;
                colType['check'] = true;
                return colType;
            }
        }
        return null;
    }

    /*  Check values in col name:   */
    /*      Dates:                  */
    if (getColType(nameTmp, KEY_DATE, L_DATE_STR) !== null) return colType;
    /*      coordinates:            */
    if (getColType(nameTmp, KEY_COORD, L_COORD_STR) !== null) return colType;
    /*      addresses:              */
    if (getColType(nameTmp, KEY_ADDR, L_ADDR_STR) !== null) return colType;
    return colType;
}

/**
 * Function that analyses the headers from the dataframe and returns an array of dict:
 * @param {danfo df} df: dataframe
 * @returns {object}: {'col1': {
 *                      'pc_full': 1, // % of records full
 *                      'type': 'date', 'geo' or 'other',
 *                      'check': true
 *                      },
 *                      'col2': ...
 *                      }
 * */
export const analyseHeaders = (df, options) => {
    const listCol = df.columns;
    // const objCol = {'pc_na': null, 'type': null, 'check': null};  /*  base dict structure */
    const typedCol = {};    /*  Dictionary with one entry per column */

    /*  Loop through col df to get the type of each column:    */
    for (let i = 0; i < listCol.length; i++) {
        let colName = listCol[i];
        let colKey = formatName(colName);
        // console.log('colName: ', colName, 'colKey: ', colKey, formatName('GDééçààqdgjÉ'));
        // typedCol[colKey] = {...objCol};
        /*  logic to apply  */
        typedCol[colKey] = {...detectColType(colName)};
    }

    /*  Analyse records (% filled-in values)    */
    let attrNa = analyseRecords(df);
    for (const [col, attr] of Object.entries(attrNa)) {
        typedCol[col]['pc_na'] = attr['pc_na'];
    }

    return typedCol;

}

/**
 * Function that analyses the completness of each dataframe attribute.
 * Returns for each attribute the % of records with non NaN values
 * other information TO DO
 * @param df: danfo dataframe
 * @returns dict: {col1: {nb_na: nb_na, pc_na: pc_na}, ...}
 * */
function analyseRecords(df) {
    const nbRec = df.index.length; /*   total number of records */

    /*  Loop through the columns and get the number of records  */
    let attrNa = {};
    df.columns.map(col => {
        /*  Get the number of NaN values:    */
        let idx_na = df[[col]].isNa();
        let nbNan = 0;
        idx_na.values.map(b => {
            (b) && nbNan++
        });
        let pcNan = nbNan / nbRec;
        // console.log(`col ${col}: ${nbNan} NaN values`);
        attrNa[col] = {'nb_na': nbNan, 'pc_na': pcNan};
    });

    return attrNa;
}


/**
 * Function that joins the separate coordinate fields into a list of coordinates [lng, lat], [x, y] etc.
 * Note: This returns a list of 2-elements arrays, always [X, Y] ==> [lng, lat] and not [lat, lng]!
 * Note 2: For now, only handles 2 fields ==> TO IMPROVE TO ADD MORE COORDINATES IF NEEDED
 * @param dataCheck: [
 *     {key: 0, col: 'area_id', type: 'other', check: false},
 *     {key: 1, col: 'latitude', type: 'coord', check: true},
 *     {key: 2, col: 'longitude', type: 'coord', check: true},
 *     {key: 3, col: 'x_l93', type: 'coord', check: true},
 *     {key: 4, col: 'y_l93', type: 'coord', check: true},
 *     // ...
 * ]
 * @returns lCoordCol: [['longitude', 'latitude'], ['x_l93', 'y_l93']]
 * */
export const buildCoordCol = (dataCheck) => {

    /*  Extract the coordinates types   */
    const subData = extractColType(dataCheck, KEY_COORD);
    // console.log('dataCheck: ', dataCheck);
    // console.log('subdataCheck: ', subData);

    /*  Build couples [lng, lat], [x, y] etc... */
    let listCol = listColFromObj(subData);
    // console.log('list of columns: ', listCol);

    /*  Apply the logic */
    /*      Check if even number of columns */
    if ((listCol.length % 2) !== 0) {
        printMsg('Non-even number of coordinate fields!', 'error')
        return false;
    }
    let listCoord = []
    let coord = [];
    listCol.map(col => {
        /*  Loop through X values   */
        L_X_COORD.map(x_col => {
            if (col.includes(x_col)) coord[0] = col;
        })
        L_Y_COORD.map(y_col => {
            if (col.includes(y_col)) coord[1] = col;
        })
    })
    listCoord.push([...coord])
    // console.log('listCoord: ', listCoord);
    return listCoord;
}

/**
 * Function that builds a full address string from the concatenation of all address fields
 * Ex: from ['victor Hugo', 'bd', 23, 'Nancy'] builds the address '23 bd Victor Hugo Nancy'
 * ==> returns the list of column names in the correct order to build the address
 * TO COMPLETE (FOR NOW VERY SIMPLE AS BASE ADRESSE NATIONALE API HANDLES FIELDS WITHOUT ARRANGING THEM)
 * @param dataCheck: [
 *     {key: 0, col: 'area_id', type: 'other', check: false},
 *     {key: 1, col: 'rue', type: 'addr', check: true},
 *     {key: 2, col: 'ville', type: 'addr', check: true},
 *     {key: 3, col: 'numero', type: 'addr', check: true},
 *     {key: 4, col: 'longitude', type: 'coord', check: true},
 *     // ...
 * ]
 * @returns lAddrCol: ['num', 'type_voie', 'nom_voie', 'commune']
 * */
export const buildAddrCol = (dataCheck) => {

    /*  Extract the address types   */
    const subData = extractColType(dataCheck, KEY_ADDR);

    // console.log('list addr col: ', subData);
    let listAddr = listColFromObj(subData);
    // console.log('list addr col: ', listAddr);
    return listAddr;

}