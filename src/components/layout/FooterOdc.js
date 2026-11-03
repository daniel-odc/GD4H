/* --------------------------------------------------
*   App footer - common to all pages
* -------------------------------------------------- */
import {Layout, Row, Col} from "antd";
import {Link} from "react-router-dom";
import { GithubOutlined} from '@ant-design/icons';

/*      AppInfo: */
import {Links, AppInfo} from "../../data/AppInfo";

const {Content, Footer} = Layout;

const footerStyle = {padding: 10, backgroundColor: 'white', textAlign: 'center'};

export default function FooterOdc(props) {
    return (
        <Footer style={footerStyle}>
            <Row justify="space-between" align="middle">
                <Col span={4} justify='left'>
                    Challenge <Link to={Links.website} target="_blank" rel="noopener noreferrer" >QualiGeoEnvi</Link>
                </Col>
                <Col span={4}>
                    Version {AppInfo.version.num} - {AppInfo.version.date}
                </Col>
                <Col span={4} justify='right'>
                    <Link to={Links.git_issues} target="_blank" rel="noopener noreferrer" ><GithubOutlined /> Bug tracker</Link>
                </Col>
            </Row>
        </Footer>
    )
}