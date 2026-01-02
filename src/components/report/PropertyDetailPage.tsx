import { MapPin, Bed, Bath, Ruler } from 'lucide-react';

interface PropertyDetailProps {
    property: any;
    index: number;
    theme?: {
        primary: string;
        secondary: string;
    };
}

const PropertyDetailPage = ({ property, index, theme }: PropertyDetailProps) => {
    const primaryColor = theme?.primary || '#1e293b';

    return (
        <div className="print-page h-[1123px] w-[794px] bg-white p-12 flex flex-col page-break-after-always">
            {/* Header */}
            <div className="flex justify-between items-end mb-8 border-b-2 pb-4" style={{ borderColor: primaryColor }}>
                <div>
                    <span className="text-sm font-bold text-slate-400">COMPARABLE #{index + 1}</span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{property.address}</h2>
                </div>
                <div className="text-xl font-bold" style={{ color: primaryColor }}>
                    U$S {property.price?.toLocaleString()}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 gap-8">
                {/* Image */}
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                    {property.coverImage || property.image ? (
                        <img src={property.coverImage || property.image} alt={property.address} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">Sin Imagen</div>
                    )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <span className="text-lg">{property.address}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 bg-slate-50 rounded">
                            <div className="text-xs text-slate-400 uppercase">Superficie</div>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Ruler className="w-4 h-4" />
                                {property.coveredSurface} m²
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                            <div className="text-xs text-slate-400 uppercase">Habitaciones</div>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Bed className="w-4 h-4" />
                                {property.rooms || '-'}
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                            <div className="text-xs text-slate-400 uppercase">Baños</div>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Bath className="w-4 h-4" />
                                {property.bathrooms || property.baths || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                <span>Ficha de Comparable</span>
                <span>Página {4 + index}</span>
            </div>
        </div>
    );
};

export default PropertyDetailPage;
