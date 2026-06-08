export interface PermisoInterface {
    id: number;
    name: string;
    description: string;
}

export interface InformacionAdministradorResponseInterface {
    success: number;
    info: {
        id: number;
        nombre: string;
        email: string;
        estado: boolean;
    };
    roles: {
        [key: string]: string;
    };
    rol_actual: string;
}

export interface UnidadMedidaInterface {
    id: number;
    nombre: string;
    estado: boolean;
}

export interface CategoriasInterface {
    id: number;
    nombre: string;
    estado: boolean;
}