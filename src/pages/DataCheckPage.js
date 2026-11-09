
import {useEffect, useState} from "react";
import { useLocation } from "react-router";
import {Layout, Row, Col, Tabs} from 'antd';

/*  Project components:  */
import DistrGeo from "../components/maps/DistrGeo";
import OpGeo from "../components/maps/OpGeo";
import ProjGeo from "../components/maps/ProjGeo";
import {buildAddrCol, buildCoordCol} from "../generic_js/fieldsDetection";
import {objToDataframe} from "../generic_js/generic";    //, startTime, endTime

const {Content} = Layout;


/*  Styles  */
const layoutStyle = {minHeight: "calc(100vh - 64px - 48px)"};
const contentStyle = {padding: 10, margin: 0};
const rowStyle = {padding: 10, marginBottom: 10, backgroundColor: 'white', textAlign: 'left'};
const gutter = [16, 16]; /* horizontal and vertical space between grid elements */

/*  For tests only  */
// const listColCoordDef = [['longitude', 'latitude'], ['x', 'y']];    /*  should be returned by TablePage */

export default function DataCheckPage() {
    const location = useLocation();
    // const navigate = useNavigate();
    // console.log('state: ', location.state);
    let df = location.state && location.state.df? location.state.df: null;
    const dataCheck = location.state && location.state.dataCheck? location.state.dataCheck: null;
    const fileObj = location.state && location.state.fileObj ? location.state.fileObj : null;
    const [activeTab, setActiveTab] = useState(null);  /*  landing tab */
    const [dfData, setDfData] = useState(null);        /*  data of the file  */
    const [listColCoord, setListColCoord] = useState(null);
    const [listColAddr, setListColAddr] = useState(null);
    const [geocoded, setGeocoded] = useState(null);    /*  {df, colCoord} once the addresses are converted  */

    /*  Convert df to Dataframe and get columns info */
    useEffect(() => {
        // let st = startTime();   /*  only for tests: for measuring computation time  */
        (async () => {
            const dfTmp = await objToDataframe(df);
            // console.log('df in check page: ', df);

            /*  Build list coord    */
            const listCoordTmp = await buildCoordCol(dataCheck);
            // endTime(st, 'coordinates array building');

            /*  Build list address */
            const listAddrTmp = await buildAddrCol(dataCheck);

            setDfData(dfTmp);
            setListColCoord(listCoordTmp);
            setListColAddr(listAddrTmp);

            /*  Select active tab:  */
            setActiveTab((listCoordTmp[0].length>1)? 'coord': 'addr'); /* if coordinates, go to map, otherwise go to conversion   */
            })();
    }, []);

    /*  Map: coordinates of the file if any, otherwise the ones from the address conversion  */
    const fileHasCoord = listColCoord && listColCoord[0].length > 1;
    const showGeocoded = !fileHasCoord && geocoded;

    /*  Tab items:  */
    const tabItems = dfData ? [
        {
            key: 'coord',
            label: `Distribution des Objets`,
            children: <DistrGeo
                key={showGeocoded ? 'geocoded' : 'file'}   /*  new key: the map restarts with the geocoded data  */
                df={showGeocoded ? geocoded.df : dfData}
                listColCoord={showGeocoded ? [geocoded.colCoord] : listColCoord}
            />,
        },
        {
            key: 'addr',
            label: `Conversions géographiques`,
            children: <OpGeo
                fileObj={fileObj}
                df={dfData}
                listColAddr={listColAddr}
                listColCoord={listColCoord}
                onGeocoded={(dfGeo, colCoord) => setGeocoded({df: dfGeo, colCoord})}
            />,
        },
        {
            key: 'proj',
            label: `Projection des coordonnées`,
            children: <ProjGeo
                key={showGeocoded ? 'geocoded' : 'file'}   /*  new key: the projection restarts with the geocoded data  */
                fileObj={fileObj}
                df={showGeocoded ? geocoded.df : dfData}
                listColAddr={listColAddr}
                listColCoord={showGeocoded ? [geocoded.colCoord] : listColCoord}
                sourceEPSG={showGeocoded ? 'EPSG:4326' : undefined}   /*  API coordinates are WGS84  */
            />,
        },
        // {
        //   key: '2',
        //   label: `Distribution temporelle`,
        //   children: `Content TO DO 2`,
        // },
        // {
        //   key: '3',
        //   label: `Erreurs possibles`,
        //   children: `Content TO DO 3`,
        // },
    ] : [];

    return (
        <Layout style={layoutStyle}>
            <Content style={contentStyle}>

                {/*// ------------------------ Title ------------------------------------------------------ */}
                <Row justify='space-between' align="middle" gutter={gutter} style={rowStyle}>
                    <Col>
                        Analyse des données: ({fileObj.name})
                    </Col>
                </Row>

                {/*// ------------------------ Content -------------------------------------------------- */}
                {activeTab && <Tabs items={tabItems} defaultActiveKey={activeTab}/>}


            </Content>
        </Layout>
    )
}