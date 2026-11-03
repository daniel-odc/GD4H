import React from 'react';
import {BrowserRouter, Routes, Route} from 'react-router-dom';

/* Project Components:  */
import HeaderMenuOdc from "./components/layout/HeaderOdc";
import FooterOdc from "./components/layout/FooterOdc";


/*      Project Pages:   */
import HomePage from "./pages/HomePage";
import TablePage from "./pages/TablePage";
import DataCheckPage from "./pages/DataCheckPage";
import AboutPage from "./pages/AboutPage";

/*      AppInfo: */
import {Links, AppInfo} from "./data/AppInfo";


/*  Load header and sider items from AppInfo: */
const headerItems = AppInfo.header.items;
const logo = AppInfo.header.logo;


function App() {

    /*  Set the app language to detected language:  */

    return (

        <BrowserRouter>

            <HeaderMenuOdc items={headerItems} logo={logo}/>

            <Routes>

                {/* *************************** Public routes: *************************** */}

                {/*  Home page: where the file is selected   */}
                <Route
                    key="home"
                    path={Links.home}
                    element={<HomePage/>}
                />

                {/*Table page: where the headers are checked   */}
                <Route
                    key="table"
                    path={Links.table}
                    element={<TablePage/>}
                />

                {/*Data page: where the actual data is checked   */}
                <Route
                    key="check"
                    path={Links.check}
                    element={<DataCheckPage/>}
                />

                {/*About page: where the documentation sits   */}
                <Route
                    key="about"
                    path={Links.about}
                    element={<AboutPage/>}
                />

            </Routes>

            <FooterOdc/>

        </BrowserRouter>

    );
}


export default App;