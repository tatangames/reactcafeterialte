import { ClaseProducto, ProductoFormInterface } from "../../types/interfaces";

// Guía «¿Qué clase elijo?» del formulario de productos: qué es cada clase, ejemplos
// y qué casillas lleva. «Usar esta» aplica la clase con sus casillas.

type Ajustes = Pick<ProductoFormInterface, "clase" | "se_vende" | "controla_stock" | "permite_fraccion">;

interface Tipo {
    titulo: string;
    clase: ClaseProducto;
    queEs: string;
    movimiento: string;
    ejemplos: string;
    ajustes: Ajustes;
}

export const TIPOS_PRODUCTO: Tipo[] = [
    {
        titulo: "Producto terminado · se hornea y se guarda",
        clase: "producto_terminado",
        queEs: "Lo que el negocio hace por adelantado y se vende por pieza.",
        movimiento: "Sube al registrar la producción y baja al venderlo.",
        ejemplos: "Pan francés, concha, pastel tres leches (porción)",
        ajustes: { clase: "producto_terminado", se_vende: true, controla_stock: true, permite_fraccion: false },
    },
    {
        titulo: "Producto terminado · se prepara al momento",
        clase: "producto_terminado",
        queEs: "Lo que se prepara cuando el cliente lo pide; no tiene existencia propia.",
        movimiento: "Al venderlo bajan los ingredientes de su receta de venta.",
        ejemplos: "Café americano, limonada, desayuno, waffle",
        ajustes: { clase: "producto_terminado", se_vende: true, controla_stock: false, permite_fraccion: false },
    },
    {
        titulo: "Reventa",
        clase: "reventa",
        queEs: "Lo que se compra hecho y se vende igual, sin transformarlo.",
        movimiento: "Sube con la compra y baja al venderlo.",
        ejemplos: "Coca-Cola lata, agua embotellada, chicles",
        ajustes: { clase: "reventa", se_vende: true, controla_stock: true, permite_fraccion: false },
    },
    {
        titulo: "Materia prima",
        clase: "materia_prima",
        queEs: "Ingredientes para hacer los productos. No se venden solos.",
        movimiento: "Sube con la compra y baja con las recetas (al producir o al vender un plato).",
        ejemplos: "Harina (lb), azúcar (g), leche (ml), huevo (u), café molido (g)",
        ajustes: { clase: "materia_prima", se_vende: false, controla_stock: true, permite_fraccion: true },
    },
    {
        titulo: "Empaque",
        clase: "empaque",
        queEs: "Lo que acompaña al producto pero no se come.",
        movimiento: "Sube con la compra y baja con las recetas o con ajustes.",
        ejemplos: "Vaso desechable, tapa, bolsa, caja para pastel",
        ajustes: { clase: "empaque", se_vende: false, controla_stock: true, permite_fraccion: false },
    },
];

export const PREGUNTAS_CLASE = [
    "¿Lo hacemos o preparamos nosotros? → Producto terminado (con inventario si se hornea antes; sin inventario si se prepara al momento)",
    "¿Lo compramos y lo vendemos tal cual? → Reventa",
    "¿Es un ingrediente para hacer otra cosa? → Materia prima",
    "¿Es un recipiente o envoltura? → Empaque",
];

const coincide = (t: Tipo, f: Ajustes) =>
    t.clase === f.clase && (t.clase !== "producto_terminado" || t.ajustes.controla_stock === f.controla_stock);

function Casilla({ si, texto }: { si: boolean; texto: string }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${si ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
            {si ? "☑" : "☐"} {texto}
        </span>
    );
}

export default function AyudaClases({ form, onElegir, disabled }: {
    form: Ajustes;
    onElegir: (a: Ajustes) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-3 rounded-lg bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
            <div>
                <p className="font-semibold">Para decidir, pregúntate:</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                    {PREGUNTAS_CLASE.map((p) => <li key={p}>{p}</li>)}
                </ol>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {TIPOS_PRODUCTO.map((t) => {
                    const actual = coincide(t, form);
                    return (
                        <div key={t.titulo} className={`flex flex-col gap-1.5 rounded-md border bg-white px-3 py-2.5 ${actual ? "border-blue-500 ring-1 ring-blue-500" : "border-blue-100"}`}>
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-gray-900">{t.titulo}</p>
                                {actual
                                    ? <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">Elegida</span>
                                    : !disabled && (
                                        <button type="button" onClick={() => onElegir(t.ajustes)}
                                            className="shrink-0 rounded-full border border-blue-300 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100">
                                            Usar esta
                                        </button>
                                    )}
                            </div>
                            <p className="text-gray-700">{t.queEs}</p>
                            <p className="text-gray-600">{t.movimiento}</p>
                            <p className="text-gray-500"><span className="font-medium">Ej.:</span> {t.ejemplos}</p>
                            <div className="flex flex-wrap gap-1 pt-0.5 text-[11px]">
                                <Casilla si={t.ajustes.se_vende} texto="Se vende" />
                                <Casilla si={t.ajustes.controla_stock} texto="Lleva inventario" />
                                <Casilla si={t.ajustes.permite_fraccion} texto="Decimales" />
                            </div>
                        </div>
                    );
                })}
            </div>

            <p>
                <span className="font-semibold">Consumo interno</span> (cena del personal, cortesías): elige «Producto terminado ·
                se prepara al momento» y marca también la casilla Consumo interno.
            </p>
            <p className="text-blue-800/80">
                La clase ordena el inventario y los reportes; lo que el sistema hace con el producto lo deciden las casillas.
                «Decimales» se marca cuando se cuenta por peso o medida (lb, g, ml), no por pieza.
            </p>
        </div>
    );
}
