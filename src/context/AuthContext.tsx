import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
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
                // Solo se cierra la sesión si el servidor rechazó el token (el
                // interceptor redirige); sin conexión se conservan los datos guardados
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    clearAuth();
                    setUser(null);
                } else {
                    console.error('Error loading user:', error);
                }
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

            // Refrescar roles y permisos en segundo plano: pudieron cambiar desde el último login
            if (auth) {
                refreshUser();
            }
        };

        loadUser();
    }, []);

    // Si el administrador cambia los permisos del rol, se toman al volver a la ventana
    // y cada minuto, sin tener que cerrar sesión
    // Sesión cerrada en otra pestaña o ventana: esta también la suelta (ProtectedRoute manda al login)
    useEffect(() => {
        const alCambiarAlmacen = (e: StorageEvent) => {
            if ((e.key === 'auth' || e.key === null) && !getAuth()) setUser(null);
        };
        window.addEventListener('storage', alCambiarAlmacen);
        return () => window.removeEventListener('storage', alCambiarAlmacen);
    }, []);

    useEffect(() => {
        if (!user) return;
        // Sin sesión guardada (se cerró o expiró): se suelta el usuario para volver al login
        const refrescar = () => { if (getAuth()) refreshUser(); else setUser(null); };
        const timer = setInterval(refrescar, 60 * 1000);
        window.addEventListener('focus', refrescar);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', refrescar);
        };
    }, [user?.id]);

    const hasRole = (role: string): boolean => {
        return user?.roles?.includes(role) ?? false;
    };

    // El rol admin tiene acceso total (igual que Gate::before en el backend)
    const hasPermission = (permission: string): boolean => {
        if (hasRole('admin')) return true;
        return user?.permissions?.includes(permission) ?? false;
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