
import {
    HomeOutlined,
    QuestionCircleOutlined,
    GithubOutlined,
} from '@ant-design/icons';

import logo from '../img/logo.png';

export const Links = {
    website: "https://challenge.gd4h.ecologie.gouv.fr/defi/?topic=28",
    home: "/",
    about: "/about",
    table: '/table',  /* where headers are checked  */
    check: '/check',  /* where data is checked      */
    tests: '/tests',    /* for tests only   */
    git: "https://gitlab.com/data-challenge-gd4h/qualigeoenvi",
    git_issues: "https://gitlab.com/data-challenge-gd4h/qualigeoenvi/-/issues",
};

export const AppInfo = {
    name: "QualiGeoEnvi",
    version: {
        num: "1.2",
        date: '06/06/2023',
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
            // {
            //     label: 'Col check DEV',
            //     key: 'table',
            //     icon: <TableOutlined />,
            //     link: Links.table,
            //     description: 'Table Page - for dev only',
            // },
            // {
            //     label: 'Data check DEV',
            //     key: 'check',
            //     icon: <TableOutlined />,
            //     link: Links.check,
            //     description: 'Data Page - for dev only',
            // },
            // {
            //     label: 'Tests DEV',
            //     key: 'tests',
            //     link: Links.tests,
            //     description: 'Tests Page - for dev only',
            // },
            {
                label: <a href={Links.git} target={"_blank"}></a>,
                key: 'git',
                icon: <GithubOutlined />,
                description: 'Code source',
            },
        ]
    },
};

