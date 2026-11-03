/* --------------------------------------------------
*   Component returning markdown content for istructions, read_me etc.
* -------------------------------------------------- */
import {useState, useEffect} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {loadMarkdown} from "../../generic_js/generic";

/*  Custom style for markdown:  */
import style from './css/markdown.module.css';

const divStyleDef = {backgroundColor: '#ffffff'}

export const MkDoc = (props) => {

    let mkFile = props.mkFile;
    const divStyle = props.divStyle? props.divStyle: divStyleDef;

    const [mk, setMk] = useState(null);

    /*  Load the markdown file content: */
    useEffect(() => {
        (async () => {
            let tmpMk = await loadMarkdown(mkFile);
            setMk(tmpMk);
        })();
    }, [mkFile]);


    return (
        <div style={divStyle}>
            <details>
                <summary><b>Instructions</b></summary>
                <ReactMarkdown
                    className={style.reactMarkDownOdc}  /*  to apply custom styles from './css/markdown.module.css'  */
                    children={mk}
                    remarkPlugins={[
                        remarkGfm,  /*  for GitHub style compatibility  */
                    ]}
                />
            </details>
        </div>
    )
}