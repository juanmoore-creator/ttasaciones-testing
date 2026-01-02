import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, AlertCircle } from 'lucide-react';

interface DolarData {
    moneda: string;
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion: string;
}

const CotizacionDolar: React.FC = () => {
    const [data, setData] = useState<DolarData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDolar = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://dolarapi.com/v1/dolares');
                if (!response.ok) {
                    throw new Error('Error al obtener los datos de la API');
                }
                const result: DolarData[] = await response.json();

                // Filtrar solo Blue y Oficial
                const filtered = result.filter(
                    (item) => item.casa === 'blue' || item.casa === 'oficial'
                );

                setData(filtered);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido');
            } finally {
                setLoading(false);
            }
        };

        fetchDolar();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-emerald-100 shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-emerald-700 font-medium text-xs">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">No se pudo cargar la cotización: {error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-3 w-full">
            {data.map((dolar) => (
                <div
                    key={dolar.casa}
                    className="flex-1 min-w-[200px] bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${dolar.casa === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                <DollarSign className="w-3.5 h-3.5" />
                            </span>
                            <h3 className="text-sm font-bold text-gray-800">
                                Dólar {dolar.nombre}
                            </h3>
                        </div>
                        <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            {dolar.casa}
                        </span>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-gray-400 font-medium leading-none">Compra</p>
                            <p className="text-lg font-bold text-emerald-600 leading-none">
                                ${dolar.compra.toLocaleString('es-AR')}
                            </p>
                        </div>
                        <div className="space-y-0.5 text-right">
                            <p className="text-[10px] text-gray-400 font-medium leading-none">Venta</p>
                            <p className="text-lg font-bold text-emerald-600 leading-none">
                                ${dolar.venta.toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[8px] text-gray-300">
                        <div className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(dolar.fechaActualizacion).toLocaleString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CotizacionDolar;
