import React from "react";
import {Layout, Menu} from 'antd';
import {Link} from 'react-router-dom';
import {MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined} from "@ant-design/icons";

/*  App Info    */
import {Links} from "../../data/AppInfo";


/*  ODC logos:  */
import logoOdcMini from '../../img/logo.png';


/* **************************** Styles ******************************* */
const theme = 'light';
const headerStyleDef = {theme: theme, width: '100%', backgroundColor: 'transparent'}; // position: 'fixed',
const menuStyleDef = {color: 'black', justifyContent: 'end'};   /* menu text style */
const logoDef = logoOdcMini;
const logoStyleDef = {
    float: 'left',
    height: '54px', /*  Header height: 64px*/
    width: 'auto',
    // margin: '2px 2px 2px 0', //'16px 24px 16px 0',
    // background: 'rgba(12,172,30,0.57)',
};
const logoLinkDef = Links.website? Links.website: 'https://www.open-dc.com';

/* **************************** Default items ************************** */
/*  Default items for debugging:    */
const itemsDef = [
    {key: '1', icon: <UserOutlined/>, label: 'nav 1',},
    {
        key: '2',
        icon: <MenuFoldOutlined/>,
        label: 'nav 2',
        link: '/',
        children: [{key: 11, label: 'sub 1'}, {key: 12, label: 'sub 2'}]
    },
    {key: '3', icon: <MenuUnfoldOutlined/>, label: 'nav 3',},
    // {key: '4', icon: null, label: <LanguageSelectionOdc />,},
    // {key: '5', icon: logoOdcFull, label: 'ODC', link: 'https://wwww.open-dc.com'},
];


const {Header} = Layout;

export default function HeaderMenuOdc(props) {
    /* -----------------------------------
    *  MAKE RECURSIVE links TO ALL CHILDREN DEPTH TO DO (see example on SiderMenuOdc)
    *  HEADERS TRANSLATION TO FIX
    *   Menu Header
    *   Props:
    *       - items:
    *       - ...
    * ----------------------------------- */
    const items = props.items ? props.items : itemsDef;
    const logo = props.logo ? props.logo : logoDef;
    const logoLink = props.logoLink ? props.logoLink : logoLinkDef;
    const logoStyle = props.logoStyle ? props.logoStyle : logoStyleDef;
    const headerStyle = props.headerStyle ? props.headerStyle : headerStyleDef;
    const menuStyle = props.menuStyle ? props.menuStyle : menuStyleDef;

    /*  Update items to create links (as Menu.Item is deprecated): */
    let menuItems = [...items];

    /* transform labels to links:    */
    items.map((item, ix) => {
        /*  THIS CAUSES ERROR ON REACT STRICT MODE! react-dom.development.js:86 Warning: validateDOMNesting(...): <a> cannot appear as a descendant of <a>. check https://stackoverflow.com/questions/55625431/warning-validatedomnesting-a-cannot-appear-as-a-descendant-of-a */
        /*  because item.label is updated as a react dom element... TO FIX... */
        menuItems[ix].label = item.link? <Link to={item.link}>{item.label}</Link>: item.label;

        /* Map children links:  */
        item.children && item.children.map((child, iy) => {
            menuItems[ix].children[iy].label = child.link ?
                <Link to={child.link}>{child.label.toString()}</Link> : child.label;
            return true;
        });
        return true;
    });

    return (

        <Header style={headerStyle}>
            {logo && <div style={logoStyle}>
                <a href={logoLink && logoLink} target='_blank' rel="noreferrer">
                    <img src={logo} {...logoStyle} alt='logo'/>
                </a>
            </div>}
            <Menu
                theme={theme}
                mode="horizontal"
                items={menuItems}
                style={menuStyle}
            >
            </Menu>
        </Header>
    );
}

