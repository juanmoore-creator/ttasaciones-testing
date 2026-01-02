import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, StickyNote, ArrowRight, Plus, Clock, FileText, Phone, MessageCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useClients } from '../context/ClientsContext';
import { useActiveValuation } from '../hooks/useActiveValuation';
import { useNotes } from '../hooks/useNotes';
import NotesModal from '../components/modals/NotesModal';
import { NotesModal as ClientNotesModal } from '../components/NotesModal';
import ScheduleMeetingModal from '../components/modals/ScheduleMeetingModal';
import { useAuth } from '../context/AuthContext';
import type { Client } from '../types';
import CotizacionDolar from '../components/CotizacionDolar';


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

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

const ControlPanel = () => {
    const navigate = useNavigate();
    const { clients } = useClients();
    const { handleNewValuation } = useActiveValuation();
    const { notes } = useNotes();
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedClientForNotes, setSelectedClientForNotes] = useState<Client | null>(null);
    const [isClientNotesModalOpen, setIsClientNotesModalOpen] = useState(false);

    // --- Google Calendar Logic (Refactored) ---
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [, setError] = useState<string | null>(null);

    // Initial Load of Scripts - Minimal just for visual rendering if needed by GAPI, 
    // but mainly we rely on 'google' global being present for identity services.
    useEffect(() => {
        const loadGapi = () => {
            // ... existing load logic for gapi.client is still useful for making requests
            // even if auth is handled via new flow
            if (!window.gapi) {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    window.gapi.load('client', initializeGapiClient);
                };
                document.body.appendChild(script);
            } else if (!window.gapi.client) {
                window.gapi.load('client', initializeGapiClient);
            } else {
                setIsGapiLoaded(true);
            }
        };

        const loadGis = () => {
            if (!window.google) {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                document.body.appendChild(script);
            }
        };

        loadGapi();
        loadGis();
    }, []);

    const initializeGapiClient = async () => {
        try {
            await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            setIsGapiLoaded(true);
        } catch (err: any) {
            console.error('Error initializing GAPI client', err);
            setError('Error al inicializar servicios de Google');
        }
    };

    // Restore Session
    useEffect(() => {
        const attemptRestore = async () => {
            if (!user?.uid || !isGapiLoaded) return;

            try {
                // Check if we have a valid token (refreshes if needed)
                import('../services/calendarService').then(async ({ calendarService }) => {
                    const accessToken = await calendarService.getValidAccessToken(user.uid);
                    if (accessToken) {
                        window.gapi.client.setToken({ access_token: accessToken });
                        setIsSignedIn(true);
                        listUpcomingEvents();
                    } else {
                        setIsSignedIn(false);
                    }
                    setIsLoading(false);
                });
            } catch (e) {
                console.error("Error restoring session", e);
                setIsLoading(false);
            }
        };

        if (isGapiLoaded && user) {
            attemptRestore();
        }
    }, [user, isGapiLoaded]);

    const handleAuthClick = async () => {
        if (!user?.uid) return;

        // Dynamic import to avoid circular dep issues during init if any
        const { calendarService } = await import('../services/calendarService');

        const client = calendarService.initTokenClient({
            uid: user.uid,
            onSuccess: async () => {
                const accessToken = await calendarService.getValidAccessToken(user.uid);
                if (accessToken && window.gapi) {
                    window.gapi.client.setToken({ access_token: accessToken });
                    setIsSignedIn(true);
                    listUpcomingEvents();
                }
            },
            onError: (err) => {
                console.error("Auth failed", err);
                setError("Error en la autenticación");
            }
        });

        if (client) {
            client.requestCode();
        }
    };

    const listUpcomingEvents = async () => {
        if (!isGapiLoaded || !user?.uid) return;

        setIsLoading(true);
        setError(null);
        try {
            // Ensure we have valid auth before call
            const { calendarService } = await import('../services/calendarService');
            const hasAuth = await calendarService.ensureClientAuth(user.uid);

            if (!hasAuth) {
                setIsSignedIn(false);
                setIsLoading(false);
                return;
            }

            // Proceed with request
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 30);

            const request = {
                'calendarId': 'primary',
                'timeMin': now.toISOString(),
                'timeMax': future.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 10,
                'orderBy': 'startTime',
                'timeZone': 'America/Argentina/Buenos_Aires'
            };
            const response = await window.gapi.client.calendar.events.list(request);
            setEvents(response.result.items);
            setIsSignedIn(true); // Re-confirm signed in state
        } catch (err: any) {
            if (err.status === 401) {
                // Retry once potentially or just sign out
                setIsSignedIn(false);
            } else {
                console.error("Error fetching events", err);
                setError('Error al cargar eventos.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    // ------------------------------------

    const recentClients = clients.slice(0, 3);
    const recentNotes = notes.slice(0, 3);

    // Limit upcoming events for the dashboard widget
    const upcomingEvents = events.slice(0, 3);

    const handleCreateNewValuation = () => {
        handleNewValuation();
        navigate('/app/inmuebles/editar');
    };

    const formatEventTime = (dateTime?: string) => {
        if (!dateTime) return 'Todo el día';
        return new Date(dateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const getEventDate = (event: any) => {
        const dateStr = event.start.dateTime || event.start.date;
        return dateStr ? new Date(dateStr) : new Date();
    };

    const getStatusBadge = (status: string) => {
        const statuses: Record<string, React.ReactNode> = {
            active: <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Activo</span>,
            lead: <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Lead</span>,
            past: <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">Pasado</span>,
        };
        return statuses[status] || null;
    };

    return (
        <div className="space-y-8">
            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
            />
            <ClientNotesModal
                client={selectedClientForNotes}
                isOpen={isClientNotesModalOpen}
                onClose={() => {
                    setIsClientNotesModalOpen(false);
                    setSelectedClientForNotes(null);
                }}
            />
            <ScheduleMeetingModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSuccess={() => listUpcomingEvents()}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-slate-900">Panel de Control</h1>
                    <p className="text-slate-500 text-sm">Resumen de tu actividad inmobiliaria</p>
                </div>
            </div>

            <CotizacionDolar />

            {/* QUICK ACTIONS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                    onClick={handleCreateNewValuation}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg shadow-md hover:bg-brand-dark transition-colors font-semibold text-lg"
                >
                    <Plus className="w-5 h-5" /> Nueva Tasación
                </button>
                <button
                    onClick={() => navigate('/app/clients', { state: { openNewClient: true } })}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-lg"
                >
                    <Users className="w-5 h-5" /> Nuevo Cliente
                </button>
                <button
                    onClick={() => navigate('/app/inmuebles')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-lg"
                >
                    <FileText className="w-5 h-5" /> Ver Inmuebles
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Proximas Reuniones */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-50 p-2 rounded-lg">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h2 className="font-bold font-heading text-slate-800">Próximas Reuniones</h2>
                        </div>
                        {isSignedIn && (
                            <button
                                onClick={() => navigate('/app/calendar')}
                                className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                            >
                                Ver calendario <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col">
                        {!isSignedIn ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 min-h-[150px] border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                                    <Clock className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-600 font-medium mb-1">Sin conexión</p>
                                <p className="text-xs text-slate-400 mb-4">Conecta tu Google Calendar para ver tus reuniones.</p>
                                <button
                                    onClick={handleAuthClick}
                                    disabled={isLoading}
                                    className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Cargando...' : 'Sincronizar Calendario'}
                                </button>
                            </div>
                        ) : upcomingEvents.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingEvents.map(event => {
                                    const eventDate = getEventDate(event);
                                    return (
                                        <div key={event.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-indigo-200 transition-colors group">
                                            <div className="flex flex-col items-center justify-center bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-lg p-1.5 min-w-[45px]">
                                                <span className="text-[9px] font-bold uppercase tracking-wider">{eventDate.toLocaleString('es-AR', { month: 'short' })}</span>
                                                <span className="text-lg font-black leading-none">{eventDate.getDate()}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                                                    {event.summary}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {event.start.dateTime
                                                            ? formatEventTime(event.start.dateTime)
                                                            : 'Todo el día'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 min-h-[150px] border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                <p className="text-slate-600 font-medium mb-1">Todo despejado</p>
                                <p className="text-xs text-slate-400 mb-4">No tienes reuniones próximas en tu calendario.</p>
                                <button
                                    onClick={() => setIsScheduleModalOpen(true)}
                                    className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    <Plus className="w-3 h-3 inline mr-1" />
                                    Agendar Reunión
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Clientes */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-50 p-2 rounded-lg">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="font-bold font-heading text-slate-800">Clientes Recientes</h2>
                        </div>
                        <button
                            onClick={() => navigate('/app/clients')}
                            className="text-xs font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                        >
                            Ver todos <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-3">
                        {recentClients.length > 0 ? (
                            recentClients.map(client => (
                                <div key={client.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-emerald-200 transition-all group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-semibold text-slate-800 truncate">
                                                        {client.name}
                                                    </div>
                                                    {getStatusBadge(client.status)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    {client.phone || client.email || 'Sin contacto'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {client.phone && (
                                                <>
                                                    <a
                                                        href={`tel:${client.phone.replace(/\D/g, '')}`}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors shadow-sm bg-slate-100/50"
                                                        title="Llamar"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-md transition-colors shadow-sm bg-slate-100/50"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                    </a>
                                                </>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedClientForNotes(client);
                                                    setIsClientNotesModalOpen(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-white rounded-md transition-colors shadow-sm bg-slate-100/50"
                                                title="Notas"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <p className="text-sm text-slate-500 mb-2">No hay clientes recientes</p>
                                <button
                                    onClick={() => navigate('/app/clients')}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Agregar Cliente
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Notas */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-amber-50 p-2 rounded-lg">
                                <StickyNote className="w-5 h-5 text-amber-500" />
                            </div>
                            <h2 className="font-bold font-heading text-slate-800">Notas Rápidas</h2>
                        </div>
                        <button
                            onClick={() => setIsNotesModalOpen(true)}
                            className="text-xs font-medium text-slate-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
                        >
                            Ver todas <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-3">
                        {recentNotes.length > 0 ? (
                            recentNotes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setIsNotesModalOpen(true)}
                                    className="p-3 bg-amber-50/50 border border-amber-100/50 rounded-lg hover:border-amber-200 hover:bg-amber-50 cursor-pointer transition-colors group"
                                >
                                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                                        {note.content}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(note.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 min-h-[150px] border-2 border-dashed border-amber-100 rounded-xl bg-amber-50/20">
                                <p className="text-sm text-slate-500 mb-2">No tienes notas</p>
                                <button
                                    onClick={() => setIsNotesModalOpen(true)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Crear Nota
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ControlPanel;
