import {useState, useEffect} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {Layout} from "antd";

/* Project Components:  */
import {loadMarkdown} from "../generic_js/generic";

/*  Project data:   */
import read_me from "../i18n/fr/read_me_app.md";  /*  Application documentation  */

/*  Custom style for markdown:  */
import style from '../components/doc/css/markdown.module.css';

const {Content} = Layout;

/*  Styles  */
const layoutStyle = {minHeight: "calc(100vh - 64px - 48px)"};
const contentStyle = {padding: 10, margin: 10,};
// const divStyle = {padding: 50, borderRadius: 10, backgroundColor: 'white', maxWidth: 800}
const divStyle = {
    margin: 'auto', /*    to horizontally center the div  */
    width: '100%',   /*    to horizontally center the div  */
    backgroundColor: 'white',
    maxWidth: 1000,
    borderWidth: 0,
    borderStyle: 'solid',
    padding: '15px 5px 0px 20px',
    marginTop: 20,
    paddingBottom: 20,
    borderRadius: 15,
    whiteSpace: 'auto',
    overflowX: 'wrap'
};

export default function AboutPage() {
    const [mk, setMk] = useState(null);

    /*  Load the markdown file content: */
    useEffect(() => {
        (async () => {
            let tmpMk = await loadMarkdown(read_me);
            setMk(tmpMk);
        })();
    }, [read_me]);

    return (
        <Layout style={layoutStyle}>
            <Content style={contentStyle}>
                <div style={divStyle}>
                    <ReactMarkdown
                        className={style.reactMarkDownOdc}  /*  to apply custom styles from './css/markdown.module.css'  */
                        children={mk}
                        remarkPlugins={[
                            remarkGfm,  /*  for GitHub style compatibility  */
                        ]}
                    />
                </div>
            </Content>
        </Layout>

    )
}
