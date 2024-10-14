
import {useEffect, useRef, useState} from "react";
import { useLocation } from "react-router-dom";
import {Layout, Row, Col, Tabs} from 'antd';


/*  Project components:  */
import DistrGeo from "../components/maps/DistrGeo";
import OpGeo from "../components/maps/OpGeo";
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

/*  Tab items:  */
const tabItems = [
  {
    key: 'coord',
    label: `Distribution géographique`,
    children: `Content TO DO 1`,
  },
    {
    key: 'addr',
    label: `Conversions géographiques`,
    children: `Content TO DO 2`,
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
];

export default function DataCheckPage() {
    const location = useLocation();
    // const navigate = useNavigate();
    // console.log('state: ', location.state);
    let df = location.state && location.state.df? location.state.df: null;
    const dataCheck = location.state && location.state.dataCheck? location.state.dataCheck: null;
    const fileObj = location.state && location.state.fileObj ? location.state.fileObj : null;
    const [activeTab, setActiveTab] = useState(null);  /*  landing tab */
    const [, setListColCoord] = useState(null);
    const [, setListColAddr] = useState(null);


    /*  Convert df to Dataframe and get columns info */
    useEffect(() => {
        // let st = startTime();   /*  only for tests: for measuring computation time  */
        (async () => {
            df = await objToDataframe(df);
            // console.log('df in check page: ', df);

            /*  Build list coord    */
            const listCoordTmp = await buildCoordCol(dataCheck);
            // endTime(st, 'coordinates array building');
            setListColCoord(listCoordTmp);

            /*  Build list address */
            const listAddrTmp = await buildAddrCol(dataCheck);
            setListColAddr(listAddrTmp);

            /*  Select active tab:  */
            setActiveTab((listCoordTmp[0].length>1)? 'coord': 'addr'); /* if coordinates, go to map, otherwise go to conversion   */

            /*  Update tab items with data  */
            /*      map     */
            tabItems[0].children = <DistrGeo
                df={df}
                listColCoord={listCoordTmp}
            />;
            /*      address to lat lng  */
            tabItems[1].children = <OpGeo
                fileObj={fileObj}
                df={df}
                listColAddr={listAddrTmp}
                listColCoord={listCoordTmp}
            />;

        })();
    }, []);


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