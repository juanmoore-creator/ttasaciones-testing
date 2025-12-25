import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export interface SavedAgent {
    id: string; // generated UUID or just name+timestamp
    name: string;
    license: string;
}

export const useSavedAgents = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState<SavedAgent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setAgents([]);
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'users', user.uid, 'settings', 'reportValues');

        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setAgents(data.agents || []);
            } else {
                // Initialize if not exists
                setDoc(docRef, { agents: [] }, { merge: true });
                setAgents([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const addAgent = async (name: string, license: string) => {
        if (!user) return;
        const newAgent: SavedAgent = {
            id: crypto.randomUUID(),
            name,
            license
        };
        const docRef = doc(db, 'users', user.uid, 'settings', 'reportValues');
        await updateDoc(docRef, {
            agents: arrayUnion(newAgent)
        });
    };

    const removeAgent = async (agentId: string) => {
        if (!user) return;
        const agentToRemove = agents.find(a => a.id === agentId);
        if (!agentToRemove) return;

        const docRef = doc(db, 'users', user.uid, 'settings', 'reportValues');
        await updateDoc(docRef, {
            agents: arrayRemove(agentToRemove)
        });
    };

    return { agents, loading, addAgent, removeAgent };
};
