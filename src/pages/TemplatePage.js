/* --------------------------------------------------------
*   Page Template
*
* -------------------------------------------------------- */
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Layout, Row, Col, Button} from 'antd';

/*  Project data:   */
import {Links} from "../data/AppInfo";

/*  Js functions project-specific:  */

const {Content} = Layout;

/*  Styles  */
const contentStyle = {padding: 10, margin: 0, minHeight: "calc(100vh - 64px - 48px)",};
const rowStyle = {padding: 10, marginBottom: 10, backgroundColor: 'white', textAlign: 'left'};
const gutter = [16, 16]; /* horizontal and vertical space between grid elements */


export default function TemplatePage(props) {
    const navigate = useNavigate();

    const onClick = () => {
        console.log('Validation TO DO...');
        navigate(Links.check);
    }

    return (
        <Layout>
            <Content style={contentStyle}>

                {/*// ------------------------ Title ------------------------------------------------------ */}
                <Row align="middle" gutter={gutter} style={rowStyle}>
                    <Col span={24}>
                        Title template:
                    </Col>
                </Row>

                {/*// ------------------------ Content -------------------------------------------------- */}

                <Row align="middle" gutter={gutter} style={rowStyle}>
                    <Col>Content template</Col>
                </Row>

                {/*// ------------------------ Validation ------------------------ */}
                <Row>
                    <Col justify="end">
                        <Button onClick={onClick}>Validation template</Button>
                    </Col>
                </Row>

            </Content>
        </Layout>
    )
}