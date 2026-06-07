export interface Permiso {
    id: number;
    name: string;
    description: string;
}

export interface InformacionAdministradorResponse {
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