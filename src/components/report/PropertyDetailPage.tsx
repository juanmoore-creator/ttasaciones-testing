import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import {
    Home, FileText, Calendar, DollarSign, Files,
    ArrowLeft, MapPin, Ruler, Bed, Bath,
    Clock, Plus
} from 'lucide-react';
import { useInmueble } from '../../hooks/useInmueble';
import { ImageUpload } from '../ImageUpload';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import type { SavedValuation } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { Trash2, ExternalLink } from 'lucide-react';
import PDFGenerator from '../PDFGenerator';

const PropertyDetailPage = () => {
    const { inmuebleId } = useParams<{ inmuebleId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { inmueble, isLoading, error } = useInmueble(inmuebleId);

    const [valuations, setValuations] = React.useState<SavedValuation[]>([]);
    const [isLoadingValuations, setIsLoadingValuations] = React.useState(false);

    const fetchValuations = React.useCallback(async () => {
        if (!user || !inmuebleId) return;
        setIsLoadingValuations(true);
        try {
            const q = query(
                collection(db, `users/${user.uid}/saved_valuations`),
                where('inmuebleId', '==', inmuebleId),
                orderBy('date', 'desc')
            );
            const snapshot = await getDocs(q);
            const vals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavedValuation));
            setValuations(vals);
        } catch (err) {
            console.error("Error fetching valuations:", err);
        } finally {
            setIsLoadingValuations(false);
        }
    }, [user, inmuebleId]);

    React.useEffect(() => {
        fetchValuations();
    }, [fetchValuations]);

    const handleDeleteValuation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de eliminar esta tasación?')) return;
        try {
            await deleteDoc(doc(db, `users/${user!.uid}/saved_valuations`, id));
            setValuations(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            console.error("Error deleting valuation", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (error || !inmueble) {
        return (
            <div className="p-8 text-center text-slate-500">
                <h2 className="text-xl font-bold mb-2">Error</h2>
                <p>{error || 'Inmueble no encontrado'}</p>
                <button
                    onClick={() => navigate('/app/inmuebles')}
                    className="mt-4 px-4 py-2 bg-brand text-white rounded-lg"
                >
                    Volver a la lista
                </button>
            </div>
        );
    }

    const tabsItems = [
        { id: 'resumen', label: 'Resumen', icon: Home },
        { id: 'tasaciones', label: 'Tasaciones', icon: FileText },
        { id: 'visitas', label: 'Visitas', icon: Calendar },
        { id: 'ofertas', label: 'Ofertas', icon: DollarSign },
        { id: 'documentacion', label: 'Documentación', icon: Files },
    ];

    return (
        <div className="container mx-auto pb-12">
            {/* Header / Breadcrumbs */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate('/app/inmuebles')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{inmueble.direccion}</h1>
                    <p className="text-slate-500 text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {inmueble.direccion}
                    </p>
                </div>
            </div>

            <Tabs.Root defaultValue="resumen" className="flex flex-col">
                <Tabs.List className="flex border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
                    {tabsItems.map((tab) => (
                        <Tabs.Trigger
                            key={tab.id}
                            value={tab.id}
                            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-brand transition-all whitespace-nowrap"
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>

                {/* Resumen Content */}
                <Tabs.Content value="resumen" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Data & Map */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Información General</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Superficie</p>
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Ruler className="w-4 h-4 text-brand" />
                                            <span className="font-medium">{inmueble.caracteristicas?.metrosCuadrados || 0} m²</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Habitaciones</p>
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Bed className="w-4 h-4 text-brand" />
                                            <span className="font-medium">{inmueble.caracteristicas?.habitaciones || 0}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Baños</p>
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Bath className="w-4 h-4 text-brand" />
                                            <span className="font-medium">{inmueble.caracteristicas?.banos || 0}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Operación</p>
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <DollarSign className="w-4 h-4 text-brand" />
                                            <span className="font-medium">{inmueble.operacion}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Galería de Imágenes</h3>
                                <ImageUpload
                                    images={inmueble.fotos || []}
                                    onImagesChange={() => { }}
                                    maxImages={10}
                                />
                            </Card>
                        </div>

                        {/* Right Column: Status & Actions */}
                        <div className="space-y-6">
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Estado de Gestión</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-sm text-slate-600">Estado</span>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                            {inmueble.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-sm text-slate-600">Última Actualización</span>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            {inmueble.fechaActualizacion ? new Date(inmueble.fechaActualizacion).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full mt-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all shadow-sm active:scale-95">
                                    Editar Propiedad
                                </button>
                            </Card>
                        </div>
                    </div>
                </Tabs.Content>

                {/* Tasaciones Content */}
                <Tabs.Content value="tasaciones" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="p-8">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-brand" /> Tasaciones del Inmueble
                                </h2>
                                <p className="text-slate-500">Historial de valoraciones realizadas para esta propiedad.</p>
                            </div>
                            <button
                                onClick={() => navigate('/app/inmuebles/editar', { state: { propertyData: inmueble } })}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all shadow-md active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Nueva Tasación
                            </button>
                        </div>

                        {isLoadingValuations ? (
                            <div className="py-12 text-center text-slate-400">Cargando historial...</div>
                        ) : valuations.length > 0 ? (
                            <div className="space-y-4">
                                {valuations.map(val => (
                                    <div
                                        key={val.id}
                                        className="group p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-center gap-4"
                                        onClick={() => navigate('/app/inmuebles/editar', { state: { propertyData: inmueble, valuationData: val } })}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 text-brand rounded-full flex items-center justify-center font-bold text-lg">
                                                {new Date(val.date).getDate()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{val.name || 'Tasación sin nombre'}</h4>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <span>{formatDate(val.date)}</span>
                                                    <span>•</span>
                                                    <span className="font-medium text-slate-700">{val.clientName || 'Cliente General'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400 uppercase font-semibold">Valor de Mercado</p>
                                                <p className="font-bold text-lg text-slate-800">{formatCurrency(val.valuation?.market || 0)}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <PDFGenerator
                                                    tipo="tasacion"
                                                    data={val}
                                                    displayMode="icon"
                                                    className="p-2 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-lg transition-colors"
                                                />
                                                <button
                                                    onClick={(e) => handleDeleteValuation(val.id, e)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No hay tasaciones registradas para este inmueble.</p>
                                <p className="text-sm text-slate-400">Crea la primera para comenzar el historial.</p>
                            </div>
                        )}
                    </Card>
                </Tabs.Content>

                {/* Visits Content Placeholder */}
                <Tabs.Content value="visitas" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="p-12 text-center">
                        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Gestión de Visitas</h2>
                        <p className="text-slate-400">Funcionalidad en desarrollo. Próximamente podrás agendar y trackear visitas.</p>
                    </Card>
                </Tabs.Content>

                {/* Offers Content Placeholder */}
                <Tabs.Content value="ofertas" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="p-12 text-center">
                        <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Historial de Ofertas</h2>
                        <p className="text-slate-400">Funcionalidad en desarrollo. Centraliza todas las propuestas comerciales aquí.</p>
                    </Card>
                </Tabs.Content>

                {/* Documentation Content Placeholder */}
                <Tabs.Content value="documentacion" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="p-12 text-center">
                        <Files className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Documentación</h2>
                        <p className="text-slate-400">Funcionalidad en desarrollo. Sube y organiza títulos, planos y fotos oficiales.</p>
                    </Card>
                </Tabs.Content>
            </Tabs.Root>
        </div>
    );
};

export default PropertyDetailPage;
