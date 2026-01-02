import { useState, useMemo, useEffect } from 'react';
import {
    Users, Search, Filter, Phone, MoveRight as ArrowRight, X, MessageCircle, Pencil, History,
    TrendingUp, Activity, UserPlus, Trash2, FileText, Mail, Calendar, DollarSign, MapPin, Home,
    UserCheck, Clock, CheckCircle2
} from 'lucide-react';
import { ClientActivityTimeline } from '../components/ClientActivityTimeline';
import { NotesModal } from '../components/NotesModal';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { useClients } from '../context/ClientsContext';
import { useInmuebles } from '../hooks/useInmuebles';
import type { Client, Inmueble } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ClientsManager() {
    const { clients, addClient, updateClient, deleteClient } = useClients();
    const { inmuebles, getInmueblesByPropietario } = useInmuebles();
    const navigate = useNavigate();
    const location = useLocation();

    // Mapping 'properties' (inmuebles) to the client instead of valuations
    const [selectedClient, setSelectedClient] = useState<Client & { properties: Inmueble[] } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'Comprador' | 'Propietario' | 'Inquilino'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);

    // Notes Modal State
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [notesClient, setNotesClient] = useState<Client | null>(null);

    // --- Calculations ---
    const clientsWithProperties = useMemo(() => {
        return clients.map(client => ({
            ...client,
            properties: getInmueblesByPropietario(client.id)
        }));
    }, [clients, inmuebles]);

    const filteredClients = useMemo(() => {
        return clientsWithProperties.filter(client => {
            const lowerQuery = searchQuery.toLowerCase();
            const matchesSearch = client.name.toLowerCase().includes(lowerQuery) || (client.email && client.email.toLowerCase().includes(lowerQuery));
            const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

            // Check roles (array) or legacy type (string)
            const clientRoles = client.roles || (client.type ? [client.type] : []);
            const matchesRole = roleFilter === 'all' || clientRoles.includes(roleFilter as any);

            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [clientsWithProperties, searchQuery, statusFilter, roleFilter]);

    const getStatusBadge = (status: string) => {
        const statuses: Record<string, React.ReactNode> = {
            'Nuevo': <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 shadow-sm border border-blue-200"><Clock className="w-2.5 h-2.5" /> Nuevo</span>,
            'En Seguimiento': <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 shadow-sm border border-amber-200"><Activity className="w-2.5 h-2.5" /> Seguimiento</span>,
            'Cerrado': <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200"><CheckCircle2 className="w-2.5 h-2.5" /> Cerrado</span>,
        };
        return statuses[status] || <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{status}</span>;
    };

    const getRoleTags = (client: Client) => {
        const roles = client.roles || (client.type ? [client.type] : []);
        if (roles.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {roles.map(role => {
                    let config = { bg: 'bg-slate-50 text-slate-700 border-slate-100', icon: null as React.ReactNode };
                    if (role === 'Comprador') config = { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: <Users className="w-3 h-3" /> };
                    if (role === 'Propietario') config = { bg: 'bg-rose-50 text-rose-700 border-rose-100', icon: <Home className="w-3 h-3" /> };
                    if (role === 'Inquilino') config = { bg: 'bg-cyan-50 text-cyan-700 border-cyan-100', icon: <UserCheck className="w-3 h-3" /> };

                    return (
                        <span key={role} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${config.bg}`}>
                            {config.icon}
                            {role}
                        </span>
                    );
                })}
            </div>
        );
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient?.name) return;
        try {
            // Ensure roles array is populated from legacy type if needed, or from form
            // For this version we will map the single select 'type' to 'roles' for backward compatibility
            // but ideally we should allow multi-select in the UI.
            // For now, let's just save 'type' and 'roles' as an array containing that type.
            const selectedType = editingClient.type || 'Comprador';
            const roles = [selectedType]; // Simple mapping for now

            const clientData: any = {
                name: editingClient.name || '',
                email: editingClient.email || '',
                phone: editingClient.phone || '',
                status: (editingClient.status as any) || 'Nuevo',
                type: selectedType, // Keep legacy field for now
                roles: roles,
                budget: editingClient.budget || '',
                interestZone: editingClient.interestZone || '',
                propertyType: editingClient.propertyType || '',
                notes: editingClient.notes || ''
            };

            if (editingClient.id) {
                await updateClient(editingClient.id, clientData);
            } else {
                await addClient(clientData);
            }
            setIsModalOpen(false); setEditingClient(null);
        } catch (error) { console.error("Error saving client", error); }
    };

    const openNewClientModal = () => { setEditingClient({ status: 'Nuevo', type: 'Comprador' }); setIsModalOpen(true); };
    const openEditClientModal = (client: Client) => { setEditingClient(client); setIsModalOpen(true); };

    useEffect(() => {
        if (location.state?.openNewClient) {
            openNewClientModal();
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 pb-8 relative overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-slate-900">Administración de Clientes</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona tu cartera de contactos y sus propiedades.</p>
                </div>
                <button onClick={openNewClientModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg shadow-sm font-medium">
                    <UserPlus className="w-4 h-4" /> Nuevo Cliente
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard label="Total Clientes" value={clients.length.toString()} color="indigo" icon={<Users />} />
                <StatCard label="Propiedades Asignadas" value={inmuebles.filter(i => i.propietarioId).length.toString()} color="emerald" icon={<Home />} />
                <StatCard label="Tasa de Conversión" value="-" subtext="Próximamente" color="amber" icon={<TrendingUp />} />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Buscar por nombre o email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all outline-none" />
                    </div>

                    <div className="flex p-1 bg-slate-200/50 rounded-xl w-full sm:w-auto">
                        <button
                            onClick={() => setRoleFilter('all')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Todos
                        </button>
                        {(['Comprador', 'Propietario', 'Inquilino'] as const).map((role) => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {role}s
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative w-full sm:w-48 lg:w-auto">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full lg:w-48 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all outline-none">
                        <option value="all">Todos los Estados</option>
                        <option value="Nuevo">Nuevos</option>
                        <option value="En Seguimiento">En Seguimiento</option>
                        <option value="Cerrado">Cerrados</option>
                    </select>
                </div>
            </div>

            {/* Client Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                    <Card key={client.id} className="group flex flex-col h-full bg-white border-slate-200 hover:border-brand/30 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-5 flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 truncate leading-tight">{client.name}</h3>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditClientModal(client); }}
                                        className="p-1 text-slate-400 hover:text-brand transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {getRoleTags(client)}
                            </div>
                            {getStatusBadge(client.status)}
                        </div>

                        {/* Schematic Data */}
                        <div className="px-5 pb-5 grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                <DollarSign className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-500" />
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Presupuesto</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{client.budget || '-'}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                <MapPin className="w-3.5 h-3.5 mx-auto mb-1 text-brand/70" />
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Zona</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{client.interestZone || '-'}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                <Home className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Inmueble</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{client.propertyType || '-'}</p>
                            </div>
                        </div>

                        {/* Quick Actions Bar */}
                        <div className="mt-auto border-t border-slate-100 bg-slate-50/50 p-2 flex items-center gap-2">
                            <div className="flex gap-1 flex-1">
                                {client.phone && (
                                    <a
                                        href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white text-emerald-600 hover:text-emerald-700 border border-slate-200 rounded-lg transition-colors shadow-sm"
                                        title="WhatsApp"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </a>
                                )}
                                {client.email && (
                                    <a
                                        href={`mailto:${client.email}`}
                                        className="p-2 bg-white text-blue-600 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors shadow-sm"
                                        title="Email"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Mail className="w-4 h-4" />
                                    </a>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate('/app/calendar'); }}
                                    className="p-2 bg-white text-slate-600 hover:text-slate-700 border border-slate-200 rounded-lg transition-colors shadow-sm"
                                    title="Agendar"
                                >
                                    <Calendar className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => setSelectedClient({ ...client, properties: getInmueblesByPropietario(client.id) })}
                                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                            >
                                Ver Perfil Completo
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {filteredClients.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No se encontraron clientes.</p>
                </div>
            )}

            {/* Detail Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl transform transition-transform z-50 ${selectedClient ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedClient && (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b flex items-center justify-between bg-white">
                            <div className="flex-1 min-w-0 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold font-heading truncate">{selectedClient.name}</h2>
                                    <button
                                        onClick={() => openEditClientModal(selectedClient)}
                                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await deleteClient(selectedClient.id);
                                            setSelectedClient(null);
                                        }}
                                        className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">{getStatusBadge(selectedClient.status)} {getRoleTags(selectedClient)}</div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="p-2 rounded-full hover:bg-slate-100"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <DollarSign className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Presupuesto</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{selectedClient.budget || '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <MapPin className="w-5 h-5 mx-auto mb-2 text-brand/70" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Zona</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{selectedClient.interestZone || '-'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <Home className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Inmueble</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{selectedClient.propertyType || '-'}</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Datos de Contacto</h3>
                                {/* ... Same contact info ... */}
                                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden divide-y divide-slate-100">
                                    <div className="p-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">WhatsApp / Tel</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 font-mono tracking-tight">{selectedClient.phone || '-'}</span>
                                            {selectedClient.phone && (
                                                <a
                                                    href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg shadow-sm transition-colors"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">Email</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{selectedClient.email || '-'}</span>
                                            {selectedClient.email && (
                                                <a
                                                    href={`mailto:${selectedClient.email}`}
                                                    className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg shadow-sm transition-colors"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Properties (formerly Valuations) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                        <History className="w-3.5 h-3.5" /> Propiedades Asignadas
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setNotesClient(selectedClient);
                                            setIsNotesModalOpen(true);
                                        }}
                                        className="text-xs font-semibold text-brand hover:text-brand-dark flex items-center gap-1 bg-brand/5 px-2 py-1 rounded"
                                    >
                                        <FileText className="w-3 h-3" /> Notas
                                    </button>
                                </div>
                                {selectedClient.properties.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedClient.properties.map((prop) => (
                                            <div key={prop.id} onClick={() => navigate(`/app/inmuebles/${prop.id}`)} className="group p-3 bg-white border rounded-xl cursor-pointer hover:border-brand/30 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-semibold text-brand bg-brand/5 px-2 py-0.5 rounded-full">
                                                        {prop.operacion}
                                                    </span>
                                                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-brand transition-colors" />
                                                </div>
                                                <div className="font-medium text-sm mt-1">{prop.direccion}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{prop.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                                        No hay propiedades asignadas.
                                    </div>
                                )}
                            </div>

                            {/* Activity Timeline */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" /> Actividad Reciente
                                </h3>
                                <ClientActivityTimeline clientId={selectedClient.id} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for Edit/New */}
            {selectedClient && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                    onClick={() => setSelectedClient(null)}
                />
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-4">{editingClient?.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                        <form onSubmit={handleSaveClient} className="space-y-4">
                            {/* Inputs ... same as before */}
                            <input
                                required
                                type="text"
                                value={editingClient?.name || ''}
                                onChange={e => setEditingClient(p => ({ ...p, name: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm"
                                placeholder="Nombre Completo"
                            />
                            <input
                                type="email"
                                value={editingClient?.email || ''}
                                onChange={e => setEditingClient(p => ({ ...p, email: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm"
                                placeholder="Email"
                            />
                            <input
                                type="tel"
                                value={editingClient?.phone || ''}
                                onChange={e => setEditingClient(p => ({ ...p, phone: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm"
                                placeholder="Teléfono"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipificación</label>
                                    <select
                                        value={editingClient?.type || 'Comprador'}
                                        onChange={e => setEditingClient(p => ({ ...p, type: e.target.value as any }))}
                                        className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm appearance-none"
                                    >
                                        <option value="Comprador">Comprador</option>
                                        <option value="Propietario">Propietario</option>
                                        <option value="Inquilino">Inquilino</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                    <select
                                        value={editingClient?.status || 'Nuevo'}
                                        onChange={e => setEditingClient(p => ({ ...p, status: e.target.value as any }))}
                                        className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm appearance-none"
                                    >
                                        <option value="Nuevo">Nuevo</option>
                                        <option value="En Seguimiento">En Seguimiento</option>
                                        <option value="Cerrado">Cerrado</option>
                                    </select>
                                </div>
                            </div>
                            {/* Rest of inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Presupuesto</label>
                                    <input
                                        type="text"
                                        value={editingClient?.budget || ''}
                                        onChange={e => setEditingClient(p => ({ ...p, budget: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm"
                                        placeholder="Ej: USD 150k"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo de Inmueble</label>
                                    <input
                                        type="text"
                                        value={editingClient?.propertyType || ''}
                                        onChange={e => setEditingClient(p => ({ ...p, propertyType: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm"
                                        placeholder="Ej: 3 hab, Terraza"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Zona de Interés</label>
                                <input
                                    type="text"
                                    value={editingClient?.interestZone || ''}
                                    onChange={e => setEditingClient(p => ({ ...p, interestZone: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm"
                                    placeholder="Ej: Barrio Norte, La Plata"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Notas Internas</label>
                                <textarea
                                    value={editingClient?.notes || ''}
                                    onChange={e => setEditingClient(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand/10 focus:border-brand rounded-lg p-2.5 text-sm min-h-[80px]"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm transition-colors"
                                >
                                    Guardar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={() => {
                    setIsNotesModalOpen(false);
                    setNotesClient(null);
                }}
                client={notesClient}
            />
        </div>
    );
}
