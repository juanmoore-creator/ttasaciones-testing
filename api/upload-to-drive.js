import { google } from 'googleapis';
import { IncomingForm } from 'formidable';
import fs from 'fs';

// Helper to enable parsing of body in Vercel. 
// However, since we use formidable which handles streams, we actually need to disable the default body parser in Next.js/Vercel
// But in our 'local-server.js', we pass the raw 'req' which is perfect.
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // FORZAR ESTRATEGIA A: OAuth2
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        // Validación manual para ver qué falta en los logs
        if (!clientId || !clientSecret || !refreshToken) {
            console.error("ERROR: Faltan variables de OAuth2:", {
                hasClientId: !!clientId,
                hasClientSecret: !!clientSecret,
                hasRefreshToken: !!refreshToken
            });
            throw new Error("Configuración OAuth2 incompleta en Vercel");
        }

        const oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'https://developers.google.com/oauthplayground'
        );

        oAuth2Client.setCredentials({ refresh_token: refreshToken });
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        // 2. Parse the incoming form data
        const form = new IncomingForm();

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        // formidable v3 returns arrays for files. Get the first file.
        // The key 'file' must match what the frontend sends.
        const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!uploadedFile) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // 3. Upload to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: uploadedFile.originalFilename || 'documento_inmobiliario',
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: uploadedFile.mimetype,
                body: fs.createReadStream(uploadedFile.filepath),
            },
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true,
            supportsTeamDrives: true,
        });

        // 4. Return the result
        res.status(200).json({
            success: true,
            fileId: response.data.id,
            name: response.data.name,
            webViewLink: response.data.webViewLink,
        });

    } catch (error) {
        console.error("Google Drive Upload Error:", error);
        res.status(500).json({
            error: 'Upload failed',
            details: error.message
        });
    }
}
