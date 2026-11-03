/* --------------------------------------------------
*   Generic Table component displaying a Danfo dataframe
*   Use ant design
* -------------------------------------------------- */


import {useEffect, useState} from "react";
import {arrayToColumns} from "../../generic_js/generic";
import {Table} from "antd";
import {toJSON} from "danfojs";


const tableOptions = {
    size: 'middle', // 'middle' or 'small'
    scroll: {y: 'max-content', x: 'max-content'},
    // width: '10%',
    // style: {margin: 5}, // display: 'flex', flex: 1,
};

export default function TableOdc(props) {
    const df = props.df;
    const maxRows = props.maxRows? props.maxRows: null; /*  max number of rows to display in the table  */
    const rowKey = props.rowKey? props.rowKey: 'key';
    const pagination = props.pagination? props.pagination: {position: ['none', 'none']};
    /*  render function for columns ==> to be defined in the columns attribute:
    *   render_func = {attr: () => {...}}    */
    const render_func = props.render_func? props.render_func: null;

    const [col, setCol] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (df) {
                setLoading(true);
                /*  Build the columns object:   */
                const colTmp = await arrayToColumns({columns: df.columns});

                /*  Add render functions:   */
                colTmp.map((col) => {
                    col.render = render_func? render_func[col.title]? render_func[col.title]: undefined: undefined;
                    // col.render = render_func? render_func[col.title]? render_func[col.title]: (val) => val: (val) => val;
                    // col.onCell = render_func? render_func[col.title]? render_func[col.title]: (val) => val: (val) => val;
                })
                setCol(colTmp);

                /*  Build the Data object:  */
                if (maxRows && (maxRows < df.index.length)) {
                    setData(toJSON(df.head(maxRows)));
                } else {
                    setData(toJSON(df));
                }


                setLoading(false);
            }
        })()
    }, [df]);

    return (
        <Table
                        columns={col}
                        dataSource={data}
                        loading={loading}
                        rowKey={rowKey}
                        size="small"
                        scroll={tableOptions.scroll}
                        pagination={pagination}
                    />
    )
}