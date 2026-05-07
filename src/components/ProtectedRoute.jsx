import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for changes (like logging out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div className="h-screen flex items-center justify-center font-black uppercase animate-pulse">Checking Access...</div>;
    }

    if (!session) {
        // Redirect to login if no session is found
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;