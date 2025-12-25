import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import ImageKit from 'imagekit'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use('/api/imagekit-auth', (_req, res, _next) => {
            try {
              const privateKey = env.IMAGEKIT_PRIVATE_KEY || env.VITE_IMAGEKIT_PRIVATE_KEY;
              const publicKey = env.VITE_IMAGEKIT_PUBLIC_KEY || env.IMAGEKIT_PUBLIC_KEY;
              const urlEndpoint = env.VITE_IMAGEKIT_URL_ENDPOINT || env.IMAGEKIT_URL_ENDPOINT;

              if (!privateKey || !publicKey || !urlEndpoint) {
                console.error("Missing ImageKit Env Vars in Vite Proxy");
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Missing environment variables" }));
                return;
              }

              const imagekit = new ImageKit({
                publicKey: publicKey.replace(/"/g, ''),
                privateKey: privateKey.replace(/"/g, ''),
                urlEndpoint: urlEndpoint.replace(/"/g, '')
              });

              const authenticationParameters = imagekit.getAuthenticationParameters();

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify(authenticationParameters));
            } catch (error) {
              console.error("Auth Proxy Error:", error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
          })
        }
      }
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
