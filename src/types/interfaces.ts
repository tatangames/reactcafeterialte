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

export interface ProductoInterface {
    id: number;
    sku: string | null;
    nombre: string;
    descripcion: string | null;
    imagen: string | null;
    tipo: "bien" | "servicio" | "bien_servicio";
    costo_unitario: string;
    activo: boolean;
    unidad_medida: string | null;
    categorias: string[];
}

export interface ProductoFormInterface {
    sku: string;
    nombre: string;
    descripcion: string;
    tipo: "bien" | "servicio" | "bien_servicio";
    costo_unitario: string;
    unidad_medida_id: string;
    categorias: number[];
    imagen: File | null;
}

export interface ProductoEditInterface {
    id: number;
    sku: string | null;
    nombre: string;
    descripcion: string | null;
    imagen: string | null;
    tipo: "bien" | "servicio" | "bien_servicio";
    costo_unitario: string;
    unidad_medida_id: number;
    activo: boolean;
    categorias: number[];
}













