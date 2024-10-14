import React, {useEffect, useRef, useState} from "react";
import {Alert, Button, Col, Layout, Row, Spin, Popconfirm} from "antd";
import {DownloadOutlined, ArrowsAltOutlined, ToolOutlined} from '@ant-design/icons';
import {toCSV, toExcel} from "danfojs";
import {getDistance} from "geolib";

/*  Generic project libs:   */
import {addressToLatLng} from "../../generic_js/addressConversions";
import {MkDoc} from "../doc/MkDoc";
import read_me from "../../i18n/fr/read_me_opgeo.md";
import {addKeyToDf, arrayToColumns} from "../../generic_js/generic";
import TableOdc from "../layout/TableOdc";


/*  Styles  */
// const contentStyle = {padding: 10, margin: 0, minHeight: "calc(100vh - 64px - 48px)", maxWidth: 1800};
const contentStyle = {padding: 10, margin: 0, maxWidth: 2100};
const rowStyle = {padding: 10, marginBottom: 10, backgroundColor: 'white', textAlign: 'left'};
const gutter = [16, 16]; /* horizontal and vertical space between grid elements */
const MAX_ROWS = 10;

const MAX_NB_ADDR = 10000;    /*  Value above which a warning is shown before calling the Address conversion API  */

/*  Output fields from Address API: */
const F_API_LAT = 'lat_api_adresse';
const F_API_LNG = 'lng_api_adresse';
const F_API_ADDR = 'adresse_api_adresse';
const F_DIST = 'distance_coord_adresses_km';

const DIST_WARNING = 2; /*  Distance (in km) under which no warning on difference between address and coordinates   */
const DIST_ERROR = 10; /*  Distance over which it appears in red   */

const API_RENAME = {
    'latitude': F_API_LAT,
    'longitude': F_API_LNG,
    'result_label': F_API_ADDR,
};

/*  Render functions for new fields in table:   */
const RENDER_FUNC = {};
RENDER_FUNC[F_API_LAT] = (val) => {
    return <span style={{color: 'blue'}}>{val}</span>
}
RENDER_FUNC[F_API_LNG] = (val) => {
    return <span style={{color: 'blue'}}>{val}</span>
}
RENDER_FUNC[F_API_ADDR] = (val) => {
    return <span style={{color: 'blue'}}>{val}</span>
}
RENDER_FUNC[F_DIST] = (val) => {
    let colorVal = (val) ? (Math.abs(val) < DIST_WARNING) ?
        'green' : (Math.abs(val) < DIST_ERROR) ? 'orange' : 'red' : 'black';
    let returnedVal = (val) ? val : '-';
    return <span style={{color: colorVal}}>{returnedVal}</span>
}

/*  Export format:  */
const EXP_FORMAT = 'xls';   /*  to avoid encoding issues    */

const {Content} = Layout;


export default function OpGeo(props) {
    const fileObj = props.fileObj;  /*  the selected CSV file to be sent to the Address API */
    const listColAddr = props.listColAddr;  /*  list of headers making up the address   */
    const listColCoord = props.listColCoord ? props.listColCoord : [];  /*  list of existing coordinates for comparison with addresses  */
    const df = props.df;    /*  full dataframe as entry */

    const [dfTbl, setDfTbl] = useState(null);
    const [dfExport, setDfExport] = useState(null); /*  Df with all information for export  */
    const [apiCalled, setApiCalled] = useState(false);  /*  whether or not the addresses are converted  */
    const [loadingApi, setLoadingApi] = useState(false);
    const [nbApiCall, setNbApiCall] = useState(0);
    const [apiWarning, setApiWarning] = useState(null);
    const colCoordRef = useRef([]); /*  inde xof columns of coordinates after the api is called: [colX1, colY1, colX2, colY2] (for comparison between input coordinates and addresses)    */

    const existCoord = (listColCoord[0].length > 1) ? true : false;
    const checkBeforeApiCall = (df.index.length > MAX_NB_ADDR) ? true : false;    /*  to warn user before calling API in case there is a large number of calls to be done*/
    const disableApi = (listColAddr) ? false : true;

    /*  Get number of records:  */
    const nbAddr = df.index.length;

    /*  Get lat and lng field names:    */
    const fLat = listColCoord[0] ? listColCoord[0][1] : null;
    const fLng = listColCoord[0] ? listColCoord[0][0] : null;
    // console.log('flat, flng: ', fLat, fLng);

    /*  Display only addresses columns */
    useEffect(() => {
        (async () => {
            /*  Build the dataframe with only columns for display:  */
            // console.log('listColCoord OPFGEO: ', listColCoord);
            const dfCol = await df.loc({columns: ['key', ...listColAddr, ...listColCoord[0]]});
            setDfTbl(dfCol);
        })();
    }, [])

    /*  Call the API for conversion */

    const callApi = async () => {


        // console.log('Calling API - LIMITATION OF NUMBER OF CALLS TO DO');
        setNbApiCall(prevCount => prevCount + 1);
        // console.log('API called x ', nbApiCall);

        if (nbApiCall === 0) {
            setLoadingApi(true);    /*  to use in loading UI    */
            let dfLatLng = await addressToLatLng(fileObj, {colRename: API_RENAME});   /*  options to complete */
            // console.log('FINAL DF API:');
            // dfLatLng.head().print();

            /*  Add key to returned table:  */
            dfLatLng = addKeyToDf(dfLatLng, {colKey: 'key'});

            /*  Update table: COLUMNS FORMATTING TO DO  */
            setDfTbl(dfLatLng);

            setLoadingApi(false);
            setApiCalled(true);

            /*  Build full df TO DO */
            // console.log('REPLACE FULL DF TO DO');
            setDfExport(dfLatLng);

            /*  Get the columns of coordinates in case we want to compute the distance between them */
            if (listColCoord) {
                // console.log('coord in columns? ', fLng, dfLatLng.columns);
                const colX1 = dfLatLng.columns.indexOf(fLng);
                const colY1 = dfLatLng.columns.indexOf(fLat);
                const colX2 = dfLatLng.columns.indexOf(F_API_LNG);
                const colY2 = dfLatLng.columns.indexOf(F_API_LAT);
                colCoordRef.current = [colX1, colY1, colX2, colY2];
            }
        } else {
            if (loadingApi) {
                setApiWarning("Appel API en cours de traitement, veuillez patienter jusqu'à la fin")
            } else {
                setApiWarning(`Vous avez déjà lancé le traitement ${nbApiCall} fois. \
                Pour éviter un trop grand nombre d'appels API, veuillez vérifier si vous aveez vraiment besoin de relancer l'appel. Si oui, veuillez recharcher la page`)
            }
        }
    };


    const cancelApi = () => {
        console.log('API call canceled...');
    }

    /**
     * Sub function getting the distance row by row
     * */
    function getDist(row) {
        /*  Build points:   */
        /*      Columns indexes in row: */
        const colX1 = colCoordRef.current[0];
        const colY1 = colCoordRef.current[1];
        const colX2 = colCoordRef.current[2];
        const colY2 = colCoordRef.current[3];
        /*      Actual coordinates: */
        const lng1 = parseFloat(row[colX1]);
        const lat1 = parseFloat(row[colY1]);
        const lng2 = parseFloat(row[colX2]);
        const lat2 = parseFloat(row[colY2]);
        /*      Build coordinate object for geolib.getDistance method:  */
        const pt1 = {latitude: lat1, longitude: lng1};
        const pt2 = {latitude: lat2, longitude: lng2};
        /*  Compute distance in km:   */
        const dist = getDistance(pt1, pt2) / 1000;
        return dist;
    }

    const compareCoord = async () => {
        // console.log('comparing coordinates: ', colCoordRef.current);
        // dfTbl.head().print();
        let dfDist = await dfTbl.apply(getDist, {axis: 1});
        let lDist = dfDist.values;
        let dfTmp = await dfExport.addColumn(F_DIST, lDist);

        /*  Sort by distance, descending to see outliers first: */
        await dfTmp.sortValues(F_DIST, {ascending: false, inplace: true});

        setDfExport(dfTmp);
        setDfTbl(dfTmp);
        // dfTmp.head().print();
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
                        Conversions d'adresses en coordonnées géographiques (latitude, longitude)
                    </Col>

                    <Col>

                        {checkBeforeApiCall &&
                            <Popconfirm
                                title="Appel API adresses"
                                description={`Vous allez lancer un appel API pour convertir ${df.index.length} adresses. Cela peut prendre un certain temps. Êtes-vous sûrs de vouloir continuer?`}
                                onConfirm={callApi}
                                onCancel={cancelApi}
                                okText="Oui, continuer"
                                cancelText="Non, abandonner"
                            >
                                <Button disabled={disableApi}>
                                    <ToolOutlined/> Convertir en lat, lng
                                </Button>
                            </Popconfirm>}

                        {!checkBeforeApiCall &&
                            <Button disabled={disableApi} onClick={callApi}>
                                <ToolOutlined/> Convertir en lat, lng
                            </Button>
                        }
                    </Col>

                    {/*// ------------------------ Alert message if no address for conversion ---------- */}
                    {disableApi && <Col span={24}>
                        <Alert message="Pas d'adresses dans la donnée à convertir en coordonnées..." type="warning" closable/>
                    </Col>}

                </Row>

                {/*// ------------------------ Read me ------------------------------------------------ */}
                <MkDoc mkFile={read_me}/>

                {/*// ------------------------ Alert message for file extension error ----------------- */}
                {apiWarning && <Row align="left" gutter={gutter} style={rowStyle}>
                    <Alert message={apiWarning} type="warning" closable/>
                </Row>}

                {/*// ------------------------ Content -------------------------------------------------- */}


                <Row align="middle" gutter={gutter} style={rowStyle}>
                    {/* -------------------- Loading spin ---------------------------------- */}
                    {loadingApi &&
                        <Spin tip={`Conversion ${nbAddr.toLocaleString()} adresses en cours`} size="large">
                            <div style={{padding: '50px', borderRadius: '5px', width: 150, height: 150}}></div>
                        </Spin>}

                    {/* -------------------- Table when loading is done -------------------- */}
                    {!loadingApi && <TableOdc
                        df={dfTbl}
                        maxRows={MAX_ROWS}
                        render_func={RENDER_FUNC}
                    />}
                </Row>

                <Row justify="space-between" align="middle" gutter={gutter} style={rowStyle}>
                    <Col>
                        {/* -------------------- Compare with coordinates button ------------ */}
                        <Button onClick={compareCoord} disabled={(!apiCalled || !existCoord)}>
                            <ArrowsAltOutlined/> Comparer avec les coordonnées existantes
                        </Button>
                    </Col>
                    <Col>
                        {/* -------------------- Export button ------------------------------ */}
                        <Button onClick={exportResults} disabled={!apiCalled}>
                            <DownloadOutlined/> Exporter les données
                        </Button>
                    </Col>
                </Row>
            </Content>

        </Layout>
    )
}