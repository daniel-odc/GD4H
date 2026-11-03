/* React: */
import React from 'react';
import ReactDOM from "react-dom/client";
import reportWebVitals from './reportWebVitals';

/*  Leaflet styles (bundled from the installed leaflet version):   */
import 'leaflet/dist/leaflet.css';

/* components:  */
import App from './App';

const root = ReactDOM.createRoot(document.getElementById("root"));


root.render(
  // <React.StrictMode>
    <App />
 // </React.StrictMode>
);

/*  If you want to start measuring performance in your app, pass a function
    to log results (for example: reportWebVitals(console.log))
    or send to an analytics endpoint. Learn more: https://github.com/GoogleChrome/web-vitals
*/
reportWebVitals();
