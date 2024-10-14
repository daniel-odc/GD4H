/* --------------------------------------------------
*   Module using the BAN (Base Adresse Nationale) API to convert addresses to lat, lng
*   COMPLETE / UPDATE
*   API documentation:
*   https://adresse.data.gouv.fr/api-doc/adresse
*   ==> Module to improve
* -------------------------------------------------- */

import axios from "axios";
import {DataFrame, merge} from "danfojs";
// import {useEffect, useState} from "react";

/*  Generic project libs:   */
import {formatDfColumnNames} from "./fieldsDetection";
import {loadDataframe} from "./generic";

/**
 * to improve to handle "," in records values and to transform to JSON directly */
function csvToObj(csv) {
    // console.log('building csv obj from: ', csv);

    /*  Get the csv delimiter:  */
    const nb_comma = (csv.match(',') || []).length;
    const nb_colon = (csv.match(';') || []).length;
    const csvDel = (nb_comma>nb_colon)? ',': ';';

    const rows = csv.split("\n");
    /*  Drop last row if empty: */
    if (rows.at(-1) === '') {
        rows.pop();
    }

    const columns = rows[0].replace('\r', '').split(csvDel);
    // console.log('columns: ', columns);

    /*  Build object with keys as rows: */
    let csvObj = {};
    columns.map((col) => {
        csvObj[col] = [];
    })
    // console.log('csv obj: ', csvObj);

    rows.slice(1).map((row) => {
        let record = row.replace('\r', '').split(csvDel);
        columns.map((col, ic) => {
            csvObj[col].push(record[ic]);
            return true;
        })
        return true;
    })
    return csvObj;

};


/*  Columns to be returned by the BAN API:   */
const API_COL = ['latitude', 'longitude', 'result_label'];

const COL_PRESERVE = ['latitude', 'longitude']; /*  columns to be preserved if they are in the original file (otherwise API overwrites them)    */

/*  Dictionnary of columns renaming after API output: (to avoid conflict with existing columns) */
const API_RENAME = {
    'latitude': 'lat_api_adresse',
    'longitude': 'lng_api_adresse',
    'result_label': 'adresse_api_adresse',
};

/**
 * Function that takes a file object as an input (csv file with addresses headers) and returns a dataframe with the
 * lat lng extracted
 * Note: If 'latitude' and 'longitude' are columns from the file, the API drops them!!! This function preserves the
 * original columns and renames the API latitude and longitude columns.
 * @param fileObj: obtained via an <input> button
 * @param options: headers making up the address
 * */
export const addressToLatLng = async (fileObj, options) => {

    const resultColumns = options.resultColumns? options.resultColumns: API_COL;
    const colRename = options.colRename? options.colRename: API_RENAME;


    const formData = await new FormData();
    formData.append('data', fileObj);
    /*  Columns to be returned by the API:  */
    resultColumns.map(resCol => {
        formData.append('result_columns', resCol);
    })
    // formData.append('result_columns', 'latitude');
    // formData.append('result_columns', 'longitude');
    // formData.append('result_columns', 'result_label');
    let csvData = null;

    /*  API call    */
    // console.log('posting csv file: ', fileObj);
    await axios({
        method: 'POST',
        url: 'https://api-adresse.data.gouv.fr/search/csv/',
        headers: {ContentType: 'multipart/form-data'},
        data: formData,
    })
        .then((response) => {
            // const res = response.data;
            csvData = response.data;
            // console.log('raw response: ', csvData);

        }).catch((error) => {
            if (error.response) {
                console.log(error.response);
                console.log(error.response.status);
                console.log(error.response.headers);
            }
        })

    /*  Conversion of CSV string data to danfo dataframe    */
    let csvObj = await csvToObj(csvData);
    // console.log('csv data: ', csvObj);
    let dfTmp = new DataFrame(csvObj);
    // console.log('dfTmp: ', dfTmp.head());

    /*  Rename output columns:  */
    dfTmp = dfTmp.rename(colRename);

    /*  Format column names:    */
    dfTmp = formatDfColumnNames(dfTmp);

    /*  Preserve the latitude and longitude field in the original file if appropriate   */
    let dfBase = await loadDataframe(fileObj);
    dfBase = formatDfColumnNames(dfBase);
    let colBase = dfBase.columns;
    let colPreserve = [];
    COL_PRESERVE.map((col) => {
        if (colBase.includes(col)) {
            colPreserve.push(col);
        }
    });
        if (colPreserve.length > 0) {
            console.log('merging with df base to preserve lat and long')
            /*  Create index based on rows: */
            // console.log('df base: ', dfBase.index.length, ', dftmp: ', dfTmp.index.length, [...Array(dfTmp.index.length).keys()]);
            await dfTmp.addColumn('idx_tmp', [...Array(dfTmp.index.length).keys()], {inplace: true});
            await dfBase.addColumn('idx_tmp', [...Array(dfTmp.index.length).keys()], {inplace: true});
            dfBase = dfBase.loc({columns: ['idx_tmp', ...colPreserve]});

            // dfTmp.print();
            // dfBase.print();

            dfTmp = await merge({'left': dfTmp, 'right': dfBase, 'on': ['idx_tmp'], 'how': 'left'});

            /*  drop tmp index: */
            await dfTmp.drop({columns: ['idx_tmp'], inplace: true});
        }

    return dfTmp;


}