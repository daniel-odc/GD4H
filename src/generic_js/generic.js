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

/*  Encodings proposed to the user (latin alphabet, Europe).
    Note: browsers decode 'iso-8859-1' / 'latin1' as 'windows-1252' (WHATWG Encoding standard), hence a single entry  */
export const ENCODINGS = [
    {value: 'utf-8', label: 'UTF-8'},
    {value: 'windows-1252', label: "Windows-1252 / Latin-1 (ANSI, Europe de l'Ouest)"},
    {value: 'iso-8859-15', label: "ISO-8859-15 / Latin-9 (Europe de l'Ouest, avec €)"},
    {value: 'windows-1250', label: 'Windows-1250 (Europe centrale)'},
    {value: 'iso-8859-2', label: 'ISO-8859-2 / Latin-2 (Europe centrale)'},
    {value: 'macintosh', label: 'Mac Roman'},
];

const ENCODING_SAMPLE_SIZE = 4 * 1024 * 1024;   /*  bytes read to infer the encoding    */

/**
 * Function inferring the text encoding of a file
 * Valid UTF-8 (or a UTF-8 BOM) is reliable: text in another encoding with accents is almost never valid UTF-8.
 * Otherwise the file is most likely Windows-1252 (Excel "CSV" / "ANSI" export), but this is a guess.
 * @param fileObj: file object
 * @returns {Promise<{encoding: string, certain: boolean}>}
 * */
export const detectEncoding = async (fileObj) => {
    const bytes = new Uint8Array(await fileObj.slice(0, ENCODING_SAMPLE_SIZE).arrayBuffer());
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return {encoding: 'utf-8', certain: true};
    }
    try {
        /*  stream: true so that a character cut at the end of the sample is not an error  */
        new TextDecoder('utf-8', {fatal: true}).decode(bytes, {stream: true});
        return {encoding: 'utf-8', certain: true};
    } catch {
        return {encoding: 'windows-1252', certain: false};
    }
}

/**
 * Function returning the file converted to UTF-8 (unchanged if already UTF-8),
 * so that all later reads of the file (danfo, fileObj.text(), address API upload) get the right characters
 * @param fileObj: file object
 * @param encoding: encoding of the file (one of ENCODINGS values)
 * */
export const toUtf8File = async (fileObj, encoding) => {
    if (encoding === 'utf-8') return fileObj;
    const text = new TextDecoder(encoding).decode(await fileObj.arrayBuffer());
    return new File([text], fileObj.name, {type: fileObj.type, lastModified: fileObj.lastModified});
}

/**
 * Function to detect and fix encoding issues in text
 * Particularly useful for French characters and common encoding problems
 * @param {string} text - The text to fix
 * @returns {string} - The corrected text
 */
export const fixEncodingIssues = (text) => {
    if (typeof text !== 'string') return text;
    
    const hasEncodingIssues = /Ã©|Ã¨|Ã¯|Ã´|Ã |Ã¢|Ã§|Ã¹|Ã»|Ã¶|Ã¤|Ã«|Ã®|Ã¼|Ã±|Ã‰|Ã€|Ã‡|ÃŠ|Ã‹|ÃŽ|ÃÏ|Ã"|Ã•|Ã–|Ã™|Ãš|Ã›|Ãœ|Ã¡|Ã­|Ã³|Ãº|Ã½|ÃÁ|ÃÍ|ÃÓ|ÃÚ|ÃÝ|Ã�|â€™|â€œ|â€�|â€¦|â€"|�/.test(text);
    
    if (!hasEncodingIssues) {
        return text;
    }
    
    // Mapping 
    // const encodingFixes = {
    //     'Ã©': 'é', 'Ã¨': 'è', 'Ã¯': 'ï', 'Ã´': 'ô', 'Ã ': 'à',
    //     'Ã¢': 'â', 'Ã§': 'ç', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¶': 'ö',
    //     'Ã¤': 'ä', 'Ã«': 'ë', 'Ã®': 'î', 'Ã¼': 'ü', 'Ã±': 'ñ',
    //     'Ã‰': 'É', 'Ã€': 'À', 'Ã‡': 'Ç', 'ÃŠ': 'Ê', 'Ã‹': 'Ë',
    //     'ÃŽ': 'Î', 'ÃÏ': 'Ï', 'Ã"': 'Ô', 'Ã•': 'Õ', 'Ã–': 'Ö',
    //     'Ã™': 'Ù', 'Ãš': 'Ú', 'Ã›': 'Û', 'Ãœ': 'Ü',
        
    //     'Ã¡': 'á', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã½': 'ý',
    //     'ÃÁ': 'Á', 'ÃÍ': 'Í', 'ÃÓ': 'Ó', 'ÃÚ': 'Ú', 'ÃÝ': 'Ý',
        
    //     '�': 'é', 'â€™': "'", 'â€œ': '"', 'â€�': '"',
    //     'â€"': '—', 'â€¦': '…',
    // };
    
    let fixedText = text;
    
    // for (const [wrong, correct] of Object.entries(encodingFixes)) {
    //     if (fixedText.includes(wrong)) {
    //         fixedText = fixedText.replace(new RegExp(wrong, 'g'), correct);
    //     }
    // }
    
    // fixedText = fixedText.replace(/�/g, '');
    // if (/\s{2,}/.test(fixedText)) {
    //     fixedText = fixedText.replace(/\s+/g, ' ').trim();
    //}
    return fixedText;
}

/**
 * Function to apply encoding fixes to a DataFrame
 * @param {DataFrame} df - The DataFrame to fix
 * @returns {DataFrame} - The DataFrame with corrected encoding
 */
export const fixDataFrameEncoding = (df) => {
    if (!df || !df.columns) return df;
    
    try {
        // Corriger les noms de colonnes seulement si nécessaire
        const columnMapping = {};
        df.columns.forEach(col => {
            const fixedCol = fixEncodingIssues(col);
            if (fixedCol !== col) {
                columnMapping[col] = fixedCol;
            }
        });
        
        if (Object.keys(columnMapping).length > 0) {
            df = df.rename(columnMapping);
            console.log('Noms de colonnes corrigés:', columnMapping);
        }
        
        // Corriger les données textuelles seulement si des problèmes sont détectés
        df.columns.forEach(col => {
            try {
                const colData = df[col];
                if (colData && colData.values) {
                    // Vérifier un échantillon plus large pour détecter les problèmes d'encodage
                    const sampleSize = Math.min(20, colData.values.length);
                    let hasEncodingIssues = false;
                    let problematicValues = 0;
                    
                    for (let i = 0; i < sampleSize; i++) {
                        const val = colData.values[i];
                        if (val && typeof val === 'string') {
                            const fixedVal = fixEncodingIssues(val);
                            if (fixedVal !== val) {
                                problematicValues++;
                            }
                        }
                    }
                    
                    // Ne corriger que si au moins 10% des valeurs échantillonnées ont des problèmes
                    hasEncodingIssues = (problematicValues / sampleSize) >= 0.1;
                    
                    if (hasEncodingIssues) {
                        const fixedData = colData.values.map(val => 
                            val !== null && val !== undefined && typeof val === 'string' 
                                ? fixEncodingIssues(val) 
                                : val
                        );
                        df.addColumn(col, fixedData, { inplace: true });
                        console.log(`Encodage corrigé pour la colonne: ${col} (${problematicValues}/${sampleSize} valeurs problématiques détectées)`);
                    }
                }
            } catch (colError) {
                console.warn(`Erreur lors de la correction de la colonne ${col}:`, colError);
                // Continuer avec les autres colonnes
            }
        });
        
    } catch (error) {
        console.warn('Erreur lors de la correction d\'encodage du DataFrame:', error);
        // Retourner le DataFrame original en cas d'erreur
    }
    
    return df;
}

/**
 * Function to diagnose encoding issues in the loaded DataFrame
 * Logs information about potential encoding problems
 * @param {DataFrame} df - The DataFrame to diagnose
 */
export const diagnoseEncodingIssues = (df) => {
    if (!df || !df.columns) return;
    
    // console.log('=== Diagnostic d\'encodage ===');
    // console.log('Nombre de colonnes:', df.columns.length);
    // console.log('Colonnes:', df.columns);
    
    df.columns.forEach(col => {
        const fixedCol = fixEncodingIssues(col);
        if (fixedCol !== col) {
            console.log(`Colonne avec problème d'encodage: "${col}" → "${fixedCol}"`);
        }
    });
    
    df.columns.slice(0, 3).forEach(col => { 
        try {
            const colData = df[col];
            if (colData && colData.values) {
                const sampleValues = colData.values.slice(0, 3); 
                sampleValues.forEach((val, idx) => {
                    if (val && typeof val === 'string') {
                        const fixedVal = fixEncodingIssues(val);
                        if (fixedVal !== val) {
                            console.log(`${col}[${idx}]: "${val}" → "${fixedVal}"`);
                        }
                    }
                });
            }
        } catch (error) {
            console.warn(`Erreur lors du diagnostic de la colonne ${col}:`, error);
        }
    });
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
        
        if (dfTmp) {
            //console.log('DataFrame chargé, diagnostic d\'encodage...');
            diagnoseEncodingIssues(dfTmp);
            dfTmp = fixDataFrameEncoding(dfTmp);
            // console.log('Correction d\'encodage terminée');
        }
    }
    else if ((fExt === 'xls') || (fExt === 'xlsx')) {
        dfTmp = await readExcel(fileObj);
        
        if (dfTmp) {
            dfTmp = fixDataFrameEncoding(dfTmp);
        }
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