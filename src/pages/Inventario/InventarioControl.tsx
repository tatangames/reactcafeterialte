import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MoneyInput from '../../components/form/MoneyInput';
import { FilaCargando } from '../../components/ui/loading/Cargando';
import { useAuth } from '../../context/AuthContext';
import { actualizarStockMinimo, getStock } from '../../services/inventario';
import { InventarioStockInterface } from '../../types/interfaces';
import { CLASES_PRODUCTO, cantidad, fechaHora, mensajeError } from '../../utils/formato';

type Vista = 'por_comprar' | 'sin_existencia' | 'sin_minimo' | 'todos';

const selectClass = 'h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none';

const VISTAS: { valor: Vista; titulo: string; ayuda: string; filtro: (p: InventarioStockInterface) => boolean; tono: string }[] = [
    {
        valor: 'por_comprar', titulo: 'Por comprar', tono: 'amber',
        ayuda: 'Exactamente lo que sale en «POR COMPRAR» del ticket de cierre de turno: en su mínimo, por debajo o en negativo.',
        filtro: p => p.bajo_minimo,
    },
    {
        valor: 'sin_existencia', titulo: 'Sin existencia', tono: 'red',
        ayuda: 'Existencia en 0 o negativa. Los que no tienen mínimo no salen en el cierre: revísalos aquí.',
        filtro: p => p.stock_actual <= 0,
    },
    {
        valor: 'sin_minimo', titulo: 'Sin mínimo', tono: 'gray',
        ayuda: 'Sin stock mínimo configurado: nunca salen en el cierre aunque se acaben (solo si quedan en negativo).',
        filtro: p => p.stock_minimo <= 0,
    },
    { valor: 'todos', titulo: 'Todos', tono: 'gray', ayuda: 'Todos los productos activos que llevan inventario.', filtro: () => true },
];

// Control de existencias: la lista de compras del cierre de turno, a la vista en cualquier momento,
// más lo que se acabó sin tener mínimo (y por eso no aparece en el ticket de cierre)
export default function InventarioControl() {
    const { hasPermission } = useAuth();
    const puedeMinimo = hasPermission('inventario.ajustar') || hasPermission('productos.gestionar');
    const puedeKardex = hasPermission('inventario.kardex');

    const [productos, setProductos] = useState<InventarioStockInterface[] | null>(null);
    const [actualizado, setActualizado] = useState<Date | null>(null);
    const [vista, setVista] = useState<Vista>('por_comprar');
    const [clase, setClase] = useState('');
    const [buscar, setBuscar] = useState('');
    const [editando, setEditando] = useState<{ id: number; valor: string } | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        getStock().then(p => { setProductos(p); setActualizado(new Date()); })
            .catch(e => toast.error(mensajeError(e, 'Error al cargar las existencias')));
    }, []);
    useEffect(() => {
        cargar();
        // Se refresca solo cada minuto mientras la pantalla está abierta
        const id = window.setInterval(cargar, 60000);
        return () => window.clearInterval(id);
    }, [cargar]);

    const actual = VISTAS.find(v => v.valor === vista)!;
    const texto = buscar.trim().toLowerCase();
    const filas = useMemo(() => (productos ?? [])
        .filter(actual.filtro)
        .filter(p => !clase || p.clase === clase)
        .filter(p => !texto || p.producto.toLowerCase().includes(texto) || (p.sku ?? '').toLowerCase().includes(texto))
        // Primero lo que está más lejos de su mínimo (igual que el ticket de cierre)
        .sort((a, b) => Number(b.bajo_minimo) - Number(a.bajo_minimo)
            || (a.stock_actual - a.stock_minimo) - (b.stock_actual - b.stock_minimo)
            || a.producto.localeCompare(b.producto)),
    [productos, actual, clase, texto]);

    const guardarMinimo = async (p: InventarioStockInterface) => {
        if (!editando) return;
        setGuardando(true);
        try {
            const res = await actualizarStockMinimo(p.producto_id, Number(editando.valor || 0));
            toast.success(res.message);
            setEditando(null);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar el mínimo'));
        } finally {
            setGuardando(false);
        }
    };

    const tonoTarjeta = (v: typeof VISTAS[number]) => vista !== v.valor ? 'border-gray-200 bg-white hover:bg-gray-50'
        : v.tono === 'red' ? 'border-red-400 bg-red-50' : v.tono === 'amber' ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50';
    const colorNumero = (v: typeof VISTAS[number], n: number) =>
        n === 0 || v.tono === 'gray' ? 'text-gray-800' : v.tono === 'red' ? 'text-red-600' : 'text-amber-600';

    return (
        <div className="p-6">
            <PageHeader title="Control de existencias"
                subtitle="La lista «Por comprar» del cierre de turno y lo que se acabó, a la vista en cualquier momento"
                actions={<>
                    <span className="self-center text-xs text-gray-500">{actualizado ? `Actualizado ${fechaHora(actualizado.toISOString())}` : ''}</span>
                    <button type="button" onClick={cargar} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Actualizar</button>
                    <Link to="/admin/inventario" className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Inventario completo</Link>
                </>} />

            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {VISTAS.map(v => {
                    const n = (productos ?? []).filter(v.filtro).length;
                    return (
                        <button key={v.valor} type="button" onClick={() => setVista(v.valor)}
                            className={`rounded-xl border p-4 text-left transition ${tonoTarjeta(v)}`}>
                            <p className="text-xs text-gray-500">{v.titulo}</p>
                            <p className={`text-2xl font-semibold ${colorNumero(v, n)}`}>{productos ? n : '—'}</p>
                        </button>
                    );
                })}
            </div>

            <p className="mb-3 text-sm text-gray-600">{actual.ayuda}</p>

            <div className="mb-4 flex flex-wrap justify-end gap-3">
                <select value={clase} onChange={e => setClase(e.target.value)} className={selectClass}>
                    <option value="">Todas las clases</option>
                    {Object.entries(CLASES_PRODUCTO).map(([valor, t]) => <option key={valor} value={valor}>{t}</option>)}
                </select>
                <input type="text" placeholder="Buscar producto o SKU..." value={buscar} onChange={e => setBuscar(e.target.value)}
                    className="h-[42px] w-full sm:w-[280px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3 text-right">Existencia</th>
                            <th className="px-4 py-3 text-right">Mínimo</th>
                            <th className="px-4 py-3 text-right">Falta para el mínimo</th>
                            <th className="px-4 py-3">En el cierre de turno</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!productos && <FilaCargando colSpan={6} />}
                        {productos && filas.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                {vista === 'por_comprar' ? 'Nada en su mínimo: el cierre de turno saldría «Nada bajo el mínimo».' : 'No hay productos en esta lista.'}
                            </td></tr>
                        )}
                        {filas.map(p => {
                            const falta = Math.max(p.stock_minimo - p.stock_actual, 0);
                            const enEdicion = editando?.id === p.producto_id;
                            return (
                                <tr key={p.producto_id} className={p.stock_actual <= 0 ? 'bg-red-50/40' : p.bajo_minimo ? 'bg-amber-50/40' : ''}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-800">{p.producto}</p>
                                        <p className="text-xs text-gray-500">{CLASES_PRODUCTO[p.clase] ?? p.clase}{p.categorias.length ? ` · ${p.categorias.join(', ')}` : ''}</p>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-semibold ${p.stock_actual < 0 ? 'text-red-600' : p.stock_actual === 0 ? 'text-red-500' : p.bajo_minimo ? 'text-amber-600' : 'text-gray-800'}`}>
                                        {cantidad(p.stock_actual, p.unidad)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {enEdicion ? (
                                            <div className="ml-auto flex w-56 items-center gap-2">
                                                <MoneyInput value={editando.valor} onChange={v => setEditando({ id: p.producto_id, valor: v })}
                                                    decimals={p.permite_fraccion ? 4 : 0} suffix={p.unidad ?? undefined} placeholder="0" />
                                                <button type="button" onClick={() => guardarMinimo(p)} disabled={guardando}
                                                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">OK</button>
                                                <button type="button" onClick={() => setEditando(null)} className="text-xs text-gray-500 hover:underline">✕</button>
                                            </div>
                                        ) : puedeMinimo ? (
                                            <button type="button" onClick={() => setEditando({ id: p.producto_id, valor: p.stock_minimo ? String(p.stock_minimo) : '' })}
                                                className={`hover:underline ${p.stock_minimo > 0 ? 'text-gray-700' : 'text-blue-600'}`} title="Cambiar el mínimo">
                                                {p.stock_minimo > 0 ? cantidad(p.stock_minimo, p.unidad) : 'Poner mínimo'}
                                            </button>
                                        ) : (
                                            <span className="text-gray-500">{p.stock_minimo > 0 ? cantidad(p.stock_minimo, p.unidad) : '—'}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">{falta > 0 ? cantidad(falta, p.unidad) : '—'}</td>
                                    <td className="px-4 py-3">
                                        {p.bajo_minimo
                                            ? <StatusBadge tone={p.stock_actual <= 0 ? 'danger' : 'warning'}>Sale en «Por comprar»</StatusBadge>
                                            : p.stock_actual <= 0
                                                ? <span className="text-xs font-medium text-red-600">No sale: no tiene mínimo</span>
                                                : <span className="text-xs text-gray-400">No sale</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {puedeKardex && <Link to={`/admin/inventario/kardex/${p.producto_id}`} className="text-sm font-medium text-blue-600 hover:underline">Kárdex</Link>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
