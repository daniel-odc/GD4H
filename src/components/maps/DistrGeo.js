/* --------------------------------------------------
*   Component displaying the geographic distribution of the dataset coordinates
*   Uses leaflet:
*   `npm install leaflet`
*   `npm install react-leaflet`
*   Note: Need to include in index.html:
*       <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"
          integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ=="
          crossorigin=""
        />
* -------------------------------------------------- */

import React, {useState, useEffect, useMemo} from "react";
import {Alert, Row, Col, Layout, Button, Space, Slider, InputNumber, Radio, Select, Checkbox} from "antd";
import {MapContainer, TileLayer, Marker, Polygon, Tooltip, GeoJSON, useMap} from 'react-leaflet';
import './leaflet.css';
import { booleanPointInPolygon, bbox } from '@turf/turf';


/*  Project components:  */
import {getMinMaxArray, isNull, objToDataframe} from "../../generic_js/generic";
import {MkDoc} from "../doc/MkDoc";
import read_me from "../../i18n/fr/read_me_distrgeo.md";  /*  Map tab instructions  */


/*  GIS layers (GeoJSON) loaded from the cloud bucket:  */
import {loadGeoLayers, emptyGeoLayers} from "../../generic_js/geoLayers";

import Messages from './Message'; // Import the Messages component
import './popup.css'; // Import the CSS file for the popup


import {SimpleRadarChart, SimpleRadarChart2, SimpleRadarChart3 } from "./../../Graphe/SimpleRadarChart";
import {SimpleBarChart, SimpleBarChart2, SimpleBarChart3} from "./../../Graphe/SimpleBarChart";
import {PieChartWithCustomizedLabel, PieChartWithCustomizedLabel2, PieChartWithCustomizedLabel3} from "./../../Graphe/PieChartWithCustomizedLabel"

import "./../../Graphe/styles.css"
import "./../../Graphe/styles2.css"
import "./../../Graphe/styles3.css"



/*  for tests only  */
import {concat, readCSV, toCSV} from "danfojs";

const rowStyle = {padding: 10, marginBottom: 10, marginTop: 10 ,backgroundColor: 'white', textAlign: 'left'}; 

const gutter = [16, 16];
/*  Def values for debugging    */
const loadDfTest = async () => {
    const dfTmp = await readCSV('https://storage.googleapis.com/bucket-test-odc/areas.csv');
    return dfTmp;
}
const listColCoordDef = [[47.43, 2.36], [49.43, 4.36], [48.43, 3.36]]

/*  Check background providers here: https://leaflet-extras.github.io/leaflet-providers/preview/    */
/*  CARTO basemaps API key, set in .env.local (free key: https://carto.com/basemaps/apikey):  */
const cartoApiKey = process.env.REACT_APP_CARTO_API_KEY;
const listTileUrl = [
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                   /*  default OSM */
    'https://{s}.tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png',
    'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png',   /*    stamen  */
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', /*  light   */
    `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,  /*  Positron (CARTO API key required)*/
];
/*  CARTO Positron if an API key is set, OSM otherwise (CARTO tiles only show "API KEY REQUIRED" without key): */
const tileUrl = cartoApiKey ? listTileUrl[listTileUrl.length - 1] : listTileUrl[0];
const tileAttribution = cartoApiKey ?
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>' :
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const zoomDef = 5;          /*  Show full Earth by default  */
const minZoomDef = 3;       /* Show more than full Earth    */
const maxZoomDef = 20;      /* Don't allow too deep zooms   */
const maxNativeZoomDef = cartoApiKey ? 18 : 19;  /* Deepest tiles served (CARTO: 18, OSM: 19), upscaled beyond  */
// const maxNbMk = 100;        /*  max number of markers to display    */
const centerDef = [47.43, 2.36];
const colTooltip = 'tooltip_qge';   /*  tmp column for diplaying the record information on the map  */
// const iconDef = new Icon({
//   iconUrl: './icons/icon_mk.png',
//   iconSize: [25, 25]
// });
// console.log('icon def: ', iconDef);

const {Content} = Layout;

/**
 * Function that creates a tooltip column formatting the information from all df column
 * TO OPTIMIZE!!! only for sample otherwose can get very slow...
 * */
const addColTooltip = (df) => {
    const lCol = df.columns;
    let lTooltip = [];
    /*  Loop through records:   */
    for (let i = 0; i < df.index.length; i++) {
        /*  Loop through columns:   */
        let tooltip = "";
        df.columns.map((col, ic) => {
            let tmpVal = df.iloc({rows: [i], columns: [ic]}).values[0][0];
            // console.log('tmpVal: ', tmpVal);
            tooltip = tooltip + `${col}:\t${tmpVal}\n`
            return tooltip;
        })
        lTooltip.push(tooltip);
    }
    /*  Add the column to the dataframe:    */
    let df2 = df.copy();
    if (lCol.includes(colTooltip)) {
        df2.drop({columns: [colTooltip], inplace: true});
    }
    // console.log('len df: ', df2.index.length, ', len tooltup: ', lTooltip.length);
    df2.addColumn(colTooltip, lTooltip, {inplace: true});
    return df2;
}

/**
 * Formats the tooltip on hover
 * */
const TooltipFormatted = (props) => {
    let tooltip = props.tooltip;

    let rows = tooltip.split('\n');
    let divs = rows.map((row, rx) => {
        /*  split field and value:  */
        let rec = row.split('\t');

        return (<span key={rx}>
            <b>{rec[0]}</b> {rec[1]}<br/>
        </span>)
    })


    return (
        <div>
            {divs}
        </div>
    )
}


const getMonthName = (monthNumber) => {
    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return monthNames[monthNumber - 1];
};

/*  Feature of an indexed layer ({f, bb} list) containing the point [lng, lat]:
    the bounding boxes avoid testing every polygon  */
const locate = (indexed, pt) => indexed.find(({f, bb}) =>
    pt[0] >= bb[0] && pt[0] <= bb[2] && pt[1] >= bb[1] && pt[1] <= bb[3] && booleanPointInPolygon(pt, f.geometry)
)?.f;

/*  Leaflet measures its container once: re-measure when it is resized or shown
    (e.g. map created in a hidden tab, after the address conversion)  */
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(map.getContainer());
        return () => observer.disconnect();
    }, [map]);
    return null;
};

export default function DistrGeo(props) {
    let df = props.df ? props.df : null;
    const listColCoord = props.listColCoord ? props.listColCoord : listColCoordDef;    /*  [['longitude', 'latitude'], [other x, y]]      */

    const [center, setCenter] = useState(centerDef);
    const [markers, setMarkers] = useState(null);
    const [colCoord, setColCoord] = useState(listColCoord[0]);
    const [boundingBox, setBoundingBox] = useState(null);   /*  coordinates bounding box    */
    const [selectedValue, setSelectedValue] = useState('regions');
    const [showZones, setShowZones] = useState(false);     /*  zones (GeoJSON layers) displayed on the map  */
    const [showMessages, setShowMessages] = useState(false);
    const [verificationMessages, setVerificationMessages] = useState([]);
    const [Page , setPage] = useState("carte")

    const [regionCounts, setRegionCounts] = useState({});
    const [departementCounts, setDepartementCounts] = useState({});
    const [isBerSelected, setIsBerSelected] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const colX = colCoord[0];
    const colY = colCoord[1];
    // console.log('col X, col Y: ', colX, colY, isNull(colX), isNull(colY), (!isNull(colX) && !isNull(colY)));

    const [inputValue, setInputValue] = useState(1);  /*  max number of markers to display    */


    const [verificationMessages2, setVerificationMessages2] = useState([]);
    const [showMessages2, setShowMessages2] = useState(false);
    const [dataStructureValid, setDataStructureValid] = useState(true);
    const [occurrencesAnnee, setOccurrencesAnnee] = useState({});                                                   /*verification temporel */
    const [occurrencesMois, setOccurrencesMois] = useState({});
    const [occurrencesJours, setOccurrencesJours] = useState({});
    const [selectedYear, setSelectedYear] = useState("ALL");
    const [selectedMonth, setSelectedMonth] = useState(undefined);

    const [UniqueListeAnnee, setUniqueListeAnnee] = useState([]);

    /*  GIS layers loaded from the cloud bucket:   */
    const [geoLayers, setGeoLayers] = useState(emptyGeoLayers);
    const {regions, departements, communes} = geoLayers;
    useEffect(() => {
        loadGeoLayers()
            .then(setGeoLayers)
            .catch((error) => {
                console.error('Erreur de chargement des couches géographiques: ', error);
                setGeoLayers({...emptyGeoLayers, error: error.message});
            });
    }, []);

    const onChange = (newValue) => {
        setInputValue(newValue);                /* la fnction qui permet de changer le maximum de makers a afficher   */
      };
      
    const btnFrontiere  = (e) => {
        setSelectedValue(e.target.value);                                 /* cette fonction permet de change les limites geographique   */
    }

    const toggleZones = (e) => {
        setShowZones(e.target.checked);
        if (e.target.checked) setSelectedValue('regions');               /*  Régions by default when the zones are displayed */
    }

    const btnPage = (e) => {
        setPage(e.target.value);
    };

    const handleToggle = (e) => {
        setIsBerSelected(e.target.value === 'regions');
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % 3);
      };
    
    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + 3) % 3);
    };



    const funct_rename = (str) => {
        const corrections = {
          "�tablissement": "établissement",
          "r�gion": "région",
          "d�partement": "département",                         /* cette fonction permet de unifier les cles */
          "code insee": "codeInsee",
          "code_insee": "codeInsee",
          "longitude wgs84": "longitude",
          "latitude wgs84": "latitude",
        };
      
        return corrections[str] || str;
      };
      
    const createJson = (df) => {
        const lCol = df["$columns"].map(col => funct_rename(col));
        const data = df["$data"];
      
        // Use an object to check for duplicates
        const uniqueEntries = {};
      
        const formattedData = data.map(row => {
          let obj = {};
          lCol.forEach((colName, index) => {                                                                     /* cette fonction permet de recuperer les donne  transformer en json */

            obj[colName] = row[index];
          });
      
          // Use "code etablissement" as a unique key to check for duplicates (row index if there is no such column)
          const key = lCol.includes('code etablissement') ? obj['code etablissement'] : `row_${Object.keys(uniqueEntries).length}`;
          if (!uniqueEntries[key]) {
            uniqueEntries[key] = obj;
          }
      
          return obj;
        });
      
        // Return only unique values
        return Object.values(uniqueEntries);
      };

    const createJson2 = (df) => {
        const lCol = df["$columns"].map(col => funct_rename(col));
        const data = df["$data"];
      
        const formattedData = data.map(row => {
          let obj = {};
          lCol.forEach((colName, index) => {
            obj[colName] = row[index];
          });
          return obj;
        });
      
        return formattedData;
      };
      
      
     
    const maj = (str) => {
        if (typeof str !== 'string') {
            console.warn('maj(): valeur invalide reçue :', str);
            return '';
        }
        const norm = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const replacedStr = norm.replace(/-/g, ' ').replace(/['’"]/g, '');
        const capitalizedStr = replacedStr.toUpperCase();
        return capitalizedStr;
    }

    /*  INSEE codes as 5-character strings, whether read as text or as numbers (01053 / 1053)  */
    const insee5 = (code) => String(code ?? '').trim().padStart(5, '0');

    /*  Value given in the file for a row (column present and not empty)  */
    const hasValue = (val) => val !== undefined && val !== null && String(val).trim() !== '';

    /*  Lookup tables built once per loaded layers: by name / code, and features with their bounding boxes  */
    const geoIndex = useMemo(() => {
        if (!geoLayers.loaded) return null;
        const withBbox = (features) => features.map((f) => ({f, bb: bbox(f)}));
        return {
            regions: withBbox(regions.features),
            departements: withBbox(departements.features),
            communes: withBbox(communes.features),
            regionByName: new Map(regions.features.map((f) => [maj(f.properties.nom), f])),
            deptByName: new Map(departements.features.map((f) => [maj(f.properties.nom), f])),
            deptByCode: new Map(departements.features.map((f) => [String(f.properties.code), f])),
            communeByCode: new Map(communes.features.map((f) => [insee5(f.properties.code), f])),
        };
    }, [geoLayers]);

    const transformAndExtract = (input) => {
        // Convert the input to a string
        const str = String(input ?? '').trim().padStart(5, '0');
        
        // Extract the first two characters
        const result = str.startsWith('97') ? str.substring(0, 3) : str.substring(0, 2);   /*  overseas: 971...976  */
        

        return result;
    }

    const onEachCountry = (feature, layer) => {
        if (feature.properties && feature.properties.nom) {
            layer.bindPopup(feature.properties.nom);
        }
    };


    const data = createJson(df);  /*without duplicates*/
    const data2 = createJson2(df);  /* with duplicates */

    /*  Point [lng, lat] of an item, read from the coordinate columns shown on the map (null if not valid numbers)  */
    const keyX = funct_rename(colX);
    const keyY = funct_rename(colY);
    const itemPoint = (item) => {
        const x = parseFloat(item[keyX]);
        const y = parseFloat(item[keyY]);
        return (isNaN(x) || isNaN(y)) ? null : [x, y];
    };


    // console.log("les données ",data)
    // console.log("les données2 : ",data2)

    const handleVerification = () => {
        if (!geoIndex) return;
        const messages = [];
    
        data.forEach((item, i) => {
            const pt = itemPoint(item);
            if (!pt) return;    /*  no coordinates for this row */

            /*  Each level is checked only if the file gives it (région / département / code INSEE)  */
            if (hasValue(item.region)) {
                const regionPolygon = geoIndex.regionByName.get(maj(item.region));
                if (!(regionPolygon && booleanPointInPolygon(pt, regionPolygon.geometry))) {
                    const correctRegion = locate(geoIndex.regions, pt);
                    messages.push(`Ligne ${i} - Le marqueur de la commune de ${item.commune} (${pt[1]}, ${pt[0]}) est indiquée dans la région ${correctRegion ? correctRegion.properties.nom : 'région inconnue'} au lieu de ${item.region}.`);
                }
            }
            if (hasValue(item.departement)) {
                const departementPolygon = geoIndex.deptByName.get(maj(item.departement));
                if (!(departementPolygon && booleanPointInPolygon(pt, departementPolygon.geometry))) {
                    const correctDepartement = locate(geoIndex.departements, pt);
                    messages.push(`Ligne ${i} - Le marqueur de la commune de ${item.commune} (${pt[1]}, ${pt[0]}) est indiquée dans le département ${correctDepartement ? correctDepartement.properties.nom : 'département inconnu'} au lieu de ${item.departement}.`);
                }
            }
            if (hasValue(item.codeInsee)) {
                const communePolygon = geoIndex.communeByCode.get(insee5(item.codeInsee));
                if (!(communePolygon && booleanPointInPolygon(pt, communePolygon.geometry))) {
                    const correctCommune = locate(geoIndex.communes, pt);
                    messages.push(`Ligne ${i} - Le marqueur de la commune de ${item.commune} (${pt[1]}, ${pt[0]}) est indiquée dans la commune ${correctCommune ? correctCommune.properties.nom : 'commune inconnue'} au lieu de ${item.commune}.`);
                }
            }
        });
    
        if (messages.length === 0) {
            setVerificationMessages(["Toutes les coordonnées saisies par l'utilisateur correspondent à leur emplacement géographique."]);
        } else {
            setVerificationMessages(messages);
        }
    };
    
    useEffect(() => {
        if (geoLayers.loaded) handleVerification();
    }, [geoLayers]);



    const validateDataStructure = () => {
        return data.every(item => item.hasOwnProperty('date') && item.hasOwnProperty('annee'));
    };

    const handleYearChange = (value) => {
        setSelectedYear(value);
        setSelectedMonth(undefined); // Réinitialise le mois sélectionné lorsque l'année est modifiée
    };
    
    const handleMonthChange = (value) => {
        setSelectedMonth(value);
    };

    const handleVerification2 = () => {
        const messages = [];
        const ListeAnnee = [];
        const ListeMois = [];
        const ListeJours = [];

        data2.map((item, index) => {
            const [jr, ms, an] = item.date.split('/');
            let anneeConvert = parseInt(an);
            let moisConvert = parseInt(ms);
            let jourConvert = parseInt(jr);

            ListeAnnee.push(anneeConvert);
            ListeMois.push(moisConvert);
            ListeJours.push(jourConvert);

            const verification = anneeConvert === item.annee;

            if (!verification) {
                messages.push(`Ligne ${index} - L'année et la date pour la ville de ${item.nom} ne sont pas compatibles, car la date est :  ${item.date} et l'année indiquée est : ${item.annee}`);
            }
        });

        if (messages.length === 0) {
            setVerificationMessages2(["Toutes les années correspondent aux dates indiquées."]);
        } else {
            setVerificationMessages2(messages);
        }

        const uniqueListeAnnee = [...new Set(ListeAnnee)];
        const uniqueListeMois = [1,2,3,4,5,6,7,8,9,10,11,12];
        const uniqueListeJours = [...new Set(ListeJours)];


        const TRieuniqueListeAnnee = uniqueListeAnnee.sort((a, b) => a - b);
        

        const occurrencesAnnee = uniqueListeAnnee.reduce((acc, year) => {
            acc[year] = ListeAnnee.filter(y => y === year).length;
            return acc;
        }, {});

        const occurrencesMois = uniqueListeAnnee.reduce((acc, year) => {
            acc[year] = uniqueListeMois.reduce((accMois, mois) => {
                accMois[mois] = data.filter(item => {
                    const [jr, ms, an] = item.date.split('/');
                    return parseInt(an) === year && parseInt(ms) === mois;
                }).length;
                return accMois;
            }, {});
            return acc;
        }, {});

        const occurrencesJours = uniqueListeAnnee.reduce((acc, year) => {
            acc[year] = uniqueListeMois.reduce((accMois, mois) => {
                accMois[mois] = uniqueListeJours.reduce((accJour, jour) => {
                    accJour[jour] = data.reduce((count, item) => {
                        const [jr, ms, an] = item.date.split('/');
                        return parseInt(an) === year && parseInt(ms) === mois && parseInt(jr) === jour ? count + 1 : count;
                    }, 0);
                    return accJour;
                }, {});
                return accMois;
            }, {});
            return acc;
        }, {});



        setOccurrencesAnnee(occurrencesAnnee);
        setOccurrencesMois(occurrencesMois);
        setOccurrencesJours(occurrencesJours);
        setUniqueListeAnnee(TRieuniqueListeAnnee);

    
    };

    useEffect(() => {
        const isValid = validateDataStructure();
        setDataStructureValid(isValid);

        if (isValid) {
            handleVerification2();
        }
    }, []);
    

    /*  Create markers sample and bounding box  */
    useEffect(() => {
        (async () => {
            // let st = startTime();   /*  only for tests: for measuring computation time  */
            // console.log('input df: ', df);
            if ((df === null) || (df === undefined)) {
                console.log('LOADING TEST DF... FOR DEV ONLY');
                df = await loadDfTest();
                // console.log('df test: ', df);
            } else {
                df = await objToDataframe(df);
                // st = endTime(st, 'Object to dataframe conversion');
            }
            /*  Extract only non-NaN and non zero-values for coordinates */
            // console.log('colX, colY, df: ', colX, colY, df);

            if (!isNull(colX) && !isNull(colY)) {
                // console.log('Extracting non NaN ', colX, colY);
                const idx_na = await df[[colX]].isNa() || df[[colY]].isNa();
                // st = endTime(st, 'Non NaN 1');
                // const idx_zero = idx_na || df[[colX]].eq(0) ||  df[[colY]].ne(0);
                let iloc_ix = [];
                await idx_na.values.map((b, ix) => (!b) && iloc_ix.push(ix));
                let dfPlot = await df.iloc({rows: iloc_ix});
                // st = endTime(st, 'Non NaN records selection');

                // df = df.loc(idx_na);
                // console.log('not idx_na: ', idx_nonna);
                // console.log('nb NA val: ', df.index.length - dfPlot.index.length);
                // df.print();

                /*  Build bounding box: */
                // console.log('col X, Col Y: ', colX, colY);
                // toCSV(dfPlot, {download: true});

                let minMaxX = getMinMaxArray(dfPlot[[colX]].values, true);
                let minMaxY = getMinMaxArray(dfPlot[[colY]].values, true);
                let minX = minMaxX.min.val;
                let minY = minMaxY.min.val;
                let maxX = minMaxX.max.val;
                let maxY = minMaxY.max.val;

                let ix_minX = minMaxX.min.ix;
                let ix_minY = minMaxY.min.ix;
                let ix_maxX = minMaxX.max.ix;
                let ix_maxY = minMaxY.max.ix;

                // console.log(`min X: ${minX} - ix: ${ix_minX}, max X: ${maxX} - ix: ${ix_maxX}, min Y: ${minY} - ix: ${ix_minY}, max Y: ${maxY} - ix: ${ix_maxY}`);
                // st = endTime(st, 'Bounding box calculation');
                setBoundingBox([[minY, minX], [minY, maxX], [maxY, maxX], [maxY, minX]]);

                /*  Get data sample for markers */
                const nbMk = Math.min(inputValue, dfPlot.index.length);
                // console.log(`Showing ${nbMk} markers`);
                let dfSample = null;
                if (nbMk < dfPlot.index.length) {
                    dfSample = await dfPlot.sample(nbMk);
                    /*  Add the records making up the bounding box: */
                    let ixBbox = [ix_minX, ix_minY, ix_maxX, ix_maxY];
                    // console.log('ix bef: ', ixBbox);
                    ixBbox = [...new Set(ixBbox)]; /*  remove duplicates   */
                    dfSample = await concat({dfList: [dfSample, dfPlot.iloc({rows: ixBbox})], axis: 0})
                } else {
                    dfSample = await dfPlot.copy();
                }

                /*  Add tooltip column: */
                dfSample = addColTooltip(dfSample);

                /*  Select only X and Y columns */
                dfSample = await dfSample.loc({columns: [colX, colY, colTooltip]});
                // toCSV(dfSample, {download: true});
                // console.log('dfSample: ', dfSample.values);
                setMarkers(dfSample.values);
                // st = endTime(st, 'Sample markers creation');
            
            }
        })();
    }, [df, listColCoord, inputValue])



    useEffect(() => {
        if (!geoIndex) return;
        // Initialisation des compteurs
        const regionCountsInit = {};
        const departementCountsInit = {};
    
        regions.features.forEach(region => {
            regionCountsInit[region.properties.nom] = 0;
        });
    
        departements.features.forEach(departement => {
            departementCountsInit[departement.properties.nom] = 0;
        });
    
        // Comptage des marqueurs dans chaque région et département
        data.forEach(item => {
            const pt = itemPoint(item);
            if (!pt) return;    /*  no coordinates for this row */
            const regionPolygon = hasValue(item.region) && geoIndex.regionByName.get(maj(item.region));
            const departementPolygon = hasValue(item.departement) && geoIndex.deptByName.get(maj(item.departement)) && geoIndex.deptByCode.get(transformAndExtract(item.codeInsee));
    
            if (regionPolygon && booleanPointInPolygon(pt, regionPolygon.geometry)) {
                if (regionCountsInit.hasOwnProperty(item.region)) {
                    regionCountsInit[item.region]++;
                } else {
                    regionCountsInit[item.region] = 1;
                }
            }
    
            if (departementPolygon && booleanPointInPolygon(pt, departementPolygon.geometry)) {
                if (departementCountsInit.hasOwnProperty(item.departement)) {
                    departementCountsInit[item.departement]++;
                } else {
                    departementCountsInit[item.departement] = 1;
                }
            }
        });

        // console.log("la region counts : ", regionCountsInit);
        // console.log("le departement counts: ", departementCountsInit);
    
        setRegionCounts(regionCountsInit);
        setDepartementCounts(departementCountsInit);
    }, [geoLayers]);
    


    const regionCountsData = Object.keys(regionCounts).map(region => ({
        name: region,
        count: regionCounts[region]
    })).sort((a, b) => b.count - a.count);

    // console.log(regionCountsData)


    const departementCountsData = Object.keys(departementCounts).map(departements => ({
        name: departements,
        count: departementCounts[departements]
    })).sort((a, b) => b.count - a.count);

    return (

        <>
        
        <Layout>

            {/*// ------------------------ Alert message if no markers ------------------------ */}
            {(!markers) && <Col span={24}>
                <Alert
                    title="Pas de coordonnées à afficher sur la carte. Si vous souhaitez convertir des adresses en coordonnées, veuillez vous rendre sur l'onglet 'Conversions géographiques'"
                    type="warning" closable/>
            </Col>}

            {/*// ------------------------ GIS layers loading status ------------------------ */}
            {(!geoLayers.loaded && !geoLayers.error) && <Col span={24}>
                <Alert title="Chargement des contours géographiques (régions, départements, communes)..." type="info"/>
            </Col>}
            {geoLayers.error && <Col span={24}>
                <Alert title={`Les contours géographiques n'ont pas pu être chargés (${geoLayers.error}) : la vérification spatiale n'est pas disponible.`} type="error"/>
            </Col>}

            {/*// ------------------------ Read me -------------------------------------------- */}
            <MkDoc mkFile={read_me}/>

            {/*// ------------------------ Map ------------------------------------------------ */}
            {Page === "carte" && (
                <MapContainer
                    className="leaflet-container"
                    center={center}
                    zoom={zoomDef}
                    minZoom={minZoomDef}
                    maxZoom={maxZoomDef}
                    scrollWheelZoom={true}
                    zoomControl={false}
                >
                    <MapResizer/>
                    <TileLayer
                        attribution={tileAttribution}
                        url={tileUrl}
                        maxZoom={maxZoomDef}
                        maxNativeZoom={maxNativeZoomDef}
                    />

                    {/* Markers:  */}
                    {markers && markers.map((mk, ix) => {
                        // console.log('mk: ', mk, 'tooltip: ', mk[2]);
                        return (
                            <Marker
                                key={ix}
                                position={[mk[1], mk[0]]}
                                // icon={iconDef}
                            >
                                <Tooltip>{<TooltipFormatted tooltip={mk[2]} key={ix}/>}</Tooltip>
                            </Marker>
                        )
                    })
                    }

                    {/* Affichage des données GeoJSON */}
                    {/*  GeoJSON only reads its data on creation: render once the layers are loaded  */}
                    {showZones && geoLayers.loaded && selectedValue === "regions" && <GeoJSON data={regions.features} onEachFeature={onEachCountry} />}
                    {showZones && geoLayers.loaded && selectedValue === "departements" && <GeoJSON data={departements.features} onEachFeature={onEachCountry} />}
                    {showZones && geoLayers.loaded && selectedValue === "communes" && <GeoJSON data={communes.features} onEachFeature={onEachCountry} />}

                    {/* Bounding box:    */}
                    {/* {boundingBox && <Polygon positions={boundingBox}/>} */}
                
                </MapContainer>)}
            {Page === "spatiale" &&(
            
                <div className="leaflet-container2" >

                    <Radio.Group onChange={handleToggle} value={isBerSelected ? 'regions' : 'departements'}  style={{ marginTop: '16px' }}>
                        <Space size="small">
                            <Radio.Button value="regions">Regions</Radio.Button>
                            <Radio.Button value="departements">Departements</Radio.Button>
                        </Space>
                    </Radio.Group>

                    {isBerSelected ?( <div className="container">
                        <div className="grid-container">
                            <div className="grid-item">
                                <SimpleRadarChart data={regionCountsData} />
                            </div>
                            <div className="grid-item">
                                <PieChartWithCustomizedLabel data={regionCountsData} />
                            </div>
                            <div className="grid-item large">
                                <SimpleBarChart data={regionCountsData} />
                            </div>
                        </div>
                    </div>)
                    :
                    (<div className="container2" >
                        <div className="grid-container2">

                            {currentIndex === 0 && <div className="grid-item2">
                                
                                <SimpleBarChart2 data={departementCountsData} />
                            </div>}

                            {currentIndex === 1 && <div className="grid-item2">
                                <PieChartWithCustomizedLabel2 data={departementCountsData} />
                            </div>}

                            {currentIndex === 2 && <div className="grid-item2">
                                <SimpleRadarChart2 data={departementCountsData} />
                            </div>}
                        </div>
                        <div>
                            <Button onClick={handlePrevious}>Précédent</Button>
                            <Button onClick={handleNext}>Suivant</Button>
                        </div>
                    </div>
                    )
                    }

                    
                </div>
            )}


            {Page === "temporel" && (
                <>
                    {selectedYear === undefined || selectedYear === "ALL" && (
                        <div className="container3">
                        <h3>Visualisation graphique de toutes les années </h3>
                        <div className="grid-container3">
                            <div className="grid-item3">
                                <SimpleRadarChart3 data={occurrencesAnnee} />
                            </div>
                            <div className="grid-item3">
                                <PieChartWithCustomizedLabel3 data={occurrencesAnnee} />
                            </div>
                            <div className="grid-item3 large3">
                                <SimpleBarChart3 data={occurrencesAnnee} />
                            </div>
                        </div>
                    </div>
                    )}

                    {selectedYear && selectedYear !== "ALL" && !selectedMonth && (
                        <div className="container3">
                            <h3>Visualisation graphique de l'année : {parseInt(selectedYear)}</h3>
                            <div className="grid-container3">
                                <div className="grid-item3">
                                    <PieChartWithCustomizedLabel3 data={occurrencesMois[parseInt(selectedYear)]} />
                                </div>
                                <div className="grid-item3">
                                    <SimpleRadarChart3 data={occurrencesMois[parseInt(selectedYear)]} />
                                </div>
                                <div className="grid-item3 large3">
                                    <SimpleBarChart3 data={occurrencesMois[parseInt(selectedYear)]} />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedMonth !== undefined && (
                        <div className="container3">
                            <h3>Visualisation graphique du mois de: {getMonthName(parseInt(selectedMonth))} de l'année: {parseInt(selectedYear)} </h3>
                            <div className="grid-container3">
                                <div className="grid-item3">
                                    <PieChartWithCustomizedLabel3 data={occurrencesJours[parseInt(selectedYear)][parseInt(selectedMonth)]} />
                                </div>
                                <div className="grid-item3">
                                    <SimpleRadarChart3 data={occurrencesJours[parseInt(selectedYear)][parseInt(selectedMonth)]} />
                                </div>
                                <div className="grid-item3 large3">
                                    <SimpleBarChart3 data={occurrencesJours[parseInt(selectedYear)][parseInt(selectedMonth)]} />
                                </div>
                            </div>
                        </div>
                    )}

                    <Space size="small">
                    <Select defaultValue="Sélectionnez une Année" style={{ width: 200 }} onChange={handleYearChange} >
                        <Select.Option value="ALL">Voir tout les année</Select.Option>
                        {UniqueListeAnnee.map((annee, index) => (
                            <Select.Option key={index} value={annee}>{annee}</Select.Option>
                        ))}
                    </Select>

                    {selectedYear !== undefined && selectedYear !== "ALL" && (
                        <Select defaultValue="Sélectionnez un mois" style={{ width: 200 }} onChange={handleMonthChange}>
                        <Select.Option value="1">Janvier</Select.Option>
                        <Select.Option value="2">Février</Select.Option>
                        <Select.Option value="3">Mars</Select.Option>
                        <Select.Option value="4">Avril</Select.Option>
                        <Select.Option value="5">Mai</Select.Option>
                        <Select.Option value="6">Juin</Select.Option>
                        <Select.Option value="7">Juillet</Select.Option>
                        <Select.Option value="8">Août</Select.Option>
                        <Select.Option value="9">Septembre</Select.Option>
                        <Select.Option value="10">Octobre</Select.Option>
                        <Select.Option value="11">Novembre</Select.Option>
                        <Select.Option value="12">Décembre</Select.Option>
                        </Select>
                    )}
                    </Space>
                </>
            )}


            {showMessages && (
                <div className="popup">
                    <div className="popup-inner">
                        <Button onClick={() => setShowMessages(false)}>Fermer</Button>
                        <Messages messages={verificationMessages} />
                    </div>
                </div>
            
            )}

            {showMessages2 && (
                <div className="popup">
                    <div className="popup-inner">
                        <Button onClick={() => setShowMessages2(false)}>Fermer</Button>
                        <Messages messages={verificationMessages2} />
                    </div>
                </div>
            )}

        </Layout>

        <Col gutter={gutter} style={rowStyle}>
            <Row >
                <Col span={24}>
                    <h3> le nombre maximum de marqueurs à afficher: </h3>
                </Col>
                <Col span={10}>
                    <Slider min={1} max={2000} onChange={onChange} value={inputValue=="Null"? 1: inputValue} />
                </Col>

                <Col span={4}>
                    <InputNumber min={1} max={2000} style={{ margin: '0 16px' }} step={1} value={inputValue} onChange={onChange} />
                </Col>
            </Row>

            <Row justify="space-between" align="top">
                <Col>
                    <h3><Checkbox checked={showZones} onChange={toggleZones} style={{marginRight: 8}}/>Affichage des zones :</h3>
                        <Radio.Group onChange={btnFrontiere} value={selectedValue} disabled={!showZones}>
                            <Space size="small"> 
                                <Radio.Button value="regions">Régions</Radio.Button>
                                <Radio.Button value="departements">Départements</Radio.Button>
                                <Radio.Button value="communes">Communes</Radio.Button>
                            </Space>
                        </Radio.Group>
                </Col>
            
                <Col>
                    <h3>Voir la carte :</h3>
                    <Radio.Group onChange={btnPage} value={Page}>
                        <Radio.Button value="carte">Carte</Radio.Button>
                    </Radio.Group>
                </Col>
                <Col>
                    <h3>Voir le Graphique :</h3>
                    <Radio.Group onChange={btnPage} value={Page}>
                        <Space size="small">
                            <Radio.Button value="spatiale">Spatial</Radio.Button>
                            <Radio.Button value="temporel"  disabled={!dataStructureValid}>Temporel</Radio.Button>
                        </Space>
                    </Radio.Group>
               
                </Col>   

                <Col>
                    <h3>Faire une Vérification :</h3>
                    <Space size="small">
                        <Button onClick={() => setShowMessages(true)}>Vérification spatiale</Button>
                        <Button onClick={() => setShowMessages2(true)} disabled={!dataStructureValid}>Vérification temporelle</Button>
                    </Space>
                    </Col>
                </Row>
        </Col>

        </>
    )
}