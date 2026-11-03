/**
 * ProjGeo Component
 * -----------------
 * This file defines a React component that allows:
 *   - Displaying and converting address coordinates between different projections (EPSG:4326, EPSG:2154, EPSG:27572).
 *   - Validating coordinates based on the detected source projection.
 *   - Converting coordinates using the proj4 library.
 *   - Displaying results in a table and offering export options in Excel or CSV format via danfojs.
 *
 * Main dependencies:
 *   - React, Ant Design for the interface.
 *   - danfojs for DataFrame manipulation.
 *   - proj4 for coordinate conversion.
 *
 */
import React, {useEffect, useState} from "react";
import {Button, Col, Layout, Row, Select, Spin} from "antd";

import {toCSV, toExcel} from "danfojs";
import proj4 from 'proj4';

import * as dfd from "danfojs";

/*  Generic project libs:   */
import {MkDoc} from "../doc/MkDoc";
import read_me from "../../i18n/fr/read_me_projgeo.md";
import TableOdc from "../layout/TableOdc"; 

/*  Styles  */
// const contentStyle = {padding: 10, margin: 0, minHeight: "calc(100vh - 64px - 48px)", maxWidth: 1800};
const contentStyle = {padding: 10, margin: 0, maxWidth: 2100};
const rowStyle = {padding: 10, marginBottom: 10, backgroundColor: 'white', textAlign: 'left'};
const gutter = [16, 16]; /* horizontal and vertical space between grid elements */
const MAX_ROWS = 100000;

const F___LAT_4326 = 'Latitude EPSG:4326';
const F___LNG_4326 = 'Longitude EPSG:4326';

const F___LAT_2154 = 'Latitude EPSG:2154';
const F___LNG_2154 = 'Longitude EPSG:2154';

const F___LAT_27572  = 'Latitude EPSG:27572';
const F___LNG_27572  = 'Longitude EPSG:27572';

// Nouveaux systèmes de projection DROM et Europe
const F___LAT_3035 = 'Latitude EPSG:3035';  // Europe ETRS89-extended LAEA
const F___LNG_3035 = 'Longitude EPSG:3035';

const F___LAT_5490 = 'Latitude EPSG:5490';  // Martinique/Guadeloupe RGAF09 UTM 20N
const F___LNG_5490 = 'Longitude EPSG:5490';

const F___LAT_2972 = 'Latitude EPSG:2972';  // Guyane RGFG95 UTM 22N
const F___LNG_2972 = 'Longitude EPSG:2972';

const F___LAT_2975 = 'Latitude EPSG:2975';  // Réunion RGR92 UTM 40S
const F___LNG_2975 = 'Longitude EPSG:2975';

const F___LAT_4471 = 'Latitude EPSG:4471';  // Mayotte RGM04 UTM 38S
const F___LNG_4471 = 'Longitude EPSG:4471';

const F_PROJ = "Vérification Projection";

/*  Render functions for new fields in table:   */
const RENDER_FUNC = {};
RENDER_FUNC[F___LAT_4326] = (val) => {
    return <span style={{color: 'purple'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_4326] = (val) => {
    return <span style={{color: 'purple'}}>{val}</span>;
};

RENDER_FUNC[F___LAT_2154] = (val) => {
    return <span style={{color: 'purple'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_2154] = (val) => {
    return <span style={{color: 'purple'}}>{val}</span>;
};

RENDER_FUNC[F___LAT_27572] = (val) => {
    return <span style={{color: 'purple'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_27572] = (val) => {
    return <span style={{color: 'purple'}}>{val}</span>;
};

// Fonctions de rendu pour les nouveaux systèmes DROM et Europe
RENDER_FUNC[F___LAT_3035] = (val) => {
    return <span style={{color: 'blue'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_3035] = (val) => {
    return <span style={{color: 'blue'}}>{val}</span>;
};

RENDER_FUNC[F___LAT_5490] = (val) => {
    return <span style={{color: 'green'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_5490] = (val) => {
    return <span style={{color: 'green'}}>{val}</span>;
};

RENDER_FUNC[F___LAT_2972] = (val) => {
    return <span style={{color: 'orange'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_2972] = (val) => {
    return <span style={{color: 'orange'}}>{val}</span>;
};

RENDER_FUNC[F___LAT_2975] = (val) => {
    return <span style={{color: 'brown'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_2975] = (val) => {
    return <span style={{color: 'brown'}}>{val}</span>;
};

RENDER_FUNC[F___LAT_4471] = (val) => {
    return <span style={{color: 'teal'}}>{val}</span>;
};
RENDER_FUNC[F___LNG_4471] = (val) => {
    return <span style={{color: 'teal'}}>{val}</span>;
};

RENDER_FUNC[F_PROJ] = (val) => {
    return <span style={{color: 'red'}}>{val}</span>;
};


/*  Export format:  */
const EXP_FORMAT = 'xls';   /*  to avoid encoding issues    */

const {Content} = Layout;
const { Option } = Select; 

export default function ProjGeo(props) {
    const listColAddr = props.listColAddr;  /*  list of headers making up the address   */
    const listColCoord = props.listColCoord ? props.listColCoord : [];  /*  list of existing coordinates for comparison with addresses  */
    const df = props.df;    /*  full dataframe as entry */

    const [dfTbl, setDfTbl] = useState(null);
    const [dfExport, setDfExport] = useState(null); /*  Df with all information for export  */

    const [selectedEPSG, setSelectedEPSG] = useState([]);  
    const [projectionOptions, setProjectionOptions] = useState([]); // Déclare l'état pour gérer les options de projection
    const [isExtractionVisible, setIsExtractionVisible] = useState(false);
    const [loadingProj, setLoadingProj] = useState(false);
    const [loadingVerify, setLoadingVerify] = useState(true); 
    const [currentEPSG, setCurrentEPSG] = useState(null);
    const [manualProjection, setManualProjection] = useState(null); // Ajout pour la projection manuelle

    /*  Get number of records:  */
    const nbAddr = df.index.length;

    /*  Get lat and lng field names:    */
    const fLat = listColCoord[0] ? listColCoord[0][1] : null;
    const fLng = listColCoord[0] ? listColCoord[0][0] : null;
    // console.log('flat, flng: ', fLat, fLng);

    const verifyCoordinates = (df, currentEPSG) => {
        let matchResults = [];
    
        // Itérer sur chaque ligne du DataFrame
        for (let j = 0; j < nbAddr; j++) {
            // Récupérer la ligne j sous forme d'un tableau
            const row = df.iloc({ rows: [j] });
            const rowArray = row.values[0];
    
            // Récupérer les indices de colonnes pour la longitude et la latitude
            const colNames = df.columns;
            const fLngIndex = colNames.indexOf(fLng);
            const fLatIndex = colNames.indexOf(fLat);
    
            // Extraire les valeurs
            const lng = rowArray[fLngIndex];
            const lat = rowArray[fLatIndex];
    
            if (
                lat === undefined || lat === null || lat === "" || isNaN(lat) || !isFinite(lat) ||
                lng === undefined || lng === null || lng === "" || isNaN(lng) || !isFinite(lng)
            ) {
                console.warn(`Coordonnées invalides à la ligne ${j + 1}: lat="${lat}", lng="${lng}"`);
                matchResults.push("Non conforme");
                continue;
            }
    
            // Déterminer le système de projection pour la ligne :
            let rowEPSG = null;
            if (typeof currentEPSG === 'string' && currentEPSG.startsWith("EPSG:")) {
                // Si currentEPSG est fourni, tester s'il correspond aux bornes de la ligne
                if (currentEPSG === "EPSG:4326" && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    rowEPSG = "EPSG:4326";
                } else if (currentEPSG === "EPSG:27572" && lng >= -100000 && lng <= 1200000 && lat >= 1600000 && lat <= 3200000) {
                    rowEPSG = "EPSG:27572";
                } else if (currentEPSG === "EPSG:2154" && lng >= 0 && lng <= 1300000 && lat >= 6000000 && lat <= 7200000) {
                    rowEPSG = "EPSG:2154";
                } else if (currentEPSG === "EPSG:3035" && lng >= 2500000 && lng <= 7500000 && lat >= 1500000 && lat <= 5500000) {
                    rowEPSG = "EPSG:3035"; // Europe ETRS89-extended LAEA
                } else if (currentEPSG === "EPSG:5490" && lng >= 150000 && lng <= 900000 && lat >= 1700000 && lat <= 2100000) {
                    rowEPSG = "EPSG:5490"; // Martinique/Guadeloupe RGAF09 UTM 20N
                } else if (currentEPSG === "EPSG:2972" && lng >= 100000 && lng <= 1000000 && lat >= 200000 && lat <= 900000) {
                    rowEPSG = "EPSG:2972"; // Guyane RGFG95 UTM 22N
                } else if (currentEPSG === "EPSG:2975" && lng >= 300000 && lng <= 900000 && lat >= 7600000 && lat <= 8000000) {
                    rowEPSG = "EPSG:2975"; // Réunion RGR92 UTM 40S
                } else if (currentEPSG === "EPSG:4471" && lng >= 500000 && lng <= 900000 && lat >= 8500000 && lat <= 8700000) {
                    rowEPSG = "EPSG:4471"; // Mayotte RGM04 UTM 38S
                }
            }
    
            // Si aucun système n'a été validé à partir de currentEPSG, essayer la détection automatique sur la ligne
            if (!rowEPSG) {
                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    rowEPSG = "EPSG:4326";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:4326`);
                } else if (lng >= -100000 && lng <= 1200000 && lat >= 1600000 && lat <= 3200000) {
                    rowEPSG = "EPSG:27572";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:27572`);
                } else if (lng >= 0 && lng <= 1300000 && lat >= 6000000 && lat <= 7200000) {
                    rowEPSG = "EPSG:2154";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:2154`);
                } else if (lng >= 2500000 && lng <= 7500000 && lat >= 1500000 && lat <= 5500000) {
                    rowEPSG = "EPSG:3035";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:3035 (Europe LAEA)`);
                } else if (lng >= 150000 && lng <= 900000 && lat >= 1700000 && lat <= 2100000) {
                    rowEPSG = "EPSG:5490";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:5490 (Martinique/Guadeloupe)`);
                } else if (lng >= 100000 && lng <= 1000000 && lat >= 200000 && lat <= 900000) {
                    rowEPSG = "EPSG:2972";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:2972 (Guyane)`);
                } else if (lng >= 300000 && lng <= 900000 && lat >= 7600000 && lat <= 8000000) {
                    rowEPSG = "EPSG:2975";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:2975 (Réunion)`);
                } else if (lng >= 500000 && lng <= 900000 && lat >= 8500000 && lat <= 8700000) {
                    rowEPSG = "EPSG:4471";
                    console.info(`Projection détectée à la ligne ${j + 1}: EPSG:4471 (Mayotte)`);
                } else {
                    rowEPSG = "Inconnu";
                    console.error(`Impossible de détecter une projection valide à la ligne ${j + 1}: lat="${lat}", lng="${lng}"`);
                }
            }
            // Stocker le résultat correspondant pour cette ligne
            matchResults.push(rowEPSG !== "Inconnu" ? rowEPSG : "Vérification impossible");
        }
    
        // Préparer le nouveau DataFrame en ajoutant une colonne avec les résultats de vérification par ligne
        let newData = [];
        for (let j = 0; j < df.shape[0]; j++) {
            let rowValues = df.iloc({ rows: [j] }).values[0];
            newData.push([...rowValues, matchResults[j]]);
        }
    
        let newColumns = [...df.columns, "Vérification Projection"];
        let newDf = new dfd.DataFrame(newData, { columns: newColumns });
        return newDf;
    };

    
    /*  Display only addresses columns */
    useEffect(() => {
        (async () => {

            if (!df || !listColAddr || !listColCoord || listColCoord.length === 0) {
                console.error("Les données nécessaires ne sont pas disponibles.");
                return;
            }

            /*  Build the dataframe with only columns for display:  */
            // console.log('listColCoord OPFGEO: ', listColCoord);
            const dfCol = await df.loc({columns: ['key', ...listColAddr, ...listColCoord[0]]});
            // setDfTbl(dfCol);

            let detectedProjection = null;
            
            // Detect source projection from column names
            if (df.columns.includes('Projection')) {
                const projectionValues = new Set(df['Projection'].values);
                if (projectionValues.size === 1) {
                    detectedProjection = Array.from(projectionValues)[0];
                    setCurrentEPSG(detectedProjection);
                }
            }
            
            // verify the column coordinates 
            if (!detectedProjection) {
                const latCol = df.columns.find(col => col.toLowerCase().includes('latitude'));
                const lngCol = df.columns.find(col => col.toLowerCase().includes('longitude'));

                if (latCol && lngCol) {
                    if (latCol.includes('4326') || lngCol.includes('4326') || latCol.includes('wgs84') || lngCol.includes('wgs84')) {
                        detectedProjection = 'EPSG:4326';
                    } else if (latCol.includes('2154') || lngCol.includes('2154') || latCol.includes('lambert93') || lngCol.includes('lambert93')) {
                        detectedProjection = 'EPSG:2154';
                    } else if (latCol.includes('27572') || lngCol.includes('27572') || latCol.includes('lambertii') || lngCol.includes('lambertii')) {
                        detectedProjection = 'EPSG:27572';
                    } else if (latCol.includes('3035') || lngCol.includes('3035') || latCol.includes('laea') || lngCol.includes('europe')) {
                        detectedProjection = 'EPSG:3035';
                    } else if (latCol.includes('5490') || lngCol.includes('5490') || latCol.includes('rgaf09') || latCol.includes('martinique') || latCol.includes('guadeloupe')) {
                        detectedProjection = 'EPSG:5490';
                    } else if (latCol.includes('2972') || lngCol.includes('2972') || latCol.includes('rgfg95') || latCol.includes('guyane')) {
                        detectedProjection = 'EPSG:2972';
                    } else if (latCol.includes('2975') || lngCol.includes('2975') || latCol.includes('rgr92') || latCol.includes('reunion')) {
                        detectedProjection = 'EPSG:2975';
                    } else if (latCol.includes('4471') || lngCol.includes('4471') || latCol.includes('rgm04') || latCol.includes('mayotte')) {
                        detectedProjection = 'EPSG:4471';
                    }

                    if (detectedProjection) {
                        setCurrentEPSG(detectedProjection);
                    }
                }
            }

            // Initialize selectedEPSG with the first available option
            const options = [
                    {
                        value: 'EPSG:4326',
                        label: 'WGS84 (EPSG:4326)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:2154',
                        label: 'Lambert 93 (EPSG:2154)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:27572',
                        label: 'Lambert II (EPSG:27572)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:3035',
                        label: 'ETRS89 LAEA Europe (EPSG:3035)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:5490',
                        label: 'RGAF09 UTM 20N - Martinique/Guadeloupe (EPSG:5490)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:2972',
                        label: 'RGFG95 UTM 22N - Guyane (EPSG:2972)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:2975',
                        label: 'RGR92 UTM 40S - Réunion (EPSG:2975)',
                        disabled: false,
                    },
                    {
                        value: 'EPSG:4471',
                        label: 'RGM04 UTM 38S - Mayotte (EPSG:4471)',
                        disabled: false,
                    },
            ];
            setProjectionOptions(options);
                
            const firstAvailableOption = options.find(option => option.disabled );
            if (firstAvailableOption) {
                    setSelectedEPSG(firstAvailableOption.value);
            }                

            console.log("Current EPSG in useEffect: ", currentEPSG);

            // Verify coordinates
            const newDf = verifyCoordinates(dfCol, detectedProjection || selectedEPSG);
            setDfTbl(newDf);
            setLoadingVerify(false);
        })();
    }, [df, listColAddr, listColCoord])

    const handleConversion = async (targetEPSG) => {

        setLoadingProj(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("Source EPSG:", currentEPSG);
        console.log("Target EPSG:", targetEPSG);

        if (typeof currentEPSG !== 'string' || !currentEPSG.startsWith("EPSG:")) {
            console.error("currentEPSG non défini ou au mauvais format :", currentEPSG);
            setLoadingProj(false);
            return;
        }

        // Define coordinate reference systems (CRS)
        const crsDefinitions = {
            "EPSG:2154": "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
            "EPSG:27572": "+proj=lcc +lat_0=46.8 +lon_0=2.337229167 +lat_1=45.89891888888889 +lat_2=47.69601444444445 +x_0=600000 +y_0=2200000 +datum=NTF +units=m +no_defs",
            "EPSG:4326": "+proj=longlat +datum=WGS84 +no_defs",
            // Nouveaux systèmes DROM et Europe
            "EPSG:3035": "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
            "EPSG:5490": "+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
            "EPSG:2972": "+proj=utm +zone=22 +ellps=GRS80 +towgs84=2,2,-2,0,0,0,0 +units=m +no_defs",
            "EPSG:2975": "+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
            "EPSG:4471": "+proj=utm +zone=38 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
        };
        
        // Register CRS definitions
        Object.entries(crsDefinitions).forEach(([epsg, definition]) => proj4.defs(epsg, definition));

        // Ensure both source and target EPSG are supported
        if (!proj4.defs(currentEPSG) || !proj4.defs(targetEPSG)) {
            console.error("Unsupported coordinate reference system");
            return;
        }

        let xConverted = [];
        let yConverted = [];
        let matchResults = [];

        // Iterate through each row of the DataFrame
        // for (let i = 0; i < df.shape[0]; i++) {
            let i=0;
            const row = df.iloc(i); // Get row as a Series

            for (let j = 0; j < nbAddr; j++) {
                if(i===0){
                    const rowArray = row.values[j]; // Extract row values
                    
                    console.log("Flat: "," Flong",fLat,fLng);
                    // Get column names and indices for longitude/latitude
                    const colNames = df.columns;
                    const fLngIndex = colNames.indexOf(fLng);
                    const fLatIndex = colNames.indexOf(fLat);

                    // Extract longitude and latitude values
                    const lng = rowArray[fLngIndex];
                    const lat = rowArray[fLatIndex];
                
                    // console.log("Extraction : lng : ",lng," lat: ",lat," ligne : ",j);
                    
                    if (
                        lat === undefined || lat === null || lat === "" || isNaN(lat) || !isFinite(lat) ||
                        lng === undefined || lng === null || lng === "" || isNaN(lng) || !isFinite(lng)
                    ) {
                        console.warn(`Coordonnées invalides à la ligne ${j + 1}: lat="${lat}", lng="${lng}" , index lng: "${fLngIndex}",index lat: "${fLatIndex}" `);
                
                        xConverted.push("Valeur manquante");
                        yConverted.push("Valeur manquante");
                        matchResults.push("Non conforme");
                        continue; 
                    }


                    let isMatch = false;
                    let val = "";
                    // Déterminer les bornes attendues en fonction du currentEPSG
                    if (currentEPSG === "EPSG:4326") {
                        // WGS 84 (lat: -90 à 90, lng: -180 à 180)
                        isMatch = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
                        val = "EPSG:4326";
                    } else if (currentEPSG === "EPSG:27572") {
                        // Lambert II Étendu
                        isMatch = lng >= -100000 && lng <= 1200000 && lat >= 1600000 && lat <= 3200000;
                        val = "EPSG:27572";
                    } else if (currentEPSG.startsWith("EPSG:2154")) {
                        // RGF93 Lambert-93 (X environ 0 - 1300000, Y environ 6000000 - 7200000)
                        isMatch = lng >= 0 && lng <= 1300000 && lat >= 6000000 && lat <= 7200000;
                        val = "EPSG:2154";
                    } else if (currentEPSG === "EPSG:3035") {
                        // ETRS89 LAEA Europe
                        isMatch = lng >= 2500000 && lng <= 7500000 && lat >= 1500000 && lat <= 5500000;
                        val = "EPSG:3035";
                    } else if (currentEPSG === "EPSG:5490") {
                        // RGAF09 UTM 20N - Martinique/Guadeloupe
                        isMatch = lng >= 150000 && lng <= 900000 && lat >= 1700000 && lat <= 2100000;
                        val = "EPSG:5490";
                    } else if (currentEPSG === "EPSG:2972") {
                        // RGFG95 UTM 22N - Guyane
                        isMatch = lng >= 100000 && lng <= 1000000 && lat >= 200000 && lat <= 900000;
                        val = "EPSG:2972";
                    } else if (currentEPSG === "EPSG:2975") {
                        // RGR92 UTM 40S - Réunion
                        isMatch = lng >= 300000 && lng <= 900000 && lat >= 7600000 && lat <= 8000000;
                        val = "EPSG:2975";
                    } else if (currentEPSG === "EPSG:4471") {
                        // RGM04 UTM 38S - Mayotte
                        isMatch = lng >= 500000 && lng <= 900000 && lat >= 8500000 && lat <= 8700000;
                        val = "EPSG:4471";
                    } else {
                        isMatch = "Inconnu";
                    }
        
                    // console.log(`index lng: "${fLngIndex}",index lat: "${fLatIndex}`);
                    // Convert coordinates using proj4, we maybe need to add a verification when our isMatch value is incorrect
                    const [convertedX, convertedY] = proj4(currentEPSG, targetEPSG, [lng, lat]);

                    // Store converted coordinates
                    xConverted.push(convertedX);
                    yConverted.push(convertedY);
                    matchResults.push(isMatch === true ? val : isMatch === "Inconnu" ? "Vérification impossible" : "Non conforme");
                }
            }      
        // }

        // Prepare new DataFrame with converted coordinates
        let newData = [];
        for (let i = 0; i < df.shape[0]; i++) {
            let rowValues = df.iloc({ rows: [i] }).values[0]; // Get row values
            newData.push([...rowValues, xConverted[i], yConverted[i],matchResults[i]]); 
        }

        // Define new column names
        let newColumns = [...df.columns, `Longitude ${targetEPSG}`, `Latitude ${targetEPSG}`,`Vérification Projection`];

        // Create a new DataFrame with updated values
        let newDf = new dfd.DataFrame(newData, { columns: newColumns });

        setLoadingProj(false);
        setDfTbl(newDf);
        setIsExtractionVisible(true);
        setDfExport(newDf);
    };
    
    const handleEPSGChange = (value) => {
        setSelectedEPSG(value);
    };

    const handleManualProjectionChange = (value) => {
        setManualProjection(value);
    };

    const handleManualProjectionConfirm = async() => {  
        setCurrentEPSG(manualProjection);
        setManualProjection(null);
        
        // Re-vérifier les coordonnées avec la nouvelle projection manuelle
        setLoadingVerify(true);
        const dfCol = await df.loc({columns: ['key', ...listColAddr, ...listColCoord[0]]});
        const newDf = await verifyCoordinates(dfCol, manualProjection);
        setDfTbl(newDf);
        setLoadingVerify(false);
    };

    const exportResults = () => {
        if (EXP_FORMAT === 'xls') {
            toExcel(dfExport, {download: true});
        } else {
            toCSV(dfExport, {download: true});
        }
    };

    return (
        <Layout>
            <Content style={contentStyle}>

                {/*// ------------------------ Title ------------------------------------------------------ */}
                <Row justify="space-between" align="middle" gutter={gutter} style={rowStyle}>
                    <Col>
                       Projection d'adresses en coordonnées géographiques (latitude, longitude) pour :
                       <br/>• <strong>France métropolitaine :</strong> WGS84 (EPSG:4326), Lambert93 (EPSG:2154), Lambert II étendu (EPSG:27572)
                       <br/>• <strong>DROM :</strong> Martinique/Guadeloupe (EPSG:5490), Guyane (EPSG:2972), Réunion (EPSG:2975), Mayotte (EPSG:4471)
                       <br/>• <strong>Europe :</strong> ETRS89-extended LAEA Europe (EPSG:3035)
                    </Col>
                </Row>


                {/* Row for manual projection selection */}
                {!currentEPSG && (
                <Row justify='start' align="middle" style={{ marginBottom: 15 }}>
                        <Col>
                            <label htmlFor="manual-projection-select">Sélection manuelle du système de projection :</label>
                        </Col>
                        <Col>
                            <Select 
                                id="manual-projection-select" 
                                onChange={handleManualProjectionChange}
                                value={manualProjection}
                                style={{ marginLeft: 10, marginRight: 10, width: 200 }}
                            >
                                {projectionOptions.map(option => (
                                    <Option key={option.value} value={option.value}>
                                        {option.label}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col>
                            <Button 
                                type="primary" 
                                onClick={handleManualProjectionConfirm} 
                                style={{ marginLeft: 15 }}
                                disabled={!manualProjection} // Désactiver si aucune projection n'est sélectionnée
                            >
                                Confirmer
                            </Button>
                        </Col>
                </Row>
                )}
                
                {/* Row for choosing a projection */}
                <Row justify='start' align="middle" style={{ marginBottom: 15 }}>
                    <Col>
                        <label htmlFor="projection-select">Choisir une projection :</label>
                    </Col>
                    <Col>
                        <Select 
                            id="projection-select" 
                            onChange={handleEPSGChange}
                            value={selectedEPSG}
                            disabled={projectionOptions.length === 0}
                            style={{ marginLeft: 10, marginRight: 10, width: 200 }}
                        >
                            {projectionOptions.map(option => (
                                <Option 
                                    key={option.value} 
                                    value={option.value} 
                                    disabled={option.disabled}>
                                    {option.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
                <Row justify='start'  align="middle" style={{ marginBottom: 15 }}>
                    <Col>
                        <span>Système actuel : {currentEPSG}</span>
                    </Col>
                    <Col>
                        <Button 
                            style={{ marginLeft: 15, padding: "15px 10px" }}
                            onClick={() => handleConversion(selectedEPSG)}
                            type="primary"
                        >
                            Projection 
                        </Button>
                    </Col>
                </Row>

                {isExtractionVisible && (
                    <Row justify='start' align="middle" style={{ marginBottom: 15 }}>
                        <Col>
                            <Button 
                                style={{ marginLeft: 15, padding: "15px 10px" }}
                                onClick={exportResults}
                            >
                                Extraire les données
                            </Button>
                        </Col>
                    </Row>
                )}
               
                {/*// ------------------------ Read me ------------------------------------------------ */}
                <MkDoc mkFile={read_me}/>

                {/*// ------------------------ Content -------------------------------------------------- */}
                <Row align="middle" gutter={gutter} style={rowStyle}>             
                    {loadingVerify || loadingProj ? (
                        <Spin tip={`Chargement des données...`} size="large">
                            <div style={{padding: '50px', borderRadius: '5px', width: 150, height: 150}}></div>
                        </Spin>
                    ) : (
                        <TableOdc
                            df={dfTbl}
                            maxRows={MAX_ROWS}
                            render_func={RENDER_FUNC}
                        />
                    )}    
                 
                </Row>

                
            </Content>
        </Layout>
    )
}