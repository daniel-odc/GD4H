
import {
    HomeOutlined,
    QuestionCircleOutlined,
    GithubOutlined,
} from '@ant-design/icons';

import logo from '../img/logo.png';

export const Links = {
    website: "https://gd4h.ecologie.gouv.fr/defis/799",
    home: "/",
    about: "/about",
    table: '/table',  /* where headers are checked  */
    check: '/check',  /* where data is checked      */
    tests: '/tests',    /* for tests only   */
    git: "https://julie.ineris.fr/dsi/dataviz/applications/qualigeoenvi",
    git_issues: "https://julie.ineris.fr/dsi/dataviz/applications/qualigeoenvi/-/issues",
};

export const AppInfo = {
    name: "QualiGeoEnvi",
    version: {
        num: "1.4",
        date: '13/11/2026',
    },
    language: 'fr',
    url: process.env.REACT_APP_BASE_APP_URL,
    header: {
        logo: logo,
        items: [
            {
                label: 'Accueil',
                key: 'home',
                icon: <HomeOutlined />,
                link: Links.home,
                description: 'Home Page',
            },
            {
                label: 'A propos',
                key: 'about',
                icon: <QuestionCircleOutlined />,
                link: Links.about,
                description: 'Documentation Page',
            },
            {
                label: <a href={Links.git} target={"_blank"}></a>,
                key: 'git',
                icon: <GithubOutlined />,
                description: 'Code source',
            },
        ]
    },
};

