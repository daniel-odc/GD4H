import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {Layout, Row, Col, Button, Upload, Alert, Spin} from 'antd';
import {UploadOutlined} from '@ant-design/icons';
// import {toJSON} from "danfojs";

/*  Project data:   */
import {Links} from "../data/AppInfo";
import read_me from "../i18n/fr/read_me_home_page.md";  /*  Pages instructions  */

/*  Generic project libs:   */
import {loadDataframe, getFileExtension} from "../generic_js/generic";  //, startTime, endTime
import {formatDfColumnNames} from "../generic_js/fieldsDetection";
import {MkDoc} from "../components/doc/MkDoc";
import TableOdc from "../components/layout/TableOdc";

const {Content} = Layout;

/*  Styles  */
const contentStyle = {padding: 10, margin: 0, minHeight: "calc(100vh - 64px - 48px)",};
const rowStyle = {padding: 10, marginBottom: 10, backgroundColor: 'white', textAlign: 'left'};
// const colStyle = {};
const gutter = [16, 16]; /* horizontal and vertical space between grid elements */

const MAX_ROWS_TBL = 10;
const ROW_KEY = 'key'; /* the unique row key    */
const ALLOWED_EXT = ['csv'];    /*  list of file extensions that are allowed    */
const EXT_ERROR_MSG = "L'application ne traite que des fichiers CSV.\nSi vous voulez traiter un fichier Excel, vous pouvez le convertir en csv en sélectionnant " +
                        "l'onglet à traiter, puis cliquer sur\n \
                        'Fichier / Enregistrer sous /' et sélectionner le format 'CSV UTF-8'"

export default function HomePage() {
    const [fileList, setFileList] = useState([]);
    const [isFile, setIsFile] = useState(false);    /*  a file has been selected    */
    // const [col, setCol] = useState(null);
    // const [tblData, setTblData] = useState(null);
    const [tblDf, setTblDf] = useState(null);
    const [df, setDf] = useState(null);
    const [nbRows, setNbRows] = useState(null);
    const [nbRowsDispl, setNbRowsDispl] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const navigate = useNavigate();

    /**
     *  File loading function
     *
     */
    useEffect(() => {
        (async () => {

            /*  Load csv / excel with danfojs:  */
            if (fileList[0]) {
                /*  Get file extension: */
                // let st = startTime();
                let dfTmp = await loadDataframe(fileList[0]);
                // st = endTime(st, 'Data load');

                // dfTmp.print();

                /*  Add unique row key: */
                let colKey = dfTmp.index;
                // console.log('Check key col existence TO DO');
                dfTmp.addColumn(ROW_KEY, colKey, {inplace: true});
                // st = endTime(st, 'Add index');

                /*  Update the headers to remove the accents and uppercases: */
                // console.log('CHECK DUPLICATES ON COLUMN NAMES TO DO');
                dfTmp = formatDfColumnNames(dfTmp);

                // st = endTime(st, 'Format columns');

                /*  Set table data: */
                setDf(dfTmp);

                /*  Set table columns:  */
                // setCol(arrayToColumns({columns: dfTmp.columns}));

                /*  Set table data: */
                const nbRowsTmp = Math.min(MAX_ROWS_TBL, dfTmp.index.length);
                console.log('nbRows: ', dfTmp.index.length.toLocaleString());
                setNbRows(dfTmp.index.length);
                setNbRowsDispl(nbRowsTmp);
                setTblDf(dfTmp.head(nbRowsTmp));
                setLoading(false);
            }
        })();
    }, [fileList]);


    /**
     * File upload actions
     * */
    const propsUpload = {
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
            setIsFile(false);
        },
        beforeUpload: (file) => {
            /*  Check the file extension (the app only allows csv for now):   */
            const fExt = getFileExtension(file);
            if (!ALLOWED_EXT.includes(fExt)) {
                setLoadError(true);
                setFileList([]);
                setIsFile(false);
                setLoading(false);
                return false;
            }
            else {
                setLoadError(false);
            }

            // setFileList([...fileList, file]);     /*  to add files in a list  */
            setFileList([file]);   /*  to keep always only one file  */
            // console.log('file: ', file);
            setIsFile(true)
            setLoading(true);
            return false;
        },
        fileList,
    };

    /**
     * File analysis function
     */
    const analyseFile = async () => {
        // navigate(Links.table, {state: {fileName: fileList[0].name, df: df}});
        navigate(Links.table, {state: {fileObj: fileList[0], df: df}});
    };

    return (
        <Layout>
            {/*{contextHolder}*/}
            <Content style={contentStyle}>
                {/*// ------------------------ File selection ------------------------------------------------------ */}
                <Row justify="space-between" align="middle" gutter={gutter} style={rowStyle}>
                    <Col span={21}>
                        <Upload {...propsUpload}>
                            <Button icon={<UploadOutlined/>}>Sélectionner un fichier</Button>
                        </Upload>
                    </Col>

                    <Col span={3}>
                        <Button onClick={analyseFile} disabled={!isFile}>Analyser</Button>
                    </Col>
                </Row>

                {/*// ------------------------ Alert message for file extension error ----------------- */}
                {loadError && <Row align="left" gutter={gutter} style={rowStyle}>
                    <Alert message={EXT_ERROR_MSG} type="warning" closable />
                </Row>}

                {/*// ------------------------ Read me ------------------------------------------------ */}
                <Row align="left" gutter={gutter} style={rowStyle}>
                    <MkDoc mkFile={read_me}/>
                </Row>

                {/*// ------------------------ Loading info ------------------------------------------- */}
                {loading &&
                    <Spin tip={`Chargement ${fileList[0].name} en cours...`} size="large">
                        <div style={{padding: '50px', borderRadius: '5px', width: 150, height: 150}}></div>
                    </Spin>}

                {/*// ------------------------ Table -------------------------------------------------- */}

                <Row align="middle" gutter={gutter} style={rowStyle}>
                    <Col span={24}>
                        <span>Aperçu de la donnée ({nbRowsDispl} premiers enregistements sur un total de <b>{nbRows && nbRows.toLocaleString()}</b> enregistrements):</span>
                    </Col>

                    <TableOdc
                        df={tblDf}
                        rowKey={ROW_KEY}
                        pagination={{position: ['none', 'none']}}
                    />
                </Row>
            </Content>
        </Layout>
    )
}