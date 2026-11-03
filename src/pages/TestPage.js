import {Button, message, Upload} from 'antd';


import {addressToLatLng} from "../generic_js/addressConversions";

export const TestPage = () => {

    const uploadProps = {
        // name: 'file',
        // action: 'https://api-adresse.data.gouv.fr/search/csv/',
        onChange(info) {
            if (info.file.status !== 'uploading') {
                console.log(info.file, info.fileList);
            }
            if (info.file.status === 'done') {
                message.success(`${info.file.name} file uploaded successfully`);
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
        beforeUpload: (file) => {
            // setCsvFile(file);   /*  to keep always only one file  */
            console.log('file: ', file);

            addressToLatLng(file);

            return false;
        },
    };



    return (
        <Upload {...uploadProps}>
            <Button>Click to Upload</Button>
        </Upload>
    )
}
