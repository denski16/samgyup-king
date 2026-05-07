import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children, role }) => {
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkAccess = async () => {
            setLoading(true);

            // 1. Check Auth Session
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            console.log("DEBUG 1: Session Found?", !!currentSession);
            setSession(currentSession);

            if (currentSession) {
                // 2. Check Profiles Table
                console.log("DEBUG 2: Fetching role for ID:", currentSession.user.id);
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', currentSession.user.id)
                    .maybeSingle();

                if (error) console.error("DEBUG 3: Database Error:", error.message);

                if (profile) {
                    console.log("DEBUG 4: Role Found in DB:", profile.role);
                    console.log("DEBUG 5: Role Required by App.jsx:", role);
                    setUserRole(profile.role);
                } else {
                    console.error("DEBUG 4: NO PROFILE FOUND! Does this ID exist in your 'profiles' table?");
                }
            }
            setLoading(false);
        };

        checkAccess();
    }, [role]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-gray-950 text-white font-black italic uppercase animate-pulse">Loading</div>;
    }

    // --- THE REDIRECT LOGIC ---
    if (!session) {
        console.error("AUTH FAILED: No session. Redirecting to /login");
        return <Navigate to="/login" replace />;
    }

    // Strict Comparison: Trim and Case Check
    const dbRole = userRole?.trim();
    const reqRole = role?.trim();

    if (role && dbRole !== reqRole) {
        console.error(`ROLE MISMATCH: Page needs [${reqRole}], but you are [${dbRole}]. Redirecting...`);
        return <Navigate to="/login" replace />;
    }

    console.log("✅ ACCESS GRANTED to:", location.pathname);
    return children;
};

export default ProtectedRoute;