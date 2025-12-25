import { useState, useEffect } from 'react';
import { Clock, Loader2, ExternalLink, AlertCircle, Plus, X, Save, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { generateMonthGrid, getMonthName, isSameDay } from '../utils/calendarUtils';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

// Types for Google Calendar Events
interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
    };
    htmlLink: string;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export default function CalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]); // New state for sidebar
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [isGisLoaded, setIsGisLoaded] = useState(false);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Calendar UI State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Day Details Modal State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);

    // Add/Edit Event Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingEvent, setIsSavingEvent] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [newEvent, setNewEvent] = useState({
        summary: '',
        description: '',
        location: '',
        startDateTime: '',
        endDateTime: ''
    });

    // --- Google Calendar Logic ---

    useEffect(() => {
        const loadGapi = () => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                window.gapi.load('client', initializeGapiClient);
            };
            document.body.appendChild(script);
        };

        const loadGis = () => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                setIsGisLoaded(true);
            };
            document.body.appendChild(script);
        };

        loadGapi();
        loadGis();
    }, []);

    useEffect(() => {
        if (isGisLoaded && isGapiLoaded) {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (resp: any) => {
                    if (resp.error !== undefined) {
                        throw resp;
                    }
                    if (user?.uid && resp.access_token) {
                        const expiresIn = resp.expires_in || 3599;
                        const expirationTime = Date.now() + (expiresIn * 1000);
                        try {
                            await setDoc(doc(db, 'users', user.uid, 'integrations', 'calendar'), {
                                access_token: resp.access_token,
                                expires_at: expirationTime,
                                updated_at: new Date().toISOString()
                            }, { merge: true });
                        } catch (e) {
                            console.error("Error saving token to firestore", e);
                        }
                    }
                    setIsSignedIn(true);
                    await listUpcomingEvents();
                    await listSidebarEvents(); // Fetch sidebar events on login
                },
            });
            setTokenClient(client);
        }
    }, [isGisLoaded, isGapiLoaded, user]);



    useEffect(() => {
        const restoreSession = async () => {
            if (!user?.uid || !isGapiLoaded) return;
            try {
                const docRef = doc(db, 'users', user.uid, 'integrations', 'calendar');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.access_token && data.expires_at > Date.now()) {
                        window.gapi.client.setToken({ access_token: data.access_token });
                        setIsSignedIn(true);
                        await listUpcomingEvents();
                        await listSidebarEvents(); // Fetch sidebar events on restore
                    } else {
                        setIsSignedIn(false);
                    }
                }
            } catch (e) {
                console.error("Error restoring session", e);
            } finally {
                setIsLoading(false);
            }
        };
        if (isGapiLoaded && user) {
            restoreSession();
        }
    }, [user, isGapiLoaded]);

    const initializeGapiClient = async () => {
        try {
            await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            setIsGapiLoaded(true);
        } catch (err: any) {
            console.error('Error initializing GAPI client', err);
        }
    };

    const handleAuthClick = () => {
        if (!tokenClient) return;
        tokenClient.requestAccessToken({ prompt: 'consent' });
    };

    const handleSignoutClick = () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
                window.gapi.client.setToken('');
                setEvents([]);
                setUpcomingEvents([]); // Clear sidebar events
                setIsSignedIn(false);
                if (user?.uid) {
                    setDoc(doc(db, 'users', user.uid, 'integrations', 'calendar'), {
                        access_token: null,
                        expires_at: 0
                    }, { merge: true });
                }
            });
        }
    };

    const listUpcomingEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            // Adjust to fetch a bit more for pending/prev month view
            // Fetch 2 weeks before start of month and 2 weeks after end of month to ensure grid is covered
            startOfMonth.setDate(startOfMonth.getDate() - 14);
            endOfMonth.setDate(endOfMonth.getDate() + 14);

            const request = {
                'calendarId': 'primary',
                'timeMin': startOfMonth.toISOString(),
                'timeMax': endOfMonth.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 250, // Increased limit
                'orderBy': 'startTime',
                'timeZone': 'America/Argentina/Buenos_Aires'
            };
            const response = await window.gapi.client.calendar.events.list(request);
            setEvents(response.result.items);
        } catch (err: any) {
            // Silently fail or minimal error if just token expired, relies on button re-click
            if (err.status === 401) {
                setIsSignedIn(false);
            } else {
                setError('Error al cargar eventos.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Separate fetch for sidebar (Next 30 days always)
    const listSidebarEvents = async () => {
        if (!isSignedIn || !isGapiLoaded) return;
        try {
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 30);

            const request = {
                'calendarId': 'primary',
                'timeMin': now.toISOString(),
                'timeMax': future.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 50, // Limit for sidebar
                'orderBy': 'startTime',
                'timeZone': 'America/Argentina/Buenos_Aires'
            };
            const response = await window.gapi.client.calendar.events.list(request);
            setUpcomingEvents(response.result.items);
        } catch (err) {
            console.error("Error fetching sidebar events", err);
        }
    };


    // Auto-refresh events when month changes
    useEffect(() => {
        if (isSignedIn && isGapiLoaded) {
            listUpcomingEvents();
        }
    }, [currentDate, isSignedIn, isGapiLoaded]);


    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingEvent(true);
        setError(null);
        try {
            // 1. Forzamos el formato local puro YYYY-MM-DDTHH:mm:00 sin offset
            const formatToLocalISO = (dateString: string) => {
                if (!dateString) return '';
                // Aseguramos que tenga segundos
                const hasSeconds = dateString.split(':').length === 3;
                let baseTime = hasSeconds ? dateString : `${dateString}:00`;
                // Si viene con Z o offset, nos quedamos con los primeros 19 caracteres (YYYY-MM-DDTHH:mm:00)
                return baseTime.substring(0, 19);
            };

            let finalEndDateTime = newEvent.endDateTime;

            // 2. Calculamos fin si falta, manteniendo string local
            if (!finalEndDateTime) {
                const startDate = new Date(newEvent.startDateTime);
                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                const pad = (n: number) => n < 10 ? '0' + n : n;
                finalEndDateTime = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
            }

            // 3. Enviamos dateTime local puro + timeZone explícito
            const event = {
                'summary': newEvent.summary,
                'location': newEvent.location,
                'description': newEvent.description,
                'start': {
                    'dateTime': formatToLocalISO(newEvent.startDateTime),
                    'timeZone': 'America/Argentina/Buenos_Aires'
                },
                'end': {
                    'dateTime': formatToLocalISO(finalEndDateTime),
                    'timeZone': 'America/Argentina/Buenos_Aires'
                }
            };

            if (editingEventId) {
                await window.gapi.client.calendar.events.update({
                    'calendarId': 'primary',
                    'eventId': editingEventId,
                    'resource': event
                });
            } else {
                await window.gapi.client.calendar.events.insert({
                    'calendarId': 'primary',
                    'resource': event
                });
            }

            await listUpcomingEvents();
            await listSidebarEvents();
            setIsModalOpen(false);
            setNewEvent({ summary: '', description: '', location: '', startDateTime: '', endDateTime: '' });
            setEditingEventId(null);
        } catch (err: any) {
            setError("Error al guardar: " + (err.result?.error?.message || err.message));
        } finally {
            setIsSavingEvent(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;

        setError(null);
        try {
            await window.gapi.client.calendar.events.delete({
                'calendarId': 'primary',
                'eventId': eventId
            });
            setEvents(events.filter(e => e.id !== eventId)); // Optimistic update
            setUpcomingEvents(upcomingEvents.filter(e => e.id !== eventId));
            await listUpcomingEvents();
            await listSidebarEvents(); // Sync sidebar
        } catch (err: any) {
            setError("Error al eliminar el evento: " + (err.result?.error?.message || err.message));
        }
    };

    const handleCreateNewClick = (date?: Date) => {
        const startDate = date || new Date();
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later

        // Format to local ISO string (YYYY-MM-DDTHH:mm) strictly based on browser local time
        const toLocalISO = (d: Date) => {
            const pad = (n: number) => n < 10 ? '0' + n : n;
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setNewEvent({
            summary: '',
            description: '',
            location: '',
            startDateTime: toLocalISO(startDate),
            endDateTime: toLocalISO(endDate)
        });
        setEditingEventId(null);
        setIsModalOpen(true);
        setIsDayDetailsOpen(false); // Close day details if open
    };

    const handleEditClick = (event: CalendarEvent) => {
        const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date || '');
        const end = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date || '');

        // Helper to format date for input
        const toLocalISO = (d: Date) => {
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => n < 10 ? '0' + n : n;
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setNewEvent({
            summary: event.summary,
            description: event.description || '',
            location: event.location || '',
            startDateTime: toLocalISO(start),
            endDateTime: toLocalISO(end)
        });
        setEditingEventId(event.id);
        setIsModalOpen(true);
        setIsDayDetailsOpen(false);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setIsDayDetailsOpen(true);
    };


    // --- UI Helpers ---

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getEventsForDate = (date: Date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start.dateTime || event.start.date || '');
            return isSameDay(eventStart, date);
        });
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const gridDays = generateMonthGrid(currentDate.getFullYear(), currentDate.getMonth());

    // --- Render ---

    if (isLoading && !isGisLoaded) {
        return (
            <div className="flex h-full items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        )
    }

    if (!isSignedIn) {
        return (
            <div className="flex h-[calc(100vh-6rem)] items-center justify-center p-4 relative bg-gray-50/50">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand/5 blur-3xl" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl p-12 rounded-3xl shadow-xl border border-white/50 ring-1 ring-slate-100 max-w-lg w-full text-center relative z-10"
                >
                    <div className="w-20 h-20 bg-brand/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-brand/10">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-3 font-heading">
                        Google Calendar
                    </h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Sincroniza tu cuenta para gestionar tus reuniones y tasaciones directamente desde la aplicación.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAuthClick}
                        disabled={!isGisLoaded || isLoading}
                        className="w-full text-base font-bold text-white bg-brand p-4 rounded-xl hover:bg-brand/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand/20"
                    >
                        <img src="https://calendar.google.com/googlecalendar/images/favicon_v2014_1.ico" alt="" className="w-5 h-5 brightness-0 invert" />
                        Sincronizar ahora
                    </motion.button>

                    <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Requiere acceso a tu calendario principal</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-6rem)] gap-6 p-4 relative bg-gray-50/50">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand/5 blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-3xl" />
            </div>

            {/* Sidebar */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-80 flex flex-col gap-6 shrink-0 z-10 overflow-y-auto pr-2 custom-scrollbar"
            >
                {/* Mini Calendar */}
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <span className="font-bold text-slate-800 capitalize text-lg">
                            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
                        </span>
                        <div className="flex items-center gap-1">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={prevMonth} className="p-1.5 hover:bg-slate-100/80 rounded-full text-slate-500 hover:text-brand transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={nextMonth} className="p-1.5 hover:bg-slate-100/80 rounded-full text-slate-500 hover:text-brand transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mb-3 tracking-wide">
                        <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
                    </div>
                    <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
                        {gridDays.map((dateObj, idx) => (
                            <div
                                key={idx}
                                className={`
                                    h-8 w-8 flex items-center justify-center rounded-full cursor-default text-sm transition-all duration-200
                                    ${!dateObj.isCurrentMonth ? 'text-slate-300' : 'text-slate-600 font-medium'}
                                    ${dateObj.isToday ? 'bg-gradient-to-tr from-brand to-indigo-500 text-white font-bold shadow-md shadow-brand/30 ring-2 ring-brand/20' : 'hover:bg-slate-50'}
                                `}
                            >
                                {dateObj.date.getDate()}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Meetings */}
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 ring-1 ring-slate-100 flex-1 min-h-[200px] flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-5 tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                        Próximas Reuniones
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <AnimatePresence>
                            {upcomingEvents.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex gap-4 items-center group p-3 rounded-2xl hover:bg-indigo-50/50 transition-colors border border-transparent hover:border-indigo-100"
                                >
                                    <div className="flex flex-col items-center justify-center bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-xl p-2 min-w-[50px] aspect-square">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{event.start.dateTime ? new Date(event.start.dateTime).toLocaleString('es-AR', { month: 'short' }) : 'Todo'}</span>
                                        <span className="text-xl font-black leading-none">{event.start.dateTime ? new Date(event.start.dateTime).getDate() : '-'}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-700 text-sm truncate group-hover:text-brand transition-colors" title={event.summary}>{event.summary}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{event.start.dateTime ? `${formatTime(event.start.dateTime)}` : 'Todo el día'}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {upcomingEvents.length === 0 && (
                            <div className="text-center py-8">
                                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400 font-medium">No hay eventos próximos</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex-1 flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 ring-1 ring-slate-100 overflow-hidden relative z-10"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-6">
                        <h1 className="text-3xl font-bold text-slate-800 font-heading tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            Calendario
                        </h1>
                        <div className="flex items-center bg-slate-100/80 rounded-xl p-1.5 border border-slate-200/60 shadow-inner">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-500 shadow-sm hover:shadow-md"><ChevronLeft className="w-5 h-5" /></motion.button>
                            <span className="px-6 font-bold text-slate-700 min-w-[160px] text-center capitalize text-lg">
                                {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
                            </span>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-500 shadow-sm hover:shadow-md"><ChevronRight className="w-5 h-5" /></motion.button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {error && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </motion.div>
                        )}

                        {/* View Switcher could go here */}

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { listUpcomingEvents(); listSidebarEvents(); }}
                            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-brand hover:border-brand/30 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                            title="Actualizar calendario"
                        >
                            <Loader2 className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </motion.button>



                        {isSignedIn && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCreateNewClick()}
                                className="flex items-center gap-2 bg-gradient-to-r from-brand to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all font-semibold shadow-md ml-2"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Nueva Reunión</span>
                            </motion.button>
                        )}
                        {isSignedIn && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSignoutClick}
                                className="flex items-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-semibold border border-red-100 ml-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="hidden sm:inline">Desincronizar Google Calendar</span>
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Month Grid */}
                <div className="flex-1 flex flex-col bg-white/30">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-slate-100/80 bg-slate-50/50 sticky top-0 z-20">
                        {['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'].map(day => (
                            <div key={day} className="py-4 text-center text-[10px] font-bold text-slate-400/80 tracking-widest uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-6">
                        {gridDays.map((day, idx) => {
                            const dayEvents = getEventsForDate(day.date);
                            const isSelected = selectedDate && isSameDay(selectedDate, day.date);

                            // Calculate border classes
                            const isRightEdge = (idx + 1) % 7 === 0;
                            const isBottomEdge = idx >= 35; // Last row (indices 35-41)

                            return (
                                <motion.div
                                    key={idx}
                                    onClick={() => handleDayClick(day.date)}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.005 }}
                                    className={`
                                        border-b border-r border-slate-100/80 p-3 min-h-[140px] relative group transition-all duration-200 cursor-pointer overflow-hidden
                                        ${!day.isCurrentMonth ? 'bg-slate-50/80 backdrop-blur-sm' : 'hover:bg-white'}
                                        ${isSelected ? 'bg-indigo-50/60 ring-inset ring-2 ring-indigo-500/20' : ''}
                                        ${isRightEdge ? 'border-r-0' : ''}
                                        ${isBottomEdge ? 'border-b-0' : ''}
                                    `}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className={`
                                            text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all
                                            ${day.isToday
                                                ? 'bg-brand text-white shadow-md shadow-brand/30 scale-110'
                                                : !day.isCurrentMonth ? 'text-slate-300' : 'text-slate-600 group-hover:bg-slate-100'
                                            }
                                        `}>
                                            {day.date.getDate()}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded-full">
                                                {dayEvents.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 mt-2 overflow-y-auto max-h-[100px] custom-scrollbar z-10 relative">
                                        {dayEvents.map(event => (
                                            <motion.div
                                                key={event.id}
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 text-indigo-700 text-[10px] px-2 py-1.5 rounded-md truncate font-semibold border-l-2 border-l-indigo-500 shadow-sm"
                                                title={`${formatTime(event.start.dateTime)} ${event.summary}`}
                                            >
                                                {event.start.dateTime && <span className="opacity-75 mr-1 font-normal">{formatTime(event.start.dateTime)}</span>}
                                                {event.summary}
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Create generic hover effect */}
                                    <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Details Modal (Inline Local Modal) */}
                <AnimatePresence>
                    {isDayDetailsOpen && selectedDate && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/90 backdrop-blur-md z-30 flex items-center justify-center p-8"
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-200"
                            >
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 capitalize font-heading">
                                            {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </h3>
                                        <p className="text-indigo-600 font-medium text-sm">Gestionar agenda del día</p>
                                    </div>
                                    <button onClick={() => setIsDayDetailsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar bg-slate-50/30">
                                    {getEventsForDate(selectedDate).length > 0 ? (
                                        <div className="space-y-4">
                                            {getEventsForDate(selectedDate).map((event, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    key={event.id}
                                                    className="flex items-start justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg hover:border-brand/30 transition-all group"
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 rounded-xl p-2 h-fit min-w-[70px] aspect-square">
                                                            <Clock className="w-5 h-5 mb-1 opacity-70" />
                                                            <span className="text-xs font-bold uppercase">{event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Todo'}</span>
                                                        </div>
                                                        <div className="py-1">
                                                            <h4 className="font-bold text-lg text-slate-800 leading-tight">{event.summary}</h4>
                                                            {event.location && (
                                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-medium">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand/50"></div>
                                                                    <span>{event.location}</span>
                                                                </div>
                                                            )}
                                                            {event.description && (
                                                                <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100/50">{event.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(event); }} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-xl transition-all" title="Editar">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Eliminar">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                                <Clock className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <p className="text-slate-600 font-bold text-lg">Día libre de reuniones</p>
                                            <p className="text-slate-400 text-sm mt-1">No hay eventos programados para este día.</p>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleCreateNewClick(selectedDate)}
                                                className="mt-6 text-brand font-medium hover:underline cursor-pointer"
                                            >
                                                Programar una reunión ahora
                                            </motion.button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleCreateNewClick(selectedDate)}
                                        className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl hover:bg-brand/90 transition-all shadow-md hover:shadow-lg hover:shadow-brand/20 font-bold"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Agregar Reunión
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Modal for Create/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 ring-1 ring-white/20"
                        >
                            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                                <h3 className="text-2xl font-bold text-gray-900 font-heading">
                                    {editingEventId ? 'Editar Reunión' : 'Nueva Reunión'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEvent} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Título</label>
                                    <input
                                        type="text"
                                        required
                                        value={newEvent.summary}
                                        onChange={e => setNewEvent({ ...newEvent, summary: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none font-medium"
                                        placeholder="Ej: Tasación - Av. Libertador"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-slate-700">Inicio</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={newEvent.startDateTime}
                                            onChange={e => setNewEvent({ ...newEvent, startDateTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-slate-700">Fin</label>
                                        <input
                                            type="datetime-local"
                                            value={newEvent.endDateTime}
                                            onChange={e => setNewEvent({ ...newEvent, endDateTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Ubicación</label>
                                    <input
                                        type="text"
                                        value={newEvent.location}
                                        onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none font-medium"
                                        placeholder="Dirección o lugar"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Nota / Descripción</label>
                                    <textarea
                                        value={newEvent.description}
                                        onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none h-28 resize-none font-medium text-slate-600"
                                        placeholder="Detalles importantes..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isSavingEvent}
                                        className="flex items-center gap-2 bg-gradient-to-r from-brand to-indigo-600 text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all font-bold disabled:opacity-50"
                                    >
                                        {isSavingEvent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        {editingEventId ? 'Actualizar' : 'Guardar'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
