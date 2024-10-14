/* --------------------------------------------------------
*   Page with Headers types identified and options for user to select the columns to be analysed
*
* -------------------------------------------------------- */
import {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Layout, Row, Col, Button, Table, Select, Checkbox} from 'antd';

/*  Js generic functions:  */
import {formatNumber, objToDataframe, } from "../generic_js/generic";  //startTime, endTime

/*  Js functions project-specific:  */
import {KEY_DATE, KEY_COORD, KEY_ADDR, KEY_OTHER, STR_FIELDS} from "../generic_js/fieldsDetection";
import {analyseHeaders} from "../generic_js/fieldsDetection";

/*  Project data:   */
import {Links} from "../data/AppInfo";
import {MkDoc} from "../components/doc/MkDoc";
import read_me from "../i18n/fr/read_me_table_page.md";  /*  Pages instructions  */

/*  for tests only  */
import { readCSV } from "danfojs";

/*  Def values for debugging    */
const loadDfTest = async () => {
    const dfTmp = await readCSV('https://storage.googleapis.com/bucket-test-odc/areas.csv');
    return dfTmp;
}

const {Content} = Layout;

/*  Styles  */
const contentStyle = {padding: 10, margin: 0, minHeight: "calc(100vh - 64px - 48px)",};
const rowStyle = {padding: 10, marginBottom: 10, backgroundColor: 'white', textAlign: 'left'};
const gutter = [16, 16]; /* horizontal and vertical space between grid elements */

/*  Combo options (defined in fieldsDetection.js   */
const comboOptions = [
    {
        value: KEY_DATE,                /*  'date'  */
        label: STR_FIELDS[KEY_DATE],    /*  'Date'  */
    },
    {
        value: KEY_COORD,               /*  'coord'         */
        label: STR_FIELDS[KEY_COORD],   /*  'Coordonnées'   */
    },
    {
        value: KEY_ADDR,                /*  'addr'      */
        label: STR_FIELDS[KEY_ADDR],    /*  'Adresse'   */
    },
    {
        value: KEY_OTHER,               /*  'other'     */
        label: STR_FIELDS[KEY_OTHER],   /*  'Autres'    */
    },
];

/*  Text color for columns  */
const getTextColor = (colType) => {
    /*  If colType = 'other', return grey, otherwise return black   */
    if (colType === KEY_OTHER) return 'grey'
    else return 'black'
}

export default function TablePage() {
    const location = useLocation();
    // console.log('state: ', location.state);
    const fileObj = location.state && location.state.fileObj ? location.state.fileObj : null;
    let df = location.state && location.state.df ? location.state.df : null;

    // console.log('fileName: ', fileName, ', df: ', df, ', df type: ', typeof(df));
    const [colData, setColData] = useState(null);
    const [dfData, setDfData] = useState(null);
    const [, setRowIx] = useState(null);   /*  clicked row */
    const [, setIsCheckable] = useState(true);   /*  whether the row is checkable or not */
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    /*  Analyse df headers: */
    useEffect(() => {
        // let st = startTime();   /*  only for tests: for measuring computation time  */
        (async () => {
            if ((df === null) || (df === undefined)) {
                console.log('LOADING TEST DF... FOR DEV ONLY');
                df = await loadDfTest();
                console.log('df test: ', df);
            }
            else {
                df = await objToDataframe(df);
                // st = endTime(st, 'Object to dataframe conversion');
            }
            setDfData(df);
            // df.head().print();
            /*  Analyse header types    */
            // console.log('Analyse headers from: ', df, ', columns: ', df.$columns);
            let headerTypes = await analyseHeaders(df);
            // st = endTime(st, 'Header analysis');
            // console.log('HeaderTypes: ', headerTypes);

            /*  Analyse records completness:    */
            // let attrNa = analyseRecords(df);
            // console.log('attrNa: ', attrNa);
            // st = endTime(st, 'Records analysis');

            /*  Fill data for summary table:    */
            let dataTmp = [];
            let ix = 0; /*  entry key*/
            for (const [col, obj] of Object.entries(headerTypes)) {
                let dataObj = {};
                dataObj['key'] = ix;
                dataObj['col'] = col;
                dataObj['pc_na'] = obj['pc_na'];
                dataObj['type'] = obj['type'];
                dataObj['check'] = obj['check'];
                dataTmp.push({...dataObj});
                ix += 1;
            }
            setColData(dataTmp);
            setLoading(false);
        })();
    }, []);

    /*  Rerenders if isCheckable has changed    */
    useEffect(() => {
        console.log('re-render...');
        /*  Update data:    */
    }, [colData])

    const updateRowFormat = (rowIndex, valType, checkable) => {
        // console.log('TO DO updating format for row ', rowIndex, ', checkable? ', checkable)
        // console.log('colData: ', colData);
        colData[rowIndex]['type'] = valType;
        colData[rowIndex]['check'] = checkable;
        // console.log('colData 2: ', colData);
    }

    /*  Combo and checkbox actions function  */
    const typeChange = (typeVal, record, index) => {
        // console.log('typeVla: ', typeVal, 'record: ', record, 'index: ', index, 'key: ', record.key);
        setRowIx(index);
        let tmpBool;
        /*  Check if selected type is KEY_OTHER, in which case need to disable check box    */
        tmpBool = (typeVal === KEY_OTHER) ? false : true;

        setIsCheckable(tmpBool);

        /*  Update row format:  */
        updateRowFormat(index, typeVal, tmpBool);
    };

    const checkChange = (e, rec) => {
        // console.log('checkbox clicked on ', rec, 'val = ', e.target.checked);
        colData[rec['key']]['check'] = e.target.checked;
        // console.log('colData after check: ', colData);
    }

    /*      Columns of the header summary table:    */
    const colTbl = [
        {
            title: 'Colonne',
            dataIndex: 'col',
            key: 'col',
            width: 'min(600px, calc(100vw - 300px))',
            render: (col, record) => <span width={600} style={{color: getTextColor(record.type)}}>{col}</span>,
        },
        {
            title: '% Complet',
            dataIndex: 'pc_na',
            key: 'pc_na',
            // width: 'min(600px, calc(100vw - 300px))',
            render: (col, record) => {
                return (
                    <span>{formatNumber(1-record['pc_na'], 1, ' ', true)}</span>
                )
            },
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 150,
            render: (text, record, index) => {
                return (
                    <Select
                        defaultValue={text}
                        dropdownStyle={{color: "red"}}
                        style={{
                            width: 200,
                        }}
                        onChange={(e) => typeChange(e, record, index)}
                        options={comboOptions}
                    />
                )
            },
        },
        {
            title: 'à vérifier?',
            dataIndex: 'check',
            key: 'check',
            width:100,
            render: (check, record) => <Checkbox
                defaultChecked={check}
                disabled={record.type===KEY_OTHER? true: false}
                // onClick={(e) => checkChange(e, record)}
                onChange={(e) => checkChange(e, record)}
            ></Checkbox>,
        },
    ]
    ;

    const onClick = () => {
        /*  return only checked colData    */
        let dataCheck = [];
        colData.map(obj => {
            (obj['check'] === true) && dataCheck.push({...obj});
        })
        // console.log('df before navigate: ', dfData);
        navigate(Links.check, {state: {df: dfData, dataCheck: dataCheck, fileObj: fileObj}});
    }

    return (
        <Layout>
            <Content style={contentStyle}>

                {/*// ------------------------ Title ------------------------------------------------------ */}
                <Row justify="space-between" align="middle" gutter={gutter} style={rowStyle}>
                    <Col style={{wordWrap: 'auto'}}>
                        Champs à analyser:<br/>({fileObj.name})
                    </Col>
                    {/*// ------------------------ Validation ------------------------ */}
                    <Col>
                        <Button onClick={onClick}>Vérifier les champs sélectionnés</Button>
                    </Col>
                </Row>

                {/*// ------------------------ Read me ------------------------------------------------ */}
                <Row align="left" gutter={gutter} style={rowStyle}>
                    <MkDoc mkFile={read_me} />
                </Row>

                {/*// ------------------------ Table -------------------------------------------------- */}

                <Row align="middle" gutter={gutter} style={rowStyle}>
                    <Table
                        columns={colTbl}
                        dataSource={colData}
                        loading={loading}
                        rowKey={'key'}
                        size="small"
                        pagination={{position: ['none', 'none'], defaultPageSize: 255}}  /*  assumes no more than 250 fields...  */
                    />
                </Row>
            </Content>
        </Layout>
    )
}