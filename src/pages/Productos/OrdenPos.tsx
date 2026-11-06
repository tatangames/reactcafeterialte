import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import PageHeader from "../../components/common/PageHeader";
import { STORAGE_URL } from "../../services/api";
import { getOrdenPos, guardarOrdenPos, OrdenPosResponse, ProductoOrdenPosInterface, vecinosEnPos } from "../../services/ordenPos";
import { dinero, mensajeError } from "../../utils/formato";

// Ordenar los botones del POS arrastrando, por categoría (como se ven al vender)
export default function OrdenPos() {
    const [datos, setDatos] = useState<OrdenPosResponse | null>(null);
    const [categoria, setCategoria] = useState<number | null>(null);
    const [lista, setLista] = useState<ProductoOrdenPosInterface[]>([]);
    const [cambios, setCambios] = useState(false);
    const [arrastrando, setArrastrando] = useState<number | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = () => getOrdenPos()
        .then(r => { setDatos(r); setCategoria(c => c ?? r.categorias[0]?.id ?? null); })
        .catch(e => toast.error(mensajeError(e, "No se pudieron cargar los productos")));
    useEffect(() => { cargar(); }, []);

    // La lista de la categoría elegida, en el orden actual del POS
    const original = useMemo(
        () => datos ? vecinosEnPos(datos.productos, categoria ? [categoria] : []) : [],
        [datos, categoria],
    );
    useEffect(() => { setLista(original); setCambios(false); }, [original]);

    const elegirCategoria = (id: number | null) => {
        if (cambios && !window.confirm("Hay cambios sin guardar en esta categoría. ¿Descartarlos?")) return;
        setCategoria(id);
    };

    const mover = (desde: number, hasta: number) => {
        if (hasta < 0 || hasta >= lista.length || desde === hasta) return;
        setLista(l => {
            const nueva = [...l];
            const [p] = nueva.splice(desde, 1);
            nueva.splice(hasta, 0, p);
            return nueva;
        });
        setCambios(true);
    };

    const guardar = async () => {
        setGuardando(true);
        try {
            const r = await guardarOrdenPos(lista.map(p => p.id));
            toast.success(r.message);
            setCambios(false);
            await cargar();
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo guardar el orden"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            <PageHeader title="Ordenar POS" backTo="/admin/productos/index"
                subtitle="Arrastra los botones al lugar donde quieres verlos al vender. Lo que va primero sale arriba."
                actions={<>
                    {cambios && (
                        <button type="button" onClick={() => { setLista(original); setCambios(false); }}
                            className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                            Deshacer
                        </button>
                    )}
                    <button type="button" onClick={guardar} disabled={!cambios || guardando}
                        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                        {guardando ? "Guardando..." : "Guardar orden"}
                    </button>
                </>} />

            <div className="mb-4 flex flex-wrap gap-2">
                {datos?.categorias.map(c => (
                    <button key={c.id} type="button" onClick={() => elegirCategoria(c.id)}
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${categoria === c.id ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}>
                        {c.nombre}
                    </button>
                ))}
                <button type="button" onClick={() => elegirCategoria(null)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${categoria === null ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}>
                    Todos
                </button>
            </div>

            {datos && lista.length === 0 && (
                <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No hay productos a la venta en esta categoría.</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {lista.map((p, n) => (
                    <div key={p.id} draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = "move"; setArrastrando(p.id); }}
                        onDragOver={e => {
                            e.preventDefault();
                            if (arrastrando !== null && arrastrando !== p.id) mover(lista.findIndex(x => x.id === arrastrando), n);
                        }}
                        onDragEnd={() => setArrastrando(null)}
                        className={`cursor-grab select-none overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm active:cursor-grabbing ${arrastrando === p.id ? "opacity-40" : ""}`}
                        style={{ borderTop: `6px solid ${p.color_pos || "#E5E7EB"}` }}>
                        <div className="relative flex h-20 items-center justify-center overflow-hidden bg-gray-50">
                            {p.imagen
                                ? <img src={STORAGE_URL + p.imagen} alt="" className="h-full w-full object-cover" draggable={false} />
                                : <span className="text-2xl" style={{ color: p.color_pos || "#9CA3AF" }}>●</span>}
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 text-xs font-semibold text-gray-700 shadow">{n + 1}</span>
                        </div>
                        <div className="p-2">
                            <p className="line-clamp-2 text-sm font-medium text-gray-800">{p.nombre}</p>
                            <p className="text-sm font-semibold text-blue-700">{dinero(p.precio)}</p>
                        </div>
                        {/* Para pantallas táctiles, donde no se puede arrastrar */}
                        <div className="flex border-t border-gray-100">
                            <button type="button" onClick={() => mover(n, n - 1)} disabled={n === 0} aria-label={`Mover ${p.nombre} antes`}
                                className="flex-1 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30">←</button>
                            <button type="button" onClick={() => mover(n, n + 1)} disabled={n === lista.length - 1} aria-label={`Mover ${p.nombre} después`}
                                className="flex-1 border-l border-gray-100 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30">→</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
