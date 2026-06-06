import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../services/api';
import { getAuth, setAuth as setAuthStorage, clearAuth, User } from '../utils/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasPermission: (permission: string) => boolean;
    hasRole: (role: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    setUser: (user: User | null) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Función para refrescar los datos del usuario
    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const userData = await getMe(token);
                setUser(userData);

                // Actualizar también en localStorage
                const auth = getAuth();
                if (auth) {
                    setAuthStorage(auth.token, auth.tokenType, userData);
                }
            } catch (error) {
                console.error('Error loading user:', error);
                clearAuth();
                setUser(null);
            }
        } else {
            setUser(null);
        }
    };

    // Cargar usuario al montar el componente
    useEffect(() => {
        const loadUser = async () => {
            const auth = getAuth();
            if (auth && auth.user) {
                setUser(auth.user);
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const hasPermission = (permission: string): boolean => {
        return user?.permissions?.includes(permission) ?? false;
    };

    const hasRole = (role: string): boolean => {
        return user?.roles?.includes(role) ?? false;
    };

    const hasAnyPermission = (permissions: string[]): boolean => {
        return permissions.some(permission => hasPermission(permission));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                hasPermission,
                hasRole,
                hasAnyPermission,
                setUser,
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};