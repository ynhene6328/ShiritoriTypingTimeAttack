import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'no-gzip-for-dict',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.includes('/dict/')) {
            const originalSetHeader = res.setHeader;
            res.setHeader = function (name, value) {
              if (name.toLowerCase() === 'content-encoding' && value === 'gzip') {
                return this;
              }
              return originalSetHeader.call(this, name, value);
            };
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
})
