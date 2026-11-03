import {defineConfig, loadEnv, transformWithOxc} from 'vite';
import react from '@vitejs/plugin-react';

/*  The app keeps the Create React App conventions (JSX in .js files, process.env.REACT_APP_* variables),
    so the source code does not need to change for Vite.  */

/*  Parse JSX in the project .js files (Vite only enables JSX for .jsx/.tsx by default):  */
const jsxInJs = (isDev) => ({
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
        if (!/[\\/]src[\\/].*\.js$/.test(id) || id.includes('node_modules')) return null;
        return transformWithOxc(code, id, {lang: 'jsx', jsx: {runtime: 'automatic', development: isDev}});
    },
});

export default defineConfig(({command, mode}) => {
    /*  Expose .env variables prefixed with REACT_APP_ as process.env.REACT_APP_*:   */
    const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
    const define = Object.fromEntries(
        Object.entries(env).map(([key, val]) => [`process.env.${key}`, JSON.stringify(val)])
    );
    /*  Variables used in the code but not set in .env must still be replaced (process is not defined in the browser):  */
    for (const key of ['REACT_APP_BASE_APP_URL', 'REACT_APP_CARTO_API_KEY', 'REACT_APP_BUCKET_GEODATA']) {
        define[`process.env.${key}`] ??= 'undefined';
    }

    return {
        plugins: [jsxInJs(command === 'serve'), react()],
        define,
        /*  Markdown docs are imported as URLs and fetched at runtime (see loadMarkdown):   */
        assetsInclude: ['**/*.md'],
        optimizeDeps: {
            /*  Dependency scan of src/*.js files containing JSX:   */
            rolldownOptions: {moduleTypes: {'.js': 'jsx'}},
        },
        server: {
            port: 3000,
        },
        build: {
            outDir: 'build',    /*  served by app.yaml  */
            chunkSizeWarningLimit: 20000,
        },
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: './src/setupTests.js',
        },
    };
});
