import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReportView from './ReportView';
import { Download } from 'lucide-react';


interface PDFGeneratorProps {
    tipo: 'tasacion' | 'fichaInmueble';
    data: any; // SavedValuation or Inmueble
    // Legacy/Shared props
    brokerName?: string;
    matricula?: string;
    clientName?: string;
    theme?: {
        primary: string;
        secondary: string;
    };
    displayMode?: 'text' | 'icon';
    className?: string;
    // Optional overrides
    stats?: any;
    // If wrapping legacy usage where data is spread
    target?: any;
    comparables?: any[];
    valuation?: any;
}

const PDFGenerator = ({ tipo, data, target, comparables, valuation, stats, brokerName, matricula, clientName, theme, displayMode = 'text', className }: PDFGeneratorProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

    // State for overrides
    const [editableReportData, setEditableReportData] = useState<any>(null);
    const [editableComparables, setEditableComparables] = useState<any[]>([]);

    useEffect(() => {
        setMountNode(document.body);
    }, []);

    // Resolve actual data based on type
    const resolveData = () => {
        if (tipo === 'tasacion') {
            // Support both old prop spread and new 'data' prop
            const valData = data || valuation || {};
            // If props are passed individually (target, comparables, etc.) use them
            // Otherwise use data object
            return {
                target: target || valData.target,
                comparables: comparables || valData.comparables || [],
                valuation: valData,
                clientName: clientName || valData.clientName || 'Cliente Final',
                brokerName: brokerName || '',
                matricula: matricula || ''
            };
        } else if (tipo === 'fichaInmueble') {
            // For Inmueble property sheet
            // MOCK adaptation to ReportView for now, or just render something else
            // If ReportView is strictly for Valuations, we might need a PropertySheetView. Using a placeholder for now as requested.
            return null;
        }
        return null;
    };

    const resolvedData = resolveData();

    useEffect(() => {
        if (showPreview && tipo === 'tasacion' && resolvedData) {
            setEditableReportData({
                target: JSON.parse(JSON.stringify(resolvedData.target)),
                brokerName: resolvedData.brokerName,
                matricula: resolvedData.matricula,
                clientName: resolvedData.clientName,
                ...JSON.parse(JSON.stringify(resolvedData.valuation))
            });
            setEditableComparables(JSON.parse(JSON.stringify(resolvedData.comparables)));
        } else {
            setEditableReportData(null);
            setEditableComparables([]);
        }
    }, [showPreview, tipo, data, target, comparables, valuation]); // Depend on flattened props too

    const handleUpdateData = (path: string, value: any) => {
        setEditableReportData((prev: any) => {
            const newData = { ...prev };
            if (path.includes('.')) {
                const parts = path.split('.');
                let current = newData;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            } else {
                newData[path] = value;
            }
            return newData;
        });
    };

    const handleUpdateComparable = (id: string, path: string, value: any) => {
        setEditableComparables((prev: any[]) => prev.map(comp => {
            if (comp.id === id) {
                return { ...comp, [path]: value };
            }
            return comp;
        }));
    };

    const handleGeneratePDF = async () => {
        setIsGenerating(true);

        try {
            const [html2canvas, jsPDF] = await Promise.all([
                import('html2canvas').then(m => m.default),
                import('jspdf').then(m => m.default)
            ]);

            await new Promise(resolve => setTimeout(resolve, 100));

            const container = document.getElementById('pdf-render-target');
            if (!container) throw new Error("Container not found");

            const pages = container.querySelectorAll('.print-page');
            if (pages.length === 0) throw new Error("No pages found");

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i] as HTMLElement;
                const canvas = await html2canvas(page, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: 794,
                    windowWidth: 794,
                    height: 1123,
                    windowHeight: 1123,
                    onclone: (clonedDoc) => {
                        const clonedPage = clonedDoc.getElementById('pdf-render-target');
                        if (clonedPage) {
                            clonedPage.style.display = 'block';
                        }
                    }
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.8);

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            const fileName = tipo === 'tasacion'
                ? `tasacion-${resolvedData?.target?.address || 'propiedad'}.pdf`
                : `ficha-${data?.direccion || 'inmueble'}.pdf`;

            pdf.save(fileName);
        } catch (err) {
            console.error("Error generating PDF", err);
            alert("Hubo un error al generar el PDF.");
        } finally {
            setIsGenerating(false);
        }
    };

    const activeReportData = editableReportData || (resolvedData ? {
        target: resolvedData.target,
        brokerName: resolvedData.brokerName,
        matricula: resolvedData.matricula,
        clientName: resolvedData.clientName,
        ...resolvedData.valuation
    } : null);

    const activeComparables = editableComparables.length > 0 ? editableComparables : (resolvedData?.comparables || []);

    return (
        <>
            <button
                onClick={() => setShowPreview(true)}
                className={className || `flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-200 hover:shadow-md rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:shadow-none active:scale-95`}
                disabled={isGenerating || (tipo === 'tasacion' && activeComparables.length === 0)}
                title="Generar PDF"
            >
                {isGenerating ? (
                    displayMode === 'icon' ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Generando...'
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        {displayMode === 'text' && <span className="hidden sm:inline">PDF</span>}
                    </>
                )}
            </button>

            {/* Preview Modal */}
            {showPreview && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col animate-in fade-in duration-200">
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Vista Previa del Reporte</h3>
                            <p className="text-sm text-slate-500">Revisa los datos antes de exportar</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGeneratePDF}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGenerating ? 'Generando...' : <><Download className="w-4 h-4" /> Descargar PDF</>}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                        <div className="max-w-6xl mx-auto">
                            {/* RENDER LOGIC BASED ON TIPO */}
                            {tipo === 'tasacion' ? (
                                <ReportView
                                    data={activeReportData}
                                    properties={activeComparables}
                                    valuation={activeReportData}
                                    stats={stats}
                                    theme={theme}
                                    showAnnotations={true}
                                    onUpdateData={handleUpdateData}
                                    onUpdateComparable={handleUpdateComparable}
                                />
                            ) : (
                                // For 'fichaInmueble' we show a placeholder for now
                                <div id="pdf-render-target" className="bg-white p-12 min-h-[800px] shadow print-page">
                                    <h1 className="text-3xl font-bold mb-4">Ficha para {data?.direccion || 'Inmueble'}</h1>
                                    <p>Aquí se mostrará la ficha técnica del inmueble.</p>
                                    <p>Esta funcionalidad está en desarrollo.</p>
                                    {/* Additional placeholder details from the Inmueble data could go here */}
                                    <pre className="mt-8 bg-slate-50 p-4 rounded text-xs">{JSON.stringify(data, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Hidden Render Target for PDF Generation (Clean version without annotations) - ONLY FOR TASACION IF REPORT VIEW */}
            {mountNode && createPortal(
                <div id="pdf-render-target" style={{
                    position: 'fixed',
                    left: '-10000px',
                    top: 0,
                    width: '794px',
                    zIndex: -9999,
                    visibility: 'hidden',
                    pointerEvents: 'none'
                }}>
                    <div style={{ visibility: 'visible' }}>
                        {tipo === 'tasacion' ? (
                            <ReportView
                                data={activeReportData}
                                properties={activeComparables}
                                valuation={activeReportData}
                                stats={stats}
                                theme={theme}
                                showAnnotations={false}
                            />
                        ) : (
                            // The off-screen version of Ficha
                            <div className="bg-white p-12 min-h-[1123px] print-page">
                                <h1 className="text-3xl font-bold mb-4">Ficha para {data?.direccion || 'Inmueble'}</h1>
                                <p>Ficha técnica generada automáticamente.</p>
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <div className="border p-4 rounded">
                                        <p className="font-bold">Superficie</p>
                                        <p>{data?.caracteristicas?.metrosCuadrados} m²</p>
                                    </div>
                                    <div className="border p-4 rounded">
                                        <p className="font-bold">Habitaciones</p>
                                        <p>{data?.caracteristicas?.habitaciones}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                mountNode
            )}
        </>
    );
};

export default PDFGenerator;
