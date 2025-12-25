import { useState } from 'react';
import { useSavedAgents } from '../../hooks/useSavedAgents';
import { Trash2, Save, User } from 'lucide-react';

interface AgentManagerSidebarProps {
    data: any;
    onUpdate: (path: string, value: any) => void;
}

const AgentManagerSidebar = ({ data, onUpdate }: AgentManagerSidebarProps) => {
    const { agents, addAgent, removeAgent, loading } = useSavedAgents();
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveAgent = async () => {
        if (!data.brokerName || !data.matricula) return;
        setIsSaving(true);
        try {
            await addAgent(data.brokerName, data.matricula);
        } catch (error) {
            console.error("Failed to save agent", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAgent = (agentId: string) => {
        if (!agentId) return;
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            onUpdate('brokerName', agent.name);
            onUpdate('matricula', agent.license);
        }
    };

    return (
        <div className="w-72 pt-8 sticky top-8">
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-indigo-200 shadow-lg flex flex-col gap-4">
                <h4 className="font-bold text-indigo-900 uppercase text-xs tracking-wider flex items-center gap-2 border-b border-indigo-100 pb-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Datos del Reporte
                </h4>

                {/* Cliente */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">Cliente</label>
                    <input
                        type="text"
                        value={data.clientName || ''}
                        onChange={(e) => onUpdate('clientName', e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                        placeholder="Nombre del Cliente"
                    />
                </div>

                <div className="border-t border-slate-100 my-1"></div>

                <h5 className="font-bold text-slate-700 text-xs flex items-center gap-2">
                    <User className="w-3 h-3 text-indigo-500" />
                    Agente / Corredor
                </h5>

                {/* Saved Agents Selector */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">Cargar Guardado</label>
                    <div className="relative">
                        <select
                            onChange={(e) => handleSelectAgent(e.target.value)}
                            className="w-full text-sm bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium appearance-none cursor-pointer hover:bg-indigo-50"
                            value="" // Always reset to prompt selection
                        >
                            <option value="" disabled>Seleccionar Agente...</option>
                            {loading ? (
                                <option disabled>Cargando...</option>
                            ) : (
                                agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-indigo-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Current Agent Edit */}
                <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">Nombre</label>
                        <input
                            type="text"
                            value={data.brokerName || ''}
                            onChange={(e) => onUpdate('brokerName', e.target.value)}
                            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">Matrícula</label>
                        <input
                            type="text"
                            value={data.matricula || ''}
                            onChange={(e) => onUpdate('matricula', e.target.value)}
                            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                            placeholder="Ej: CUCICBA 1234"
                        />
                    </div>

                    <button
                        onClick={handleSaveAgent}
                        disabled={isSaving || !data.brokerName || !data.matricula}
                        className="mt-1 flex items-center justify-center gap-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span>Guardando...</span>
                        ) : (
                            <>
                                <Save className="w-3 h-3" />
                                GUARDAR AGENTE
                            </>
                        )}
                    </button>
                </div>

                {/* List of Saved Agents for Management */}
                {agents.length > 0 && (
                    <div className="mt-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1 block mb-2">Agentes Guardados</label>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {agents.map((agent) => (
                                <div key={agent.id} className="group flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 transition-all">
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-slate-700 truncate">{agent.name}</span>
                                        <span className="text-[10px] text-slate-500 truncate">{agent.license}</span>
                                    </div>
                                    <button
                                        onClick={() => removeAgent(agent.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentManagerSidebar;
