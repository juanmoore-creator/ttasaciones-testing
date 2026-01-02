import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Inmueble } from '../types';

export function useInmueble(inmuebleId: string | undefined) {
    const [inmueble, setInmueble] = useState<Inmueble | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!inmuebleId || !db) {
            setIsLoading(false);
            return;
        }

        const inmuebleRef = doc(db, 'inmuebles', inmuebleId);

        const unsub = onSnapshot(inmuebleRef, (docSnap) => {
            if (docSnap.exists()) {
                setInmueble({ id: docSnap.id, ...docSnap.data() } as Inmueble);
            } else {
                setInmueble(null);
                setError('Propiedad no encontrada');
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error syncing inmueble:", err);
            setError('Error al obtener los datos de la propiedad');
            setIsLoading(false);
        });

        return () => unsub();
    }, [inmuebleId]);

    return { inmueble, isLoading, error };
}
