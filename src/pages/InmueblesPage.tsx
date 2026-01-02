import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInmuebles } from '../hooks/useInmuebles';
import {
    Search, Filter, Plus, ArrowUpDown, Trash2, ArrowRight,
    Calendar as CalendarIcon, Home
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

const InmueblesPage = () => {
    const navigate = useNavigate();

    const {
        inmuebles,
        isLoading,
        deleteInmueble,
    } = useInmuebles();

    // Local State for Interactivity
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'fechaCreacion' | 'metrosCuadrados' | 'direccion'; direction: 'asc' | 'desc' }>({ key: 'fechaCreacion', direction: 'desc' });
    const [filterStatus, setFilterStatus] = useState<'all' | 'Disponible' | 'Reservado' | 'Vendido' | 'Alquilado' | 'No Disponible'>('all');

    // Delete logic with confirmation
    const handleDelete = (id: string) => {
        if (window.confirm('¿Estás seguro de querer eliminar este inmueble? Esta acción no se puede deshacer.')) {
            deleteInmueble(id);
        }
    }

    const handleCreateNew = () => {
        // Determine if we have a route for creating new or iterate later
        // For now, let's assume /app/inmuebles/nuevo or reusing specific logic
        // Since the user mentioned /app/inmuebles/editar in placeholder, let's try to stick to a convention
        // If "Nuevo Inmueble" just needs an empty editor, maybe /app/inmuebles/nuevo is best.
        // However, I will route to /app/dashboard for now if no specific create route exists, OR /app/inmuebles/new
        // Let's use /app/inmuebles/new to be standard
        navigate('/app/inmuebles/new');
    };

    // Sorting Helper
    const requestSort = (key: 'fechaCreacion' | 'metrosCuadrados' | 'direccion') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filtering and Sorting Data
    const processedInmuebles = useMemo(() => {
        let filtered = [...inmuebles];

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                (item.direccion && item.direccion.toLowerCase().includes(lowerQuery))
            );
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(item => item.status === filterStatus);
        }

        filtered.sort((a, b) => {
            let aValue: any = 0;
            let bValue: any = 0;

            if (sortConfig.key === 'metrosCuadrados') {
                aValue = a.caracteristicas?.metrosCuadrados || 0;
                bValue = b.caracteristicas?.metrosCuadrados || 0;
            } else if (sortConfig.key === 'fechaCreacion') {
                aValue = new Date(a.fechaCreacion || 0).getTime();
                bValue = new Date(b.fechaCreacion || 0).getTime();
            } else if (sortConfig.key === 'direccion') {
                aValue = a.direccion || '';
                bValue = b.direccion || '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [inmuebles, searchQuery, filterStatus, sortConfig]);

    const getSortIcon = (key: string) => {
        if (sortConfig.key === key) {
            return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''} transition-transform`} />
        }
        return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    };

    if (isLoading) {
        return <div className="p-8 text-center">Cargando inmuebles...</div>;
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-slate-900">Mis Inmuebles</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona tu cartera de propiedades</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg shadow-sm transition-all active:scale-95 font-medium w-full md:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Inmueble
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por dirección..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="Disponible">Disponible</option>
                            <option value="Reservado">Reservado</option>
                            <option value="Vendido">Vendido</option>
                            <option value="Alquilado">Alquilado</option>
                            <option value="No Disponible">No Disponible</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-4">
                {processedInmuebles.map(item => (
                    <Link to={`/app/inmuebles/${item.id}`} key={item.id} className="block">
                        <Card className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-slate-800 line-clamp-2 pr-2">{item.direccion}</p>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id); }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 mb-3 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.operacion === 'Venta' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {item.operacion}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>{item.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <p className="text-xs text-slate-400">Precio</p>
                                    <p className="font-medium text-slate-700">
                                        {item.precio ? `${item.precio.moneda} ${item.precio.valor.toLocaleString()}` : 'Consultar'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <p className="text-xs text-slate-400">Superficie</p>
                                    <p className="font-medium text-slate-700">{item.caracteristicas.metrosCuadrados} m²</p>
                                </div>
                            </div>
                            <div
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-brand bg-brand/10 hover:bg-brand/20 rounded-lg"
                            >
                                Ver Detalles <ArrowRight className="w-3 h-3" />
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block">
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left">
                            {/* Table Header */}
                            <thead className="text-xs font-semibold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('fechaCreacion')}>
                                        <div className="flex items-center gap-1">Fecha {getSortIcon('fechaCreacion')}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('direccion')}>
                                        <div className="flex items-center gap-1">Dirección {getSortIcon('direccion')}</div>
                                    </th>
                                    <th className="px-6 py-4">Operación</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 text-right" onClick={() => requestSort('metrosCuadrados')}>
                                        <div className="flex items-center justify-end gap-1">Sup. (m²) {getSortIcon('metrosCuadrados')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Precio</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            {/* Table Body */}
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode='popLayout'>
                                    {processedInmuebles.length > 0 && processedInmuebles.map((item) => (
                                        <motion.tr layout key={item.id} className="group hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/app/inmuebles/${item.id}`)}>
                                            {/* Table Row Content */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-slate-500 gap-2">
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                    {item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 group-hover:text-brand line-clamp-1">
                                                    {item.direccion}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.operacion === 'Venta' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.operacion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600">{item.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {item.caracteristicas.metrosCuadrados}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                {item.precio ? `${item.precio.moneda} ${item.precio.valor.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                    <Link to={`/app/inmuebles/${item.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand bg-brand/5 hover:bg-brand/10 rounded-lg">
                                                        Abrir <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 flex justify-between items-center">
                        <span>Mostrando {processedInmuebles.length} de {inmuebles.length} inmuebles</span>
                    </div>
                </Card>
            </div>
            {processedInmuebles.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                    <Home className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold text-slate-700">No se encontraron inmuebles</h3>
                    <p>Prueba ajustando los filtros o creando una nueva propiedad.</p>
                </div>
            )}
        </div>
    );
};

export default InmueblesPage;
