import React, { useState, useRef, useEffect } from 'react';
import {
    Search,
    LayoutGrid,
    List as ListIcon,
    Upload,
    FileText,
    Image as ImageIcon,
    Home,
    Building2,
    User,
    Loader2,
    ExternalLink,
    Download
} from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface FileItem {
    id: string;
    name: string;
    size: string;
    type: string;
    mimeType: string;
    category: 'Legal' | 'Marketing' | 'Propiedad' | 'Cliente' | 'General';
    linkedTo?: {
        type: 'property' | 'client' | 'development';
        name: string;
    };
    uploadDate: string;
    webViewLink: string;
    webContentLink: string;
}

export default function FilesPage() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = async () => {
        if (!user) return;

        try {
            // Updated to user-scoped collection
            const q = query(collection(db, `users/${user.uid}/files`), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const fetchedFiles: FileItem[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Format date safely
                let dateStr = 'Fecha desconocida';
                if (data.createdAt) {
                    if (data.createdAt.toDate) {
                        dateStr = data.createdAt.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                    } else if (data.createdAt instanceof Date) {
                        dateStr = data.createdAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                }

                // Determine simple type for icon
                let simpleType = 'doc';
                if (data.mimeType?.includes('pdf')) simpleType = 'pdf';
                else if (data.mimeType?.includes('image')) simpleType = 'image';

                // Format size if it's a number (bytes)
                let sizeStr = data.size;
                if (typeof data.size === 'number') {
                    const mb = data.size / (1024 * 1024);
                    sizeStr = mb < 1 ? `${(data.size / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
                }

                return {
                    id: doc.id,
                    name: data.name,
                    size: sizeStr || 'Unknown',
                    type: simpleType,
                    mimeType: data.mimeType,
                    category: data.category || 'General',
                    linkedTo: data.linkedTo,
                    uploadDate: dateStr,
                    webViewLink: data.webViewLink,
                    webContentLink: data.webContentLink
                } as FileItem;
            });
            setFiles(fetchedFiles);
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchFiles();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Upload to Drive
            const response = await fetch('/api/upload-to-drive', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            // 2. Save metadata to Firestore (User Scoped)
            await addDoc(collection(db, `users/${user.uid}/files`), {
                driveFileId: data.fileId,
                name: data.name,
                mimeType: data.mimeType,
                size: data.size, // in bytes
                webViewLink: data.webViewLink,
                webContentLink: data.webContentLink,
                category: 'General', // Default
                createdAt: Timestamp.now(),
            });

            alert(`Archivo subido con éxito!`);
            fetchFiles(); // Refresh list
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

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return <FileText className="text-red-500" />;
            case 'image': return <ImageIcon className="text-blue-500" />;
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

    const getLinkedIcon = (type: string) => {
        switch (type) {
            case 'property': return <Home className="w-4 h-4 text-gray-400 mr-2" />;
            case 'development': return <Building2 className="w-4 h-4 text-gray-400 mr-2" />;
            case 'client': return <User className="w-4 h-4 text-gray-400 mr-2" />;
            default: return null;
        }
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                {loading ? (
                    <div className="p-12 flex justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No hay archivos subidos aún.
                    </div>
                ) : (
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
                            {filteredFiles.map((file) => (
                                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-gray-100 rounded-lg mr-4">
                                                {getFileIcon(file.type)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 truncate max-w-[200px]" title={file.name}>{file.name}</p>
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
                                        {file.linkedTo ? (
                                            <div className="flex items-center text-sm text-gray-600">
                                                {getLinkedIcon(file.linkedTo.type)}
                                                {file.linkedTo.name}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {file.uploadDate}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end space-x-2">
                                            {file.webViewLink && (
                                                <a
                                                    href={file.webViewLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
                                                    title="Previsualizar"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </a>
                                            )}
                                            {file.webContentLink && (
                                                <a
                                                    href={file.webContentLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-green-600 p-1 rounded-full hover:bg-green-50"
                                                    title="Descargar"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
