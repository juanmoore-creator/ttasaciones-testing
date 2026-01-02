import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
    collection, onSnapshot, query, orderBy, deleteDoc, doc, addDoc, updateDoc
} from 'firebase/firestore';
import type { Inmueble } from '../types/index';

export function useInmuebles() {
    const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!db) return;

        // Query properties ordered by creation date
        const q = query(
            collection(db, 'inmuebles'),
            orderBy('fechaCreacion', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Inmueble));
            setInmuebles(items);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching inmuebles:", err);
            setError("Error al cargar los inmuebles.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const deleteInmueble = async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'inmuebles', id));
        } catch (err) {
            console.error("Error deleting inmueble:", err);
            throw err;
        }
    };

    const addInmueble = async (data: Partial<Inmueble>) => {
        if (!db) return;
        try {
            await addDoc(collection(db, 'inmuebles'), {
                ...data,
                fechaCreacion: Date.now(),
                fechaActualizacion: Date.now(),
                status: data.status || 'Disponible'
            });
        } catch (err) {
            console.error("Error adding inmueble:", err);
            throw err;
        }
    };

    const updateInmueble = async (id: string, data: Partial<Inmueble>) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'inmuebles', id), {
                ...data,
                fechaActualizacion: Date.now()
            });
        } catch (err) {
            console.error("Error updating inmueble:", err);
            throw err;
        }
    };

    // Helper to get properties for a specific client
    const getInmueblesByPropietario = (propietarioId: string) => {
        return inmuebles.filter(i => i.propietarioId === propietarioId);
    };

    return {
        inmuebles,
        isLoading,
        error,
        addInmueble,
        updateInmueble,
        deleteInmueble,
        getInmueblesByPropietario
    };
}
