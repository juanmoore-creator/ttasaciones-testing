import React, { useState, useRef } from 'react';
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    LayoutGrid,
    List as ListIcon,
    Upload,
    FileText,
    Image as ImageIcon,
    MoreVertical,
    Home,
    Building2,
    User,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';

interface FileItem {
    id: string;
    name: string;
    size: string;
    type: 'pdf' | 'image' | 'doc';
    category: 'Legal' | 'Marketing' | 'Propiedad' | 'Cliente';
    linkedTo: {
        type: 'property' | 'client' | 'development';
        name: string;
    };
    uploadDate: string;
}

// Mock data based on the design
const MOCK_FILES: FileItem[] = [
    {
        id: '1',
        name: 'Contrato_Arrendamiento_Lomas.pdf',
        size: '2.4 MB',
        type: 'pdf',
        category: 'Legal',
        linkedTo: { type: 'property', name: 'Casa en Lomas de Chapultepec' },
        uploadDate: '24 Oct 2023'
    },
    {
        id: '2',
        name: 'Fotos_Fachada_Polanco.jpg',
        size: '4.1 MB',
        type: 'image',
        category: 'Marketing',
        linkedTo: { type: 'development', name: 'Depto en Polanco' },
        uploadDate: '22 Oct 2023'
    },
    {
        id: '3',
        name: 'Escrituras_Santa_Fe.docx',
        size: '1.8 MB',
        type: 'doc',
        category: 'Propiedad',
        linkedTo: { type: 'property', name: 'Oficina Santa Fe' },
        uploadDate: '15 Oct 2023'
    },
    {
        id: '4',
        name: 'ID_Cliente_JuanPerez.pdf',
        size: '800 KB',
        type: 'pdf',
        category: 'Cliente',
        linkedTo: { type: 'client', name: 'Juan Perez' },
        uploadDate: '10 Oct 2023'
    },
    {
        id: '5',
        name: 'Avaluo_Terreno_Pedregal.pdf',
        size: '5.2 MB',
        type: 'pdf',
        category: 'Legal',
        linkedTo: { type: 'property', name: 'Terreno en Pedregal' },
        uploadDate: '05 Oct 2023'
    }
];

export default function FilesPage() {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Using relative URL to support both local proxy and Vercel deployment
            const response = await fetch('/api/upload-to-drive', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            alert(`Archivo subido con éxito! ID: ${data.fileId}`);
            // Here you would typically refresh the file list
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error al subir el archivo: ' + (error as Error).message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    const getFileIcon = (type: FileItem['type']) => {
        switch (type) {
            case 'pdf': return <FileText className="text-red-500" />;
            case 'image': return <ImageIcon className="text-blue-500" />;
            case 'doc': return <FileText className="text-blue-700" />; // Simplified doc icon
            default: return <FileText className="text-gray-500" />;
        }
    };

    const getCategoryColor = (category: FileItem['category']) => {
        switch (category) {
            case 'Legal': return 'bg-purple-100 text-purple-700';
            case 'Marketing': return 'bg-pink-100 text-pink-700';
            case 'Propiedad': return 'bg-green-100 text-green-700';
            case 'Cliente': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getLinkedIcon = (type: FileItem['linkedTo']['type']) => {
        switch (type) {
            case 'property': return <Home className="w-4 h-4 text-gray-400 mr-2" />;
            case 'development': return <Building2 className="w-4 h-4 text-gray-400 mr-2" />;
            case 'client': return <User className="w-4 h-4 text-gray-400 mr-2" />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Archivos</h1>
                    <p className="text-gray-500">Gestiona y organiza todos los documentos de la inmobiliaria</p>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={handleUploadClick}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg flex items-center transition-colors shadow-lg shadow-purple-200"
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
                        {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de archivo..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent block"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <button className="flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                    <Filter className="w-5 h-5 mr-2 text-gray-400" />
                    Todas las categorías
                </button>

                <button className="flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                    <CalendarIcon className="w-5 h-5 mr-2 text-gray-400" />
                    Cualquier fecha
                </button>

                <div className="ml-auto flex bg-white border border-gray-200 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Nombre del Archivo</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4">Vinculado A</th>
                            <th className="px-6 py-4">Fecha de Subida</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {MOCK_FILES.map((file) => (
                            <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-gray-100 rounded-lg mr-4">
                                            {getFileIcon(file.type)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{file.name}</p>
                                            <p className="text-xs text-gray-500">{file.size}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(file.category)}`}>
                                        {file.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-sm text-gray-600">
                                        {getLinkedIcon(file.linkedTo.type)}
                                        {file.linkedTo.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {file.uploadDate}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500">
                    Mostrando <span className="font-medium">1</span> a <span className="font-medium">5</span> de <span className="font-medium">24</span> resultados
                </p>
                <div className="flex items-center space-x-2">
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <button className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center font-medium shadow-md shadow-purple-200">
                        1
                    </button>
                    <button className="w-10 h-10 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center font-medium">
                        2
                    </button>
                    <button className="w-10 h-10 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center font-medium">
                        3
                    </button>
                    <span className="w-10 h-10 text-gray-400 flex items-center justify-center">...</span>
                    <button className="w-10 h-10 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center font-medium">
                        8
                    </button>
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}
