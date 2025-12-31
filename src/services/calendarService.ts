import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const API_ENDPOINT = '/api/calendar-auth'; // Vercel function

// Extend Window interface for Google Identity Services
declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

interface InitOptions {
    uid: string;
    onSuccess: () => void;
    onError: (error: any) => void;
}

export const calendarService = {
    /**
     * Initialize the Google Identity Services Code Client
     */
    initTokenClient: (options: InitOptions) => {
        if (!window.google) return null;

        return window.google.accounts.oauth2.initCodeClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            ux_mode: 'popup',
            access_type: 'offline', // Crucial for receiving refresh_token
            redirect_uri: 'postmessage',
            callback: async (response: any) => {
                if (response.code) {
                    try {
                        // Send code to backend to exchange for tokens
                        const authResponse = await fetch(API_ENDPOINT, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                code: response.code,
                                uid: options.uid,
                            }),
                        });

                        if (!authResponse.ok) {
                            const errorText = await authResponse.text();
                            throw new Error(`Server Error (${authResponse.status}): ${errorText}`);
                        }

                        const data = await authResponse.json();

                        if (data.success) {
                            options.onSuccess();
                        } else {
                            options.onError(data.error);
                        }
                    } catch (error) {
                        options.onError(error);
                    }
                } else {
                    options.onError(response);
                }
            },
        });
    },

    /**
     * Get a valid access token, refreshing it if necessary via the backend
     */
    getValidAccessToken: async (uid: string): Promise<string | null> => {
        try {
            // 1. Check local Firestore cache (or lightweight check) 
            const docRef = doc(db, 'users', uid, 'integrations', 'calendar');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return null;

            const data = docSnap.data();
            const now = Date.now();

            // Support both old and new field names
            const expiryDate = data.expiry_date || data.expires_at;

            // Should refresh 5 minutes before expiry to be safe
            const buffer = 5 * 60 * 1000;

            if (data.access_token && expiryDate && (expiryDate - buffer > now)) {
                return data.access_token;
            }

            // 2. Token is expired or missing, request refresh from Backend
            console.log("CalendarService: Access token expired or near expiry. Refreshing...", {
                hasToken: !!data.access_token,
                expiryDate,
                now
            });

            const refreshResponse = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid }) // Backend looks up refresh_token by UID
            });

            if (!refreshResponse.ok) {
                const errorText = await refreshResponse.text();
                throw new Error(`Refresh failed (${refreshResponse.status}): ${errorText}`);
            }

            const refreshData = await refreshResponse.json();

            if (refreshData.success && refreshData.access_token) {
                return refreshData.access_token;
            } else {
                console.error("CalendarService: Failed to refresh token", refreshData);
                return null;
            }

        } catch (error) {
            console.error("CalendarService: Error getting valid token", error);
            return null;
        }
    },

    /**
     * Wrapper to ensure gapi client has a valid token before making requests
     */
    ensureClientAuth: async (uid: string): Promise<boolean> => {
        if (!window.gapi || !window.gapi.client) return false;

        const accessToken = await calendarService.getValidAccessToken(uid);
        if (accessToken) {
            window.gapi.client.setToken({ access_token: accessToken });
            return true;
        }
        return false;
    }
};
