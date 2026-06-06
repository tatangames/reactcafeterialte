// components/auth/CanAccess.tsx
import { useAuth } from '../../context/AuthContext';

interface CanAccessProps {
    children: React.ReactNode;
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    fallback?: React.ReactNode;
}

export const CanAccess = ({
                              children,
                              permission,
                              permissions = [],
                              requireAll = false,
                              fallback = null
                          }: CanAccessProps) => {
    const { hasPermission } = useAuth();

    // Si se proporciona un solo permiso
    if (permission && !hasPermission(permission)) {
        return <>{fallback}</>;
    }

    // Si se proporcionan múltiples permisos
    if (permissions.length > 0) {
        const hasAccess = requireAll
            ? permissions.every(p => hasPermission(p))
            : permissions.some(p => hasPermission(p));

        if (!hasAccess) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
};