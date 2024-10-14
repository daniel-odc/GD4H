/* --------------------------------------------------
*   Generic functions used across whole app
* -------------------------------------------------- */
import {DataFrame, readCSV, readExcel} from "danfojs";
import axios from "axios";

/**
 * Function that returns the file extension in lowercase
 * */
export const getFileExtension = (fileObj) => {
    return fileObj.name.split('.').pop().toLowerCase();
}

/**
 * Function loading a file into a Danfo dataframe.
 * For now only manages csv, xls, and xlsx
 * Further extensions to manage...
 * @param fileObj: file object
 * */
export const loadDataframe = async (fileObj) => {
    /*  Get the file extension*/
    // const fExt = fileObj.name.split('.').pop().toLowerCase();
    const fExt = getFileExtension(fileObj);
    // console.log('file extension - ', fileObj.name, ': ', fExt);

    let dfTmp = null;
    if (fExt === 'csv') {
        dfTmp = await readCSV(fileObj);
    }
    else if ((fExt === 'xls') || (fExt === 'xlsx')) {
        dfTmp = await readExcel(fileObj);
    }
    else {
        printMsg(`File extension "${fExt}" not managed by the application...`, 'error')
    }
    return dfTmp;
}


export const objToDataframe = (obj) => {
    /**
     *  Function used to make conversions from object to dataframe
     *  Created as React useNavigate converts Danfo DataFrame object to object ==> used to make the conversion back
     * */

    // console.log('converting ', obj, ' to DF: $data?', obj['$dataIncolumnFormat']);
    let df = obj['$data'] ?
        new DataFrame(obj['$data'], {
            columns: obj['$columns'],
            index: obj['$index'],
            dtypes: obj['$dtypes'],
            isSeries: obj['isSeries'],
        }) :
        obj;
    return df;
}

export const arrayToColumns = (options) => {
    /* ******************************************
        *   Transform an array into a JSON object, readable by ant design tables:
        * Ex:
        *   - array: ['col1', 'col2']
        *   - output:
        * columns = [
        *   {
        *   title: 'col1',
        *   dataIndex: 'col1',
        *   key: 'col1',
        *   render: Js function to apply to the data for rendering. TO IMPLEMENT DEPENDING ON THE COL TYPE???
        *   },
        *   ...]
        *
        * Props:
        *   - columns: array of columns names to transform
        *   - provider: 'antd' by default
        *   - keyAsName: if 'true', set the column key as the columns name, if false (default), set as the col idx
        * ****************************************** */
    const colArray = options.columns && options.columns;
    const provider = options.provider ? options.provider : 'antd';
    // const keyAsName = options.keyAsName? options.keyAsName: false;

    // Manage other providers TO DO if necessary
    let columns;
    switch (provider) {
        case 'antd':
            columns = [];
            colArray.forEach((col, idx) => {
                let colObj = {};
                colObj['title'] = col;
                colObj['dataIndex'] = col;
                colObj['key'] = idx;
                columns.push(colObj);
            });
            break;
        default:
            printMsg(`Provider ${provider} to implement for columns array to json transformation`, 'error');
    }
    return columns;
};


/**
 * Function that adds a unique key to the danfo dataframe based on the record number
 * */
export const addKeyToDf = (df, options) => {
    const colKey = options.colKey? options.colKey: 'key';

    let lKeys = Array.from(Array(df.index.length).keys());
    let df2 = df.addColumn(colKey, lKeys);
    return df2;
}


/**
 * Function that extracts the min and max values from an array.
 * Used instead of Math.min(...array) to avoid max call stack errors on large arrays
 * @param array: array
 * @param getIx: False by default, if true, returns a dictionary
 * @returns [min, max]
* */
export const getMinMaxArray = (array, getIx) => {

    let ix = (getIx === undefined)? false: getIx;

    let min = isNull(array[0])? Number.MAX_VALUE: array[0];
    let max = isNull(array[0])? -Number.MAX_VALUE: array[0];
    let ix_min = 0;
    let ix_max = 0;

    for (let i=0; i<array.length; i++) {
        let val = array[i];
        if (!isNull(val)) {
            if (val < min) {
                ix_min = i;
                min = val;
            }
            if (val > max) {
                ix_max = i;
                max = val;
            }
            // min = (val < min) ? val : min;
            // max = (val > max) ? val : max;
        }
    }
    /*  Check if min and max values found   */
    min = (min === Number.MAX_VALUE)? null: min;
    max = (max === -Number.MAX_VALUE)? null: max;

    let returnedVal = ix?
        {'min': {'val': min, 'ix': ix_min}, 'max': {'val': max, 'ix': ix_max}}:
        [min, max];

    return returnedVal;
}


/**
 * Function that loads a markdown file content
 * @param file:
 * @returns markdown content
 * */
export function loadMarkdown(file) {
    return new Promise(function (resolve, reject) {
        axios({
            method: 'GET',
            url: file,
        })
            .then((response) => {
                const res = response.data;
                // console.log('Fetching data from ', file);
                resolve(res);
            }).catch((error) => {
            reject(error);
            if (error.response) {
                console.log(error.response);
                console.log(error.response.status);
                console.log(error.response.headers);
            }
        })
    })
}

/**
 * Function that checks both null or undefined
 * */
export const isNull = (val) => {
    if ((val === null) || (val === undefined)) {
        return true;
    }
    else {
        return false;
    }
}

/* -------------------------------------------------------------------
*   User communication functions
* ------------------------------------------------------------------- */
export function printMsg(msg, msgType, debug) {
    /* ---------------------------------------
    *  Function that logs a message to the console
    * Props:
    *   - msg:      the message to be displayed
    *   - msgType:  null, 'error' or 'warning'
    *   - debug:    if set to false, message is not displayed
    * --------------------------------------- */
    const showMsg = debug ? debug : true; // only shows the message if debug is true

    if (!showMsg) return;

    const msgHead = {
        'error': '************ ERROR *************',
        'warning': '************ WARNING *************',
    };
    const msgTail = {
        'error': '*********************************',
        'warning': '*********************************',
    };
    msgType && console.log(msgHead[msgType]);
    console.log(msg);
    msgType && console.log(msgTail[msgType]);
}

/**
 * Function that formats a number as string for display.
 * Ex: 10000.454564 ==> "10 000.45"
 * @param number: float or integer
 * @param nbDigits: number of digits
 * @param decSep: thousands separators: default ' '
 * @param asPerc: if to be shown as percentage
 * @returns number as string string
 * */
export function formatNumber(number, nbDigits, decSep, asPerc){
    let sep = decSep ? decSep : ' ';
    let acc = nbDigits ? nbDigits : 0;
    let perc = asPerc? asPerc: false;

    let dictLocal = {' ': 'fr-FR', ',': 'en-GB'};
    let local = dictLocal[sep] ? dictLocal[sep] : 'fr-FR';

    /* Test first if number is a number: */
    if (typeof (number) !== 'number') {
        printMsg(`${number} passed to function "formatNumber" is not a number`, 'warning');
        return number;
    }

    /*  convert to % if required   */
    let numb2 = perc? 100*number: number;
    let suff = perc? '%': ''

    // // console.log('local: ', local, number.toFixed(acc).toLocaleString());
    let numbStr = numb2.toLocaleString(local, {maximumFractionDigits: acc}) + suff;
    return numbStr;
}

export function startTime() {
    /* ******************************************
    *   used together with endTime() to compute function execution time:
    *   >> const st = startTime();
    *   >> await myFunction();
    *   >> endTime(st);
    * ****************************************** */
    return Date.now();
}


export function endTime(start_time, comment) {
    /* ******************************************
    *   used together with startTime() to compute function execution time:
    *   >> const st = startTime();
    *   >> await myFunction();
    *   >> endTime(st);
    * ****************************************** */
    const max_ms = 5000;    // below 5000ms, we show the ms

    const comment2 = comment ? `** ${comment} ** ` : '';
    const end_time = Date.now();
    const dt_ms = end_time - start_time;
    const dt = new Date(dt_ms);
    // console.log(end_time-start_time, 'ms');
    const time_str = `${("0" + dt.getUTCHours()).slice(-2)}:${("0" + dt.getUTCMinutes()).slice(-2)}:${("0" + dt.getUTCSeconds()).slice(-2)}`
    const ms_str = (dt_ms < max_ms) ? ` (${dt_ms} ms)` : '';

    console.log(`Exec time ${comment2}: ${time_str}${ms_str}`);

    return end_time;
}