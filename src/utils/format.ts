export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);
};

export const formatDate = (timestamp: number | Date) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};
