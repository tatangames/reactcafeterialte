// Lógica compartida por el registro y la edición de productos

import { ClaseProducto, ProductoEditInterface, ProductoFormInterface } from "../types/interfaces";

export const productoFormInicial: ProductoFormInterface = {
    sku: "",
    codigo_barras: "",
    nombre: "",
    descripcion: "",
    clase: "producto_terminado",
    se_vende: true,
    consumo_interno: false,
    controla_stock: true,
    permite_fraccion: false,
    costo_unitario: "",
    precio_venta: "",
    stock_minimo: "",
    orden_pos: "0",
    color_pos: "",
    unidad_medida_id: "",
    categorias: [],
    imagen: null,
};

// Valores sugeridos al elegir la clase (el usuario puede cambiarlos después)
export const defaultsPorClase = (clase: ClaseProducto): Partial<ProductoFormInterface> => {
    switch (clase) {
        case "materia_prima":
            return { clase, se_vende: false, controla_stock: true, permite_fraccion: true };
        case "empaque":
            return { clase, se_vende: false, controla_stock: true, permite_fraccion: false };
        case "reventa":
            return { clase, se_vende: true, controla_stock: true, permite_fraccion: false };
        default:
            return { clase, se_vende: true, controla_stock: true, permite_fraccion: false };
    }
};

// Datos del backend → formulario
export const productoAFormulario = (p: ProductoEditInterface): ProductoFormInterface => ({
    sku: p.sku ?? "",
    codigo_barras: p.codigo_barras ?? "",
    nombre: p.nombre ?? "",
    descripcion: p.descripcion ?? "",
    clase: p.clase,
    se_vende: p.se_vende,
    consumo_interno: !!p.consumo_interno,
    controla_stock: p.controla_stock,
    permite_fraccion: p.permite_fraccion,
    costo_unitario: String(Number(p.costo_unitario)),
    precio_venta: String(Number(p.precio_venta)),
    stock_minimo: p.stock_minimo ? String(p.stock_minimo) : "",
    orden_pos: String(p.orden_pos ?? 0),
    color_pos: p.color_pos ?? "",
    unidad_medida_id: String(p.unidad_medida_id),
    categorias: p.categorias ?? [],
    imagen: null,
});

// Devuelve el primer error o null
export const validarProducto = (form: ProductoFormInterface): string | null => {
    if (!form.nombre.trim()) return "El nombre es requerido";
    if (!form.unidad_medida_id) return "La unidad de medida es requerida";
    if (form.costo_unitario === "" || Number(form.costo_unitario) < 0) return "Ingresa el costo unitario (puede ser 0)";
    if (form.se_vende && !form.consumo_interno && (form.precio_venta === "" || Number(form.precio_venta) <= 0)) {
        return "Ingresa el precio de venta: el producto se vende en el POS";
    }
    if (form.color_pos && !/^#[0-9a-fA-F]{6}$/.test(form.color_pos)) return "El color debe tener el formato #RRGGBB";
    return null;
};

export const productoFormData = (form: ProductoFormInterface, activo?: boolean): FormData => {
    const fd = new FormData();
    const bool = (v: boolean) => (v ? "1" : "0");

    if (form.sku.trim()) fd.append("sku", form.sku.trim());
    if (form.codigo_barras.trim()) fd.append("codigo_barras", form.codigo_barras.trim());
    fd.append("nombre", form.nombre.trim());
    if (form.descripcion.trim()) fd.append("descripcion", form.descripcion.trim());
    fd.append("clase", form.clase);
    fd.append("se_vende", bool(form.se_vende || form.consumo_interno));
    fd.append("consumo_interno", bool(form.consumo_interno));
    fd.append("controla_stock", bool(form.controla_stock));
    fd.append("permite_fraccion", bool(form.permite_fraccion));
    fd.append("costo_unitario", form.costo_unitario || "0");
    fd.append("precio_venta", form.consumo_interno ? "0" : form.precio_venta || "0");
    fd.append("stock_minimo", form.stock_minimo || "0");
    fd.append("orden_pos", form.orden_pos || "0");
    if (form.color_pos) fd.append("color_pos", form.color_pos);
    fd.append("unidad_medida_id", form.unidad_medida_id);
    if (activo !== undefined) fd.append("activo", bool(activo));

    form.categorias.forEach((id, index) => {
        fd.append(`categorias[${index}]`, String(id));
    });

    if (form.imagen) fd.append("imagen", form.imagen);

    return fd;
};

// Margen sobre el precio de venta
export const margen = (costo: string, precio: string): { monto: number; porcentaje: number } | null => {
    const c = Number(costo);
    const p = Number(precio);
    if (!p || isNaN(c) || isNaN(p)) return null;
    return { monto: p - c, porcentaje: ((p - c) / p) * 100 };
};

// Colores sugeridos para los botones del POS
export const COLORES_POS = ["#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#3B82F6", "#10B981", "#84CC16", "#78350F"];
