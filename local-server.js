import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authHandler from './api/imagekit-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import 'dotenv/config'; // Loads .env file using dotenv

console.log("Environment variables loaded via dotenv.");

const PORT = 3000;

const server = createServer(async (req, res) => {
    // Add CORS headers for local development access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/imagekit-auth') {
        console.log("Request received for /api/imagekit-auth");

        // Mocking Vercel-like Response object
        const mockRes = {
            setHeader: (k, v) => res.setHeader(k, v),
            status: (code) => {
                res.statusCode = code;
                return mockRes;
            },
            json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return mockRes;
            },
            end: (data) => res.end(data || '')
        };

        try {
            await authHandler(req, mockRes);
        } catch (e) {
            console.error("Handler error:", e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
        }
    } else if (req.url === '/api/upload-to-drive') {
        console.log("Request received for /api/upload-to-drive");

        // Mocking Vercel-like Response object
        const mockRes = {
            setHeader: (k, v) => res.setHeader(k, v),
            status: (code) => {
                res.statusCode = code;
                return mockRes;
            },
            json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return mockRes;
            },
            end: (data) => res.end(data || '')
        };

        try {
            // Import the handler dynamically to ensure it picks up the latest version if changed
            const { default: uploadHandler } = await import('./api/upload-to-drive.js');
            await uploadHandler(req, mockRes);
        } catch (e) {
            console.error("Handler error:", e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
        }
    } else {
        res.statusCode = 404;
        res.end('Not Found: ' + req.url);
    }
});

server.listen(PORT, () => {
    console.log(`\n✅ Local Backend Server running at http://localhost:${PORT}`);
    console.log(`   - Auth Endpoint: http://localhost:${PORT}/api/imagekit-auth`);
    console.log(`\n⚠️  Leave this terminal open while developing!\n`);
});
