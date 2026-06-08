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


export interface InventarioInterface {
    id: number;
    producto_id: number;
    producto: string;
    sku: string | null;
    imagen: string | null;
    stock_actual: number;
    stock_minimo: number;
    bajo_minimo: boolean;
}

export interface MovimientoFormInterface {
    producto_id: string;
    tipo: 'entrada' | 'salida' | 'ajuste';
    cantidad: string;
    motivo: string;
}





export interface InventarioStockInterface {
    producto_id:  number;
    producto:     string;
    sku:          string | null;
    imagen:       string | null;
    stock_actual: number;
    stock_minimo: number;
    bajo_minimo:  boolean;
}

export interface EntradaDetalleInterface {
    producto_id:      number;
    producto:         string;
    sku:              string | null;
    imagen:           string | null;
    cantidad:         number;
    stock_anterior:   number;
    stock_resultante: number;
}

export interface EntradaInventarioInterface {
    id:          number;
    fecha:       string;
    tipo:        'entrada' | 'salida' | 'ajuste' | 'produccion' | 'venta';
    descripcion: string | null;
    usuario:     string | null;
    total_items: number;
    detalles:    EntradaDetalleInterface[];
}

export interface EntradaFormItem {
    producto_id: string;
    cantidad:    string;
}

export interface EntradaFormInterface {
    fecha:       string;
    tipo:        'entrada' | 'salida' | 'ajuste' | 'produccion';
    descripcion: string;
    items:       EntradaFormItem[];
}


















