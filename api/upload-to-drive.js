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
        // 1. Authenticate with Google
        let authClient;

        // Strategy A: OAuth2 (User Impersonation) - PREFERRED for Personal Drive Folders
        // Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
        if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            console.log("Using OAuth2 User Authentication");
            const oAuth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground' // Redirect URI
            );

            oAuth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });

            authClient = oAuth2Client;
        }
        // Strategy B: Service Account - Fallback
        // Works best for Shared Drives or if Service Account is invited to the folder (but consumes SA quota if not shared drive)
        else {
            console.log("Using Service Account Authentication");
            const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
            const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";

            if (!clientEmail || !rawKey) {
                console.error("Missing Google Credentials");
                res.status(500).json({ error: 'Server configuration error: Missing Google Credentials' });
                return;
            }

            // 1. Delete accidental quotes at start/end
            const cleanKey = rawKey.replace(/^['"]|['"]$/g, '');
            // 2. Replace escaped newlines
            const formattedKey = cleanKey.replace(/\\n/g, '\n');

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: clientEmail,
                    private_key: formattedKey.trim(),
                },
                scopes: ['https://www.googleapis.com/auth/drive'],
            });

            authClient = await auth.getClient();
        }

        const drive = google.drive({ version: 'v3', auth: authClient });

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
