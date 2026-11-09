export interface PermisoInterface {
    id: number;
    name: string;
    description: string;
}

export type Permiso = PermisoInterface;

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

export type TipoUnidad = "unidad" | "masa" | "volumen";

export interface UnidadMedidaInterface {
    id: number;
    nombre: string;
    abreviatura: string | null;
    tipo: TipoUnidad;
    factor_base: string;
    estado: boolean;
}

export interface UnidadMedidaFormInterface {
    nombre: string;
    abreviatura: string;
    tipo: TipoUnidad;
    factor_base: string;
    estado: boolean;
}

export interface CategoriasInterface {
    id: number;
    nombre: string;
    estado: boolean;
    area_preparacion_id?: number | null;
    area?: { id: number; nombre: string } | null; // a qué comanda van sus productos
}

export type ClaseProducto = "producto_terminado" | "materia_prima" | "reventa" | "empaque";

export interface ProductoInterface {
    id: number;
    sku: string | null;
    codigo_barras: string | null;
    nombre: string;
    descripcion: string | null;
    imagen: string | null;
    tipo: "bien" | "servicio" | "bien_servicio";
    clase: ClaseProducto;
    se_vende: boolean;
    controla_stock: boolean;
    costo_unitario: string;
    precio_venta: string;
    stock_actual: number | null;
    activo: boolean;
    unidad_medida: string | null;
    unidad_abrev: string | null;
    categorias: string[];
}

export interface ProductoFormInterface {
    sku: string;
    codigo_barras: string;
    nombre: string;
    descripcion: string;
    clase: ClaseProducto;
    se_vende: boolean;
    consumo_interno: boolean;
    controla_stock: boolean;
    permite_fraccion: boolean;
    imprime_comanda: boolean; // false: se entrega directo, nunca manda comanda a cocina/barra
    costo_unitario: string;
    precio_venta: string;
    stock_minimo: string;
    orden_pos: string;
    color_pos: string;
    unidad_medida_id: string;
    categorias: number[];
    imagen: File | null;
}

export interface ProductoEditInterface {
    id: number;
    sku: string | null;
    codigo_barras: string | null;
    nombre: string;
    descripcion: string | null;
    imagen: string | null;
    tipo: "bien" | "servicio" | "bien_servicio";
    clase: ClaseProducto;
    se_vende: boolean;
    consumo_interno: boolean;
    controla_stock: boolean;
    permite_fraccion: boolean;
    imprime_comanda?: boolean;
    costo_unitario: string;
    precio_venta: string;
    stock_actual: number;
    stock_minimo: number;
    orden_pos: number;
    color_pos: string | null;
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
    producto_id:      number;
    producto:         string;
    sku:              string | null;
    codigo_barras:    string | null;
    imagen:           string | null;
    clase:            ClaseProducto;
    categorias:       string[];
    unidad:           string | null;
    permite_fraccion: boolean;
    costo_unitario:   number;
    precio_venta:     number;
    valor_inventario: number;
    stock_actual:     number;
    stock_minimo:     number;
    bajo_minimo:      boolean;
}

export interface InventarioStockFiltros {
    clase?: string;
    categoria_id?: string;
    estado?: "" | "alerta" | "sin_stock";
    buscar?: string;
}

export interface AlertaStockInterface {
    producto_id:  number;
    producto:     string;
    clase:        ClaseProducto;
    unidad:       string | null;
    stock_actual: number;
    stock_minimo: number;
}

export type TipoMovimiento =
    | "entrada" | "salida" | "ajuste" | "produccion" | "venta"
    | "compra" | "merma" | "devolucion" | "anulacion" | "consumo_produccion" | "consumo_interno";

export interface MovimientoKardexInterface {
    id:              number;
    fecha:           string;
    tipo:            TipoMovimiento;
    tipo_texto:      string;
    referencia:      string | null;
    referencia_tipo: string | null;
    referencia_id:   number | null;
    motivo:          string | null;
    usuario:         string | null;
    turno?: string | null;
    entrada:         number;
    salida:          number;
    saldo:           number;
    costo_unitario:  number;
    costo_total:     number;
    // Solo en el historial general
    producto_id?:    number;
    producto?:       string;
    sku?:            string | null;
}

export interface PaginaInterface {
    pagina:        number;
    total_paginas: number;
    total:         number;
}

export interface KardexResponseInterface extends PaginaInterface {
    producto: {
        id: number;
        nombre: string;
        sku: string | null;
        clase: ClaseProducto;
        unidad: string | null;
        costo_unitario: number;
        stock_actual: number;
        stock_minimo: number;
    };
    desde:          string;
    hasta:          string;
    saldo_inicial:  number;
    total_entradas: number;
    total_salidas:  number;
    costo_entradas: number;
    costo_salidas:  number;
    saldo_final:    number;
    movimientos:    MovimientoKardexInterface[];
}

export interface MovimientosResponseInterface extends PaginaInterface {
    desde:       string;
    hasta:       string;
    movimientos: MovimientoKardexInterface[];
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
    turno?: string | null;
    total_items: number;
    detalles:    EntradaDetalleInterface[];
}

export interface EntradaFormItem {
    producto_id:    string;
    cantidad:       string;
    costo_unitario: string;
}

export interface EntradaFormInterface {
    fecha:       string;
    tipo:        'entrada' | 'salida' | 'ajuste' | 'produccion';
    descripcion: string;
    items:       EntradaFormItem[];
}





// dispositivo: la imprime la tablet del local (servidor en la nube)
export type ConexionImpresora = 'red' | 'windows' | 'dispositivo';
export type UsoImpresora = 'ticket' | 'comanda' | 'ambos';
export type CajonImpresora = 'ninguno' | 'pin2' | 'pin5';

// star_raster: Star TSP100 / TSP143, que solo imprimen imágenes
export type TipoImpresion = 'escpos' | 'star_raster';

export interface ImpresoraInterface {
    id: number;
    alias: string;
    conexion: ConexionImpresora;
    ip_impresora: string | null;
    puerto: number;
    nombre_windows: string | null;
    ip_servidor: string | null;
    tipo_impresion: TipoImpresion;
    ancho_caracteres: number;
    uso: UsoImpresora;
    predeterminada: boolean;
    cortar_papel: boolean;
    cash_drawer: CajonImpresora;
    activo: boolean;
    cajas: string[];
    areas: string[]; // áreas de preparación que mandan sus comandas aquí
}

export interface ImpresoraFormInterface {
    alias: string;
    conexion: ConexionImpresora;
    ip_impresora: string;
    puerto: string;
    nombre_windows: string;
    tipo_impresion: TipoImpresion;
    ancho_caracteres: number;
    uso: UsoImpresora;
    predeterminada: boolean;
    cortar_papel: boolean;
    cash_drawer: CajonImpresora;
    activo: boolean;
}

export interface TrabajoImpresionInterface {
    id: number;
    tipo: string;
    tipo_texto: string;
    impresora_id: number | null;
    impresora: string | null;
    documento_tipo: string | null;
    documento_id: number | null;
    estado: 'pendiente' | 'impreso' | 'error';
    intentos: number;
    error: string | null;
    usuario: string | null;
    fecha: string;
}

export interface ResultadoImpresionInterface {
    success: number;
    impreso: boolean;
    message: string;
    trabajos: TrabajoImpresionInterface[];
}



export interface ProveedorInterface {
    id: number;
    nombre: string;
    notas: string | null;
    activo: boolean;
}










// ************************  CONFIGURACIÓN DEL NEGOCIO  ******************

export interface ConfiguracionNegocioInterface {
    id: number;
    nombre: string;
    razon_social: string | null;
    nit: string | null;
    nrc: string | null;
    actividad_economica: string | null;
    tipo_establecimiento: string | null;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    logo: string | null;
    moneda: string;
    simbolo_moneda: string;
    permitir_stock_negativo: boolean;
    descuento_max_sin_autorizacion: string;
    cierre_ciego: boolean;
    aviso_cambio: boolean;
    ticket_por_comprar: boolean;
    mensaje_ticket: string | null;
}

export interface ConfiguracionNegocioFormInterface {
    nombre: string;
    razon_social: string;
    nit: string;
    nrc: string;
    actividad_economica: string;
    tipo_establecimiento: string;
    direccion: string;
    telefono: string;
    correo: string;
    moneda: string;
    simbolo_moneda: string;
    permitir_stock_negativo: boolean;
    descuento_max_sin_autorizacion: string;
    cierre_ciego: boolean;
    aviso_cambio: boolean;
    ticket_por_comprar: boolean;
    mensaje_ticket: string;
    logo: File | null;
}


// ************************  FACTURACIÓN ELECTRÓNICA (DTE El Salvador)  ******************

export interface FelActividad {
    codigo: string;
    descripcion: string;
}

export interface ConfiguracionFelInterface {
    id: number;
    activo: boolean;
    ambiente: string;
    proveedor: string;
    api_url: string | null;
    api_usuario: string | null;
    firmador_url: string | null;
    tiene_api_password: boolean;
    tiene_clave_privada: boolean;
    token_expira_at: string | null;
    nit: string | null;
    nrc: string | null;
    razon_social: string | null;
    nombre_comercial: string | null;
    actividades: FelActividad[] | null;
    tipo_establecimiento: string | null;
    cod_establecimiento_mh: string | null;
    cod_establecimiento: string | null;
    cod_punto_venta_mh: string | null;
    cod_punto_venta: string | null;
    departamento: string | null;
    municipio: string | null;
    distrito: string | null;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    tipos_dte: string[] | null;
    ultima_prueba_at: string | null;
    ultima_prueba_ok: boolean | null;
    ultima_prueba_mensaje: string | null;
}

export interface FelCatalogos {
    ambientes: Record<string, string>;
    proveedores: Record<string, string>;
    tipos_dte: Record<string, string>;
    tipos_establecimiento: Record<string, string>;
    actividades: FelActividad[];
    departamentos: Record<string, { nombre: string; municipios: Record<string, { nombre: string; distritos: string[] }> }>;
    firmador_url_defecto: string;
}

export interface ConfiguracionFelFormInterface {
    activo: boolean;
    ambiente: string;
    proveedor: string;
    api_url: string;
    api_usuario: string;
    api_password: string;
    firmador_url: string;
    clave_privada: string;
    nit: string;
    nrc: string;
    razon_social: string;
    nombre_comercial: string;
    actividades: FelActividad[];
    tipo_establecimiento: string;
    cod_establecimiento_mh: string;
    cod_establecimiento: string;
    cod_punto_venta_mh: string;
    cod_punto_venta: string;
    departamento: string;
    municipio: string;
    distrito: string;
    direccion: string;
    telefono: string;
    correo: string;
    tipos_dte: string[];
}
