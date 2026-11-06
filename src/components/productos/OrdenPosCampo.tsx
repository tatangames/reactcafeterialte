import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import FormField, { inputClass } from "../form/FormField";
import { getOrdenPos, OrdenPosResponse, vecinosEnPos } from "../../services/ordenPos";

interface Props {
    valor: string;
    nombre: string;
    categorias: number[];
    productoId?: number;               // En edición no se cambia solo
    onChange: (valor: string) => void;
}

/**
 * Campo "Orden" del botón del POS. Al crear, propone el siguiente lugar libre de su
 * categoría (queda al final) y muestra entre qué productos va a quedar.
 */
export default function OrdenPosCampo({ valor, nombre, categorias, productoId, onChange }: Props) {
    const [datos, setDatos] = useState<OrdenPosResponse | null>(null);
    const tocado = useRef(Boolean(productoId));

    useEffect(() => { getOrdenPos().then(setDatos).catch(() => null); }, []);

    const vecinos = datos ? vecinosEnPos(datos.productos, categorias, productoId) : [];
    const siguiente = (vecinos.length ? Math.max(...vecinos.map(p => p.orden_pos)) : 0) + (datos?.paso ?? 10);

    // Producto nuevo: va al final de su categoría hasta que el usuario escriba otro número
    useEffect(() => {
        if (datos && !tocado.current && valor !== String(siguiente)) onChange(String(siguiente));
    }, [datos, siguiente, valor, onChange]);

    // Dónde cae con el número actual (el POS desempata por nombre)
    const numero = Number(valor || 0);
    const yo = { id: -1, nombre: nombre.trim() || "Este producto", orden_pos: numero };
    const lista = [...vecinos, yo].sort((a, b) => a.orden_pos - b.orden_pos || a.nombre.localeCompare(b.nombre));
    const pos = lista.indexOf(yo);
    const antes = lista[pos - 1];
    const despues = lista[pos + 1];
    const enCategoria = categorias.length && datos
        ? datos.categorias.filter(c => categorias.includes(c.id)).map(c => c.nombre).join(", ")
        : "todo el POS";

    return (
        <FormField label="Orden" hint="Los números menores aparecen primero">
            <div className="flex gap-2">
                <input type="number" min={0} value={valor} className={inputClass}
                    onChange={(e) => { tocado.current = true; onChange(e.target.value); }} />
                {datos && Number(valor) !== siguiente && (
                    <button type="button" onClick={() => { tocado.current = true; onChange(String(siguiente)); }}
                        className="shrink-0 rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-700 hover:bg-gray-200"
                        title="El siguiente número libre de su categoría">
                        Al final ({siguiente})
                    </button>
                )}
            </div>
            {datos && (
                <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <p className="font-medium text-gray-700">En {enCategoria}: posición {pos + 1} de {lista.length}</p>
                    {lista.length === 1
                        ? <p>Es el único producto de su categoría.</p>
                        : <p>
                            {antes ? <>Después de <b>{antes.nombre}</b> ({antes.orden_pos})</> : "Primero"}
                            {" · "}
                            {despues ? <>antes de <b>{despues.nombre}</b> ({despues.orden_pos})</> : "último"}
                          </p>}
                    <Link to="/admin/productos/orden-pos" className="mt-1 inline-block font-medium text-blue-600 hover:underline">
                        Ordenar arrastrando →
                    </Link>
                </div>
            )}
        </FormField>
    );
}
