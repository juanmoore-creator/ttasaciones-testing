import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Home, DollarSign, Ruler, Bed, Bath, Activity, FileText } from 'lucide-react';
import { useInmuebles } from '../hooks/useInmuebles';
import { useInmueble } from '../hooks/useInmueble';
import { Card } from '../components/ui/Card';

export default function PropertyEditorPage() {
    const navigate = useNavigate();
    const { id } = useParams(); // If present, editing
    const isEditing = Boolean(id);

    const { addInmueble, updateInmueble } = useInmuebles();
    const { inmueble: existingInmueble, isLoading: isLoadingInmueble } = useInmueble(id);

    const [formData, setFormData] = useState({
        direccion: '',
        tipo: 'Departamento',
        operacion: 'Venta',
        status: 'Disponible',
        descripcion: '',
        precio: { moneda: 'USD', valor: 0 },
        caracteristicas: {
            metrosCuadrados: 0,
            habitaciones: 0,
            banos: 0,
            cocheras: 0
        }
    });

    useEffect(() => {
        if (isEditing && existingInmueble) {
            setFormData({
                direccion: existingInmueble.direccion || '',
                tipo: existingInmueble.tipo || 'Departamento',
                operacion: existingInmueble.operacion || 'Venta',
                status: existingInmueble.status || 'Disponible',
                descripcion: existingInmueble.descripcion || '',
                precio: existingInmueble.precio || { moneda: 'USD', valor: 0 },
                caracteristicas: {
                    metrosCuadrados: existingInmueble.caracteristicas?.metrosCuadrados || 0,
                    habitaciones: existingInmueble.caracteristicas?.habitaciones || 0,
                    banos: existingInmueble.caracteristicas?.banos || 0,
                    cocheras: existingInmueble.caracteristicas?.cocheras || 0
                }
            });
        }
    }, [isEditing, existingInmueble]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave: any = {
                ...formData,
                // Ensure numbers are numbers
                precio: { ...formData.precio, valor: Number(formData.precio.valor) },
                caracteristicas: {
                    metrosCuadrados: Number(formData.caracteristicas.metrosCuadrados),
                    habitaciones: Number(formData.caracteristicas.habitaciones),
                    banos: Number(formData.caracteristicas.banos),
                    cocheras: Number(formData.caracteristicas.cocheras)
                }
            };

            if (isEditing && id) {
                await updateInmueble(id, dataToSave);
            } else {
                await addInmueble(dataToSave);
            }
            navigate('/app/inmuebles');
        } catch (error) {
            console.error("Error saving property:", error);
            alert("Error al guardar la propiedad.");
        }
    };

    if (isEditing && isLoadingInmueble) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/app/inmuebles')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Editar Propiedad' : 'Nueva Propiedad'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-6 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Información Principal</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Dirección Completa</label>
                            <div className="relative">
                                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    value={formData.direccion}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none"
                                    placeholder="Ej: Av. Libertador 1234, CABA"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                                <select
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none appearance-none"
                                >
                                    {['Departamento', 'Casa', 'PH', 'Terreno', 'Local', 'Oficina', 'Galpón'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Operación</label>
                                <select
                                    value={formData.operacion}
                                    onChange={e => setFormData({ ...formData, operacion: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none appearance-none"
                                >
                                    <option value="Venta">Venta</option>
                                    <option value="Alquiler">Alquiler</option>
                                    <option value="Alquiler Temporario">Alquiler Temp.</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Precio</label>
                            <div className="flex gap-2">
                                <select
                                    value={formData.precio.moneda}
                                    onChange={e => setFormData({ ...formData, precio: { ...formData.precio, moneda: e.target.value as any } })}
                                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                >
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                </select>
                                <input
                                    type="number"
                                    value={formData.precio.valor}
                                    onChange={e => setFormData({ ...formData, precio: { ...formData.precio, valor: Number(e.target.value) } })}
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none appearance-none"
                            >
                                <option value="Disponible">Disponible</option>
                                <option value="Reservado">Reservado</option>
                                <option value="Vendido">Vendido</option>
                                <option value="Alquilado">Alquilado</option>
                                <option value="Suspendido">Suspendido</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand" /> Características
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Ruler className="w-3 h-3" /> Metros Totales
                            </label>
                            <input
                                type="number"
                                value={formData.caracteristicas.metrosCuadrados}
                                onChange={e => setFormData({
                                    ...formData,
                                    caracteristicas: { ...formData.caracteristicas, metrosCuadrados: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Bed className="w-3 h-3" /> Habitaciones
                            </label>
                            <input
                                type="number"
                                value={formData.caracteristicas.habitaciones}
                                onChange={e => setFormData({
                                    ...formData,
                                    caracteristicas: { ...formData.caracteristicas, habitaciones: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Bath className="w-3 h-3" /> Baños
                            </label>
                            <input
                                type="number"
                                value={formData.caracteristicas.banos}
                                onChange={e => setFormData({
                                    ...formData,
                                    caracteristicas: { ...formData.caracteristicas, banos: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Cocheras
                            </label>
                            <input
                                type="number"
                                value={formData.caracteristicas.cocheras}
                                onChange={e => setFormData({
                                    ...formData,
                                    caracteristicas: { ...formData.caracteristicas, cocheras: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                            />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand" /> Descripción y Notas
                    </h3>
                    <textarea
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full min-h-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none resize-y"
                        placeholder="Descripción detallada de la propiedad..."
                    />
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/app/inmuebles')}
                        className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-8 py-2 bg-brand text-white rounded-xl font-bold hover:bg-brand-dark shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Propiedad
                    </button>
                </div>
            </form>
        </div>
    );
}
