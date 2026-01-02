import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Upload, Home, Trash2, AlertCircle, FileSpreadsheet, X,
  ChevronDown, ChevronUp, CheckSquare, BarChart, Sparkles, MapPin, Plus, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

import { useActiveValuation } from '../hooks/useActiveValuation';
// import { useSavedValuations } from '../hooks/useSavedValuations'; // Removed
import { useUserProfile } from '../hooks/useUserProfile';
import { useUI } from '../hooks/useUI';
import { useGoogleSheetImport } from '../hooks/useGoogleSheetImport';
import { useSavedAgents } from '../hooks/useSavedAgents';
import { formatCurrency, formatNumber } from '../utils/format';
import { SURFACE_TYPES, DEFAULT_FACTORS } from '../constants';
import { useClients } from '../context/ClientsContext';
import { ImageUpload } from '../components/ImageUpload';
import GoogleMapPreview from '../components/GoogleMapPreview';
import AddressAutocomplete from '../components/AddressAutocomplete';
import PDFGenerator from '../components/PDFGenerator';
import { useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { GeminiConsultationModal } from '../components/GeminiConsultationModal';
import type { SurfaceType } from '../types/index';


const libraries: Libraries = ["places"];

function Dashboard() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const {
    target, updateTarget,
    comparables, addComparable, updateComparable, deleteComparable,
    processedComparables, stats, valuation, targetHomogenizedSurface,
    clientName, setClientName,
    currentValuationId, setCurrentValuationId,
    setIsDirty
  } = useActiveValuation();

  const { user } = useAuth();
  // const { handleSaveValuation } = useSavedValuations();

  const handleSaveValuation = async (data: any, onSuccess: (id: string) => void) => {
    if (!user) return;
    try {
      const valData = {
        target: data.target,
        comparables: data.comparables,
        clientName: data.clientName,
        valuation: data.valuation, // Save calculated stats
        date: Date.now(),
        name: `Tasación - ${data.target.address || 'Sin Dirección'}`,
        inmuebleId: location.state?.propertyData?.id || null // Link if available
      };

      let id = data.currentValuationId;

      if (id) {
        await setDoc(doc(db, `users/${user.uid}/saved_valuations`, id), valData, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/saved_valuations`), valData);
        id = docRef.id;
      }

      if (onSuccess) onSuccess(id);
      alert("Tasación guardada correctamente.");
    } catch (e) {
      console.error("Error saving valuation", e);
      alert("Error al guardar la tasación.");
    }
  };

  const { brokerName, setBrokerName, matricula, setMatricula, pdfTheme } = useUserProfile();
  const { geminiModalOpen, setGeminiModalOpen } = useUI();
  const { sheetUrl, setSheetUrl, handleImportFromSheet } = useGoogleSheetImport();
  const { clients } = useClients();

  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [showOptionalTarget, setShowOptionalTarget] = useState(false);
  const { agents, addAgent, loading: loadingAgents } = useSavedAgents();
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<{ target: any, comparables: any[] } | null>(null);
  const [expandedMobileCards, setExpandedMobileCards] = useState<string[]>([]);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.propertyData) {
      const prop = location.state.propertyData;

      // Confirmation before overwriting if dirty?
      // For now, let's assume explicit intent means overwrite or the user accepts it.
      // Ideally we reset the valuation first.

      const newTarget = {
        address: prop.direccion || '',
        coveredSurface: prop.caracteristicas?.metrosCuadrados || 0,
        uncoveredSurface: 0,
        surfaceType: 'Balcón' as SurfaceType,
        homogenizationFactor: 0.10,
        rooms: prop.caracteristicas?.habitaciones || 0,
        bedrooms: 0, // Not in simple schema yet, default 0
        bathrooms: prop.caracteristicas?.banos || 0,
        age: 0,
        garage: (prop.caracteristicas?.cocheras || 0) > 0,
        semiCoveredSurface: 0,
        toilettes: 0,
        floorType: '',
        isCreditEligible: false,
        isProfessional: false,
        hasFinancing: false,
        images: prop.fotos || [],
        mapImage: ''
      };

      // We set the target directly. 
      // Note: setting state here might trigger 'isDirty' if not handled carefully, 
      // but since we are effectively "loading" a new one, maybe that's okay.
      // We also want to clear comparables if clean start is desired.
      // Let's rely on updateTarget not triggering if values are same, but they won't be.

      // Force update directly? 
      // Since useActiveValuation exposes updateTarget, we use it. 
      // But for a full reset we might want to manually set comparables to [] too using the hook's setter if exposed, 
      // OR better: use handleNewValuation() then updateTarget() but handleNewValuation is async/modal.

      // Let's just update target info. The user can manually clear comparables or click "New" if they want full reset.
      // But usually "New Valuation" implies empty comparables. 

      updateTarget(newTarget);
      // Clear history state to avoid re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSelectClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) setClientName(client.name);
  };

  const handleSaveAgent = async () => {
    if (!brokerName || !matricula) return;
    setIsSavingAgent(true);
    try { await addAgent(brokerName, matricula); }
    catch (error) { console.error("Failed to save agent", error); }
    finally { setIsSavingAgent(false); }
  };

  const onSaveSuccess = (id: string) => {
    setCurrentValuationId(id);
    setIsDirty(false);
  };

  const handleSelectAgent = (agentId: string) => {
    if (!agentId) return;
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setBrokerName(agent.name);
      setMatricula(agent.license);
    }
  };

  const editingComparable = useMemo(() => comparables.find(c => c.id === editingCompId) || null, [comparables, editingCompId]);

  const handleUpdateMap = () => {
    setMapSnapshot({ target: { ...target }, comparables: [...processedComparables] });
  };

  const toggleMobileCard = (id: string) => {
    setExpandedMobileCards(prev => prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Administrador de tasaciones</h1>
          <p className="text-slate-500 text-sm">Gestiona tus tasaciones y comparables</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-lg border">
            <FileSpreadsheet className="w-4 h-4 text-slate-400 ml-2" />
            <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Pegar link de Google Sheets..." className="bg-transparent border-none focus:ring-0 text-xs w-48" />
            <button onClick={handleImportFromSheet} className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-md"><Upload className="w-3 h-3" /> Importar</button>
          </div>
          <button onClick={() => setGeminiModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200/50">
            <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Consultar IA</span>
          </button>
        </div>
      </div>

      <GeminiConsultationModal isOpen={geminiModalOpen} onClose={() => setGeminiModalOpen(false)} target={target} comparables={comparables} onAddComparable={addComparable} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-8">
          <Card className="bg-white border-brand/10 shadow-lg shadow-brand/5 overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b pb-4">
                <div className="flex items-center gap-2 text-brand"><Home className="w-5 h-5" /><h2 className="font-bold font-heading uppercase tracking-wider text-sm">Propiedad Objetivo</h2></div>
                <div className="mt-2 md:mt-0 flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border self-end">
                  <span className="text-xs text-slate-500 uppercase font-medium">Sup. Homog.</span>
                  <span className="font-bold text-brand-dark text-lg">{formatNumber(targetHomogenizedSurface)} m²</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-medium">Dirección</label>
                    {isLoaded ? <AddressAutocomplete value={target.address} onChange={(val, loc) => updateTarget({ address: val, location: loc })} className="w-full mt-1" placeholder="Ej: Av. Libertador 2000" /> : <input type="text" value={target.address} onChange={e => updateTarget({ address: e.target.value })} className="w-full mt-1" placeholder="Ej: Av. Libertador 2000" />}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 uppercase font-medium">Sup. Cubierta</label>
                      <div className="relative mt-1"><input type="number" value={target.coveredSurface} onChange={e => updateTarget({ coveredSurface: parseFloat(e.target.value) || 0 })} className="w-full" /><span className="absolute right-3 top-2 text-slate-400 text-sm">m²</span></div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 uppercase font-medium">Sup. Descubierta</label>
                      <div className="relative mt-1"><input type="number" value={target.uncoveredSurface} onChange={e => updateTarget({ uncoveredSurface: parseFloat(e.target.value) || 0 })} className="w-full" /><span className="absolute right-3 top-2 text-slate-400 text-sm">m²</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><label className="text-xs text-slate-500 uppercase font-medium">Ambientes</label><input type="number" value={target.rooms} onChange={e => updateTarget({ rooms: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div>
                    <div><label className="text-xs text-slate-500 uppercase font-medium">Dormitorios</label><input type="number" value={target.bedrooms} onChange={e => updateTarget({ bedrooms: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div>
                    <div><label className="text-xs text-slate-500 uppercase font-medium">Baños</label><input type="number" value={target.bathrooms} onChange={e => updateTarget({ bathrooms: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div>
                    <div><label className="text-xs text-slate-500 uppercase font-medium">Antigüedad</label><div className="relative mt-1"><input type="number" value={target.age} onChange={e => updateTarget({ age: parseFloat(e.target.value) || 0 })} className="w-full text-center" /><span className="absolute right-2 top-2 text-slate-400 text-xs">años</span></div></div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer"><div className={`w-5 h-5 rounded border flex items-center justify-center ${target.garage ? 'bg-brand border-brand text-white' : 'bg-slate-50'}`}>{target.garage && <CheckSquare className="w-4 h-4" />}</div><input type="checkbox" className="hidden" checked={!!target.garage} onChange={e => updateTarget({ garage: e.target.checked })} /><span className="text-sm font-medium">Cochera</span></label>
                    <button onClick={() => setShowOptionalTarget(!showOptionalTarget)} className="flex items-center gap-2 text-brand text-sm font-medium">{showOptionalTarget ? 'Menos' : 'Más'} Opciones {showOptionalTarget ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                  </div>
                  {showOptionalTarget && (<div className="p-4 bg-slate-50 rounded-xl border"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"><div><label className="text-xs text-slate-500 uppercase font-medium">Semicubierta</label><input type="number" value={target.semiCoveredSurface} onChange={e => updateTarget({ semiCoveredSurface: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Toilettes</label><input type="number" value={target.toilettes} onChange={e => updateTarget({ toilettes: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Pisos</label><input type="text" value={target.floorType || ''} onChange={e => updateTarget({ floorType: e.target.value })} className="w-full mt-1 text-sm" placeholder="Ej: Parquet" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Deptos. Edif.</label><input type="number" value={target.apartmentsInBuilding} onChange={e => updateTarget({ apartmentsInBuilding: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div className="col-span-full flex flex-wrap gap-4 items-center mt-2">{[{ label: 'Apto Crédito', key: 'isCreditEligible' }, { label: 'Apto Profesional', key: 'isProfessional' }, { label: 'Financiamiento', key: 'hasFinancing' }].map(item => (<label key={item.label} className="flex items-center gap-2 cursor-pointer"><div className={`w-4 h-4 rounded border flex items-center justify-center ${target[item.key as keyof typeof target] ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white'}`}>{target[item.key as keyof typeof target] && <CheckSquare className="w-3 h-3" />}</div><input type="checkbox" className="hidden" checked={!!target[item.key as keyof typeof target]} onChange={e => updateTarget({ [item.key]: e.target.checked })} /><span className="text-xs">{item.label}</span></label>))}</div></div></div>)}
                </div>
                <div className="md:col-span-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border">
                    <div><label className="text-xs text-slate-500 uppercase font-medium">Tipo Sup.</label><select value={target.surfaceType} onChange={e => { const type = e.target.value as SurfaceType; updateTarget({ surfaceType: type, homogenizationFactor: DEFAULT_FACTORS[type] }); }} className="w-full mt-1 text-sm">{SURFACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="text-xs text-slate-500 uppercase font-medium">Factor</label><input type="number" step="0.05" value={target.homogenizationFactor} onChange={e => updateTarget({ homogenizationFactor: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div>
                  </div>
                  <div><ImageUpload images={target.images || []} onImagesChange={(imgs) => updateTarget({ images: imgs })} label="Fotos" maxImages={4} /></div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 font-heading">Comparables ({comparables.length})</h3>
              <button onClick={() => addComparable()} className="flex items-center justify-center gap-1 text-sm font-medium text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-md w-full sm:w-auto"><Plus className="w-4 h-4" /> Agregar Comparable</button>
            </div>
            <div className="md:hidden">
              {processedComparables.length > 0 ? (processedComparables.map(comp => (<div key={comp.id} className="border-b p-4 space-y-3"><div className="flex justify-between items-start"><input type="text" value={comp.address} onChange={e => updateComparable(comp.id, { address: e.target.value })} className="bg-transparent font-semibold text-slate-800 w-full p-0 border-0 focus:ring-0" placeholder="Dirección..." /><button onClick={() => deleteComparable(comp.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md"><Trash2 className="w-4 h-4" /></button></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500">Precio (USD)</label><input type="number" value={comp.price} onChange={e => updateComparable(comp.id, { price: parseFloat(e.target.value) || 0 })} className="w-full p-1 rounded-md border-slate-200" /></div><div><label className="text-xs text-slate-500">Sup. Cubierta</label><input type="number" value={comp.coveredSurface} onChange={e => updateComparable(comp.id, { coveredSurface: parseFloat(e.target.value) || 0 })} className="w-full p-1 rounded-md border-slate-200" /></div></div><AnimatePresence>{expandedMobileCards.includes(comp.id) && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden"><div className="grid grid-cols-2 gap-4 pt-2"><div><label className="text-xs text-slate-500">Sup. Descub.</label><input type="number" value={comp.uncoveredSurface} onChange={e => updateComparable(comp.id, { uncoveredSurface: parseFloat(e.target.value) || 0 })} className="w-full p-1 rounded-md border-slate-200 text-sm" /></div><div><label className="text-xs text-slate-500">Factor</label><input type="number" value={comp.homogenizationFactor} onChange={e => updateComparable(comp.id, { homogenizationFactor: parseFloat(e.target.value) || 0 })} className="w-full p-1 rounded-md border-slate-200 text-sm" /></div></div></motion.div>)}</AnimatePresence><button onClick={() => toggleMobileCard(comp.id)} className="text-xs text-brand font-medium flex items-center gap-1">{expandedMobileCards.includes(comp.id) ? 'Menos' : 'Más'} Opciones<ChevronDown className={`w-3 h-3 transition-transform ${expandedMobileCards.includes(comp.id) ? 'rotate-180' : ''}`} /></button></div>))) : (<div className="p-8 text-center text-slate-400 text-sm">Agrega tu primer comparable.</div>)}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left"><thead className="text-xs font-semibold text-slate-500 uppercase bg-slate-50/50"><tr><th className="px-6 py-4 min-w-[220px]">Dirección</th><th className="px-4 py-4 text-right w-36">Precio (USD)</th><th className="px-4 py-4 text-right w-28">Sup. Cub (m²)</th><th className="px-4 py-4 text-right w-28">Sup. Desc (m²)</th><th className="px-4 py-4 text-center w-24">Factor</th><th className="px-4 py-4 text-right w-32">$/m² H</th><th className="px-2 py-4 w-10" /></tr></thead><tbody className="divide-y divide-slate-100">{processedComparables.map((comp) => (<tr key={comp.id} className="group hover:bg-slate-50/80"><td className="px-6 py-3"><input type="text" value={comp.address} onChange={e => updateComparable(comp.id, { address: e.target.value })} className="bg-transparent p-0 w-full focus:ring-0 font-medium" /></td><td className="px-4 py-3"><input type="number" value={comp.price} onChange={e => updateComparable(comp.id, { price: parseFloat(e.target.value) || 0 })} className="bg-transparent p-0 w-full text-right" /></td><td className="px-4 py-3"><input type="number" value={comp.coveredSurface} onChange={e => updateComparable(comp.id, { coveredSurface: parseFloat(e.target.value) || 0 })} className="bg-transparent p-0 w-full text-right" /></td><td className="px-4 py-3"><input type="number" value={comp.uncoveredSurface} onChange={e => updateComparable(comp.id, { uncoveredSurface: parseFloat(e.target.value) || 0 })} className="bg-transparent p-0 w-full text-right" /></td><td className="px-4 py-3 text-center"><input type="number" step="0.05" value={comp.homogenizationFactor} onChange={e => updateComparable(comp.id, { homogenizationFactor: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border rounded px-1 py-1 w-16 text-center text-xs" /></td><td className="px-4 py-3 text-right font-bold text-xs">${formatNumber(comp.hPrice || 0)}</td><td className="px-2 py-3 text-center"><button onClick={() => deleteComparable(comp.id)} className="text-slate-300 hover:text-rose-500 p-1.5 rounded opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table>
            </div>
          </Card>

          <Card className="bg-white border-brand/10 shadow-lg shadow-brand/5 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between"><h2 className="font-bold font-heading uppercase tracking-wider text-sm text-brand flex items-center gap-2"><MapPin className="w-5 h-5" />Ubicación y Mapa</h2><button onClick={handleUpdateMap} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg">Generar / Actualizar Mapa</button></div>
            <div className="p-6">{mapSnapshot ? <GoogleMapPreview target={mapSnapshot.target} comparables={mapSnapshot.comparables} onMapImageUpdate={(url) => updateTarget({ mapImage: url })} isLoaded={isLoaded} /> : <div className="h-[400px] w-full bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400 gap-4"><MapPin className="w-12 h-12 opacity-20" /><p className="font-medium text-slate-600">Mapa no generado</p><p className="text-sm">Presiona "Generar / Actualizar Mapa" arriba.</p></div>}</div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <Card className="h-full">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart className="w-5 h-5 text-brand" />
                    <h2 className="font-bold font-heading uppercase tracking-wider text-sm">Resultados de Valuación</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard label="Venta Rápida" value={formatCurrency(valuation.low)} subtext={`$${formatNumber(stats.terciles[0])}/m²`} color="green" />
                    <StatCard label="Precio de Mercado" value={formatCurrency(valuation.market)} subtext={`$${formatNumber(stats.avg)}/m²`} color="blue" />
                    <StatCard label="Precio Alto" value={formatCurrency(valuation.high)} subtext={`$${formatNumber(stats.terciles[2])}/m²`} color="amber" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4"><Card className="h-full"><div className="p-4 space-y-4"><h2 className="font-semibold text-xs uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-4 h-4 text-brand" />Datos del Reporte</h2><div className="space-y-4"><div className="bg-slate-50 p-3 rounded-lg border"><label className="text-xs text-slate-500 uppercase font-bold mb-1.5 block">Cargar Agente</label><select onChange={(e) => handleSelectAgent(e.target.value)} className="w-full text-sm" value=""><option value="" disabled>Seleccionar...</option>{loadingAgents ? <option disabled>Cargando...</option> : agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div><div className="space-y-3"><div className="bg-slate-50 p-3 rounded-lg border"><label className="text-xs text-slate-500 uppercase font-bold mb-1.5 block">Cargar Cliente</label><select onChange={(e) => handleSelectClient(e.target.value)} className="w-full text-sm" value=""><option value="" disabled>Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs text-slate-500 uppercase font-medium">Cliente</label><input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 text-sm" placeholder="Nombre del Cliente" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Agente</label><input type="text" value={brokerName} onChange={e => setBrokerName(e.target.value)} className="w-full mt-1 text-sm" placeholder="Ej: Juan Pérez" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Matrícula</label><input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full mt-1 text-sm" placeholder="Ej: CUCICBA 1234" /></div><button onClick={handleSaveAgent} disabled={isSavingAgent || !brokerName || !matricula} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 mt-2">{isSavingAgent ? 'Guardando...' : <><Save className="w-3 h-3" /> GUARDAR AGENTE</>}</button></div></div></div></Card></div>
          </div>
        </div>

        {editingCompId && editingComparable && (<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]"><div className="flex items-center justify-between mb-4 pb-2 border-b"><h3 className="text-xl font-bold font-heading">Editar Comparable</h3><button onClick={() => setEditingCompId(null)} className="p-2"><X className="w-5 h-5" /></button></div><div className="flex-1 overflow-y-auto space-y-6 pr-2"><div className="space-y-4"><h4 className="text-xs font-bold text-brand uppercase">Indispensables</h4><div><label className="text-xs text-slate-500 uppercase font-medium">Dirección</label>{isLoaded ? <AddressAutocomplete value={editingComparable.address} onChange={(val, loc) => updateComparable(editingComparable.id, { address: val, location: loc })} className="w-full mt-1 text-sm" /> : <input type="text" value={editingComparable.address} onChange={e => updateComparable(editingComparable.id, { address: e.target.value })} className="w-full mt-1 text-sm" />}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 uppercase font-medium">Precio (USD)</label><input type="number" value={editingComparable.price} onChange={e => updateComparable(editingComparable.id, { price: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Días en Mercado</label><input type="number" value={editingComparable.daysOnMarket} onChange={e => updateComparable(editingComparable.id, { daysOnMarket: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 uppercase font-medium">Cubierta m²</label><input type="number" value={editingComparable.coveredSurface} onChange={e => updateComparable(editingComparable.id, { coveredSurface: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Descubierta m²</label><input type="number" value={editingComparable.uncoveredSurface} onChange={e => updateComparable(editingComparable.id, { uncoveredSurface: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-slate-500 uppercase font-medium">Ambientes</label><input type="number" value={editingComparable.rooms} onChange={e => updateComparable(editingComparable.id, { rooms: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Dormitorios</label><input type="number" value={editingComparable.bedrooms} onChange={e => updateComparable(editingComparable.id, { bedrooms: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Baños</label><input type="number" value={editingComparable.bathrooms} onChange={e => updateComparable(editingComparable.id, { bathrooms: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-center" /></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 uppercase font-medium">Antigüedad</label><input type="number" value={editingComparable.age} onChange={e => updateComparable(editingComparable.id, { age: parseFloat(e.target.value) || 0 })} className="w-full mt-1" /></div><div className="flex items-center pt-6"><label className="flex items-center gap-2 cursor-pointer"><div className={`w-5 h-5 rounded border flex items-center justify-center ${editingComparable.garage ? 'bg-brand border-brand text-white' : 'bg-slate-50'}`}>{editingComparable.garage && <CheckSquare className="w-4 h-4" />}</div><input type="checkbox" className="hidden" checked={!!editingComparable.garage} onChange={e => updateComparable(editingComparable.id, { garage: e.target.checked })} /><span className="text-sm font-medium">Tiene Cochera</span></label></div></div></div><div className="space-y-4 pt-4 border-t"><ImageUpload images={editingComparable.images || []} onImagesChange={(imgs) => updateComparable(editingComparable.id, { images: imgs })} label="Fotos del Comparable" maxImages={4} /></div><div className="space-y-4 pt-4 border-t"><h4 className="text-xs font-bold text-slate-400 uppercase">Opcionales</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 uppercase font-medium">Semicubierta</label><input type="number" value={editingComparable.semiCoveredSurface} onChange={e => updateComparable(editingComparable.id, { semiCoveredSurface: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Toilettes</label><input type="number" value={editingComparable.toilettes} onChange={e => updateComparable(editingComparable.id, { toilettes: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div></div><div><label className="text-xs text-slate-500 uppercase font-medium">Pisos</label><input type="text" value={editingComparable.floorType || ''} onChange={e => updateComparable(editingComparable.id, { floorType: e.target.value })} className="w-full mt-1 text-sm" placeholder="Ej: Porcelanato" /></div><div><label className="text-xs text-slate-500 uppercase font-medium">Deptos. Edificio</label><input type="number" value={editingComparable.apartmentsInBuilding} onChange={e => updateComparable(editingComparable.id, { apartmentsInBuilding: parseFloat(e.target.value) || 0 })} className="w-full mt-1 text-sm" /></div><div className="space-y-2 pt-2">{[{ label: 'Apto Crédito', key: 'isCreditEligible' }, { label: 'Apto Profesional', key: 'isProfessional' }, { label: 'Financiamiento', key: 'hasFinancing' }].map(item => (<label key={item.label} className="flex items-center gap-2 cursor-pointer"><div className={`w-4 h-4 rounded border flex items-center justify-center ${editingComparable[item.key as keyof typeof editingComparable] ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50'}`}>{editingComparable[item.key as keyof typeof editingComparable] && <CheckSquare className="w-3 h-3" />}</div><input type="checkbox" className="hidden" checked={!!editingComparable[item.key as keyof typeof editingComparable]} onChange={e => updateComparable(editingComparable.id, { [item.key]: e.target.checked })} /><span className="text-xs">{item.label}</span></label>))}</div></div></div><div className="mt-6 pt-4 border-t flex justify-end"><button onClick={() => setEditingCompId(null)} className="px-4 py-2 bg-brand text-white rounded-lg text-sm">Listo</button></div></div></div>)}

        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
          <button onClick={() => handleSaveValuation({ target, comparables, clientName, currentValuationId }, onSaveSuccess)} className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg border" title="Guardar Valuación"><Save className="w-5 h-5" /></button>
          <PDFGenerator
            tipo="tasacion"
            data={{ target, comparables, valuation, clientName }} // Pass bundled data
            target={target}
            comparables={processedComparables}
            valuation={valuation}
            stats={stats}
            brokerName={brokerName}
            matricula={matricula}
            clientName={clientName}
            theme={pdfTheme}
            displayMode="icon"
            className="flex items-center justify-center w-12 h-12 bg-brand text-white rounded-full shadow-lg"
          />
        </div>
      </main>
    </div>
  );
}
export default Dashboard;
