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

import React, {useState, useEffect} from "react";
import {Alert, Row, Col, Layout} from "antd";
import {MapContainer, TileLayer, Marker, Polygon, Tooltip} from 'react-leaflet';
import './leaflet.css';

/*  Project components:  */
import {getMinMaxArray, isNull, objToDataframe} from "../../generic_js/generic";
import {MkDoc} from "../doc/MkDoc";
import read_me from "../../i18n/fr/read_me_distrgeo.md";  /*  Map tab instructions  */


/*  for tests only  */
import {concat, readCSV, toCSV} from "danfojs";


/*  Def values for debugging    */
const loadDfTest = async () => {
    const dfTmp = await readCSV('https://storage.googleapis.com/bucket-test-odc/areas.csv');
    return dfTmp;
}
const listColCoordDef = [[47.43, 2.36], [49.43, 4.36], [48.43, 3.36]]

/*  Check background providers here: https://leaflet-extras.github.io/leaflet-providers/preview/    */
const listTileUrl = [
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                   /*  default OSM */
    'https://{s}.tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png',
    'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png',   /*    stamen  */
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', /*  light   */
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',          /*  Positron*/
];
const tileUrl = listTileUrl[listTileUrl.length - 1];

const zoomDef = 1;          /*  Show full Earth by default  */
const minZoomDef = 0;       /* Show more than full Earth    */
const maxZoomDef = 15;      /* Don't allow too deep zooms   */
const maxNbMk = 100;        /*  max number of markers to display    */
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

export default function DistrGeo(props) {
    let df = props.df ? props.df : null;
    const listColCoord = props.listColCoord ? props.listColCoord : listColCoordDef;    /*  [['longitude', 'latitude'], [other x, y]]      */

    const [center, setCenter] = useState(centerDef);
    const [markers, setMarkers] = useState(null);
    const [colCoord, setColCoord] = useState(listColCoord[0]);
    const [boundingBox, setBoundingBox] = useState(null);   /*  coordinates bounding box    */

    const colX = colCoord[0];
    const colY = colCoord[1];
    // console.log('col X, col Y: ', colX, colY, isNull(colX), isNull(colY), (!isNull(colX) && !isNull(colY)));

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
                const nbMk = Math.min(maxNbMk, dfPlot.index.length);
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
    }, [df, listColCoord])

    return (
        <Layout>

            {/*// ------------------------ Alert message if no markers ------------------------ */}
            {(!markers) && <Col span={24}>
                <Alert
                    message="Pas de coordonnées à afficher sur la carte. Si vous souhaitez convertir des adresses en coordonnées, veuillez vous rendre sur l'onglet 'Conversions géographiques'"
                    type="warning" closable/>
            </Col>}

            {/*// ------------------------ Read me -------------------------------------------- */}
            <MkDoc mkFile={read_me}/>

            {/*// ------------------------ Map ------------------------------------------------ */}
            <MapContainer
                className="leaflet-container"
                center={center}
                zoom={zoomDef}
                minZoom={minZoomDef}
                maxZoom={maxZoomDef}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={tileUrl}
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

                {/* Bounding box:    */}
                {boundingBox && <Polygon positions={boundingBox}/>}

            </MapContainer>
        </Layout>

    )
}