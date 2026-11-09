/* --------------------------------------------------
*   GIS layers (GeoJSON) stored in a cloud bucket (folder URL set in .env.local),
*   loaded once and kept in memory (prefetched from the home page, used by the map)
* -------------------------------------------------- */

const GEODATA_URL = (process.env.REACT_APP_BUCKET_GEODATA || '').replace(/\/+$/, '');
const GEO_LAYERS = ['regions', 'departements', 'communes'];

export const emptyGeoLayers = {loaded: false, error: null, regions: {features: []}, departements: {features: []}, communes: {features: []}};

let geoLayersPromise = null;

export const loadGeoLayers = () => {
    if (!GEODATA_URL) return Promise.reject(new Error('REACT_APP_BUCKET_GEODATA non défini dans .env.local'));
    if (!geoLayersPromise) {
        geoLayersPromise = Promise.all(GEO_LAYERS.map(async (name) => {
            const res = await fetch(`${GEODATA_URL}/${name}.json`);
            if (!res.ok) throw new Error(`${name}.json: HTTP ${res.status}`);
            return res.json();
        })).then(([regions, departements, communes]) => ({loaded: true, error: null, regions, departements, communes}))
            .catch((error) => {
                geoLayersPromise = null;    /*  retry on next call */
                throw error;
            });
    }
    return geoLayersPromise;
};
