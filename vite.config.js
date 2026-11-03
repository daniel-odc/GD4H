import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    /*  Markdown docs are imported as URLs and fetched at runtime (see loadMarkdown):   */
    assetsInclude: ['**/*.md'],
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
});
