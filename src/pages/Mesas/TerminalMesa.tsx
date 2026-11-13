import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import QtyStepper from '../../components/form/QtyStepper';
import MotivoModal from '../../components/modal/MotivoModal';
import ModificadoresModal from '../../components/mesas/ModificadoresModal';
import CancelarItemModal from '../../components/mesas/CancelarItemModal';
import IngredientesModal from '../../components/mesas/IngredientesModal';
import DescuentoModal from '../../components/pos/DescuentoModal';
import PrecuentaImprimible from '../../components/mesas/PrecuentaImprimible';
import CobroModal from '../../components/pos/CobroModal';
import EstadoConexion from '../../components/pos/EstadoConexion';
import TicketVenta from '../../components/pos/TicketVenta';
import { useCaja } from '../../context/CajaContext';
import { useConexion } from '../../context/ConexionContext';
import { STORAGE_URL } from '../../services/api';
import { getConfiguracionNegocio } from '../../services/configuracion';
import { imprimirVentaServidor } from '../../services/impresion';
import {
    abrirTerminal, actualizarItem, agregarItems, anularComanda, cerrarOrden, cobrarOrden, crearTicket, dividirItem,
    eliminarTicket, entregarComanda, enviarComanda, entregarItems, getCatalogoMesas, getMapa, getTerminal, imprimirComanda, moverItems,
    quitarItem, renombrarTicket, ResultadoImpresion, trasladarOrden,
} from '../../services/mesas';
import { montoDescuento } from '../../utils/carrito';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { imprimirConRespaldo } from '../../utils/imprimir';
import { imprimirComandasNavegador } from '../../utils/imprimirComandas';
import { cantidad, dinero, mensajeError, fechaHora } from '../../utils/formato';
import { ConfiguracionNegocioInterface } from '../../types/interfaces';
import {
    CatalogoMesasInterface, ComandaInterface, ESTADOS_COMANDA, ESTADOS_ITEM, ItemOrdenInterface, OrdenInterface, ProductoMesaInterface,
    TerminalMapaInterface, transcurrido, idsModificadores, textoModificador } from '../../types/mesas';
import { DescuentoInterface, PagoFormInterface, VentaInterface } from '../../types/pos';
import { sinTildes } from '../../utils/texto';
import { useAuth } from '../../context/AuthContext';
import Cargando from '../../components/ui/loading/Cargando';

type Pestana = 'productos' | 'cuentas' | 'comandas';

function ChipEstado({ item }: { item: ItemOrdenInterface }) {
    if (item.pagado) return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">Pagado</span>;
    const e = ESTADOS_ITEM[item.estado];
    return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${e.clase}`}>{e.texto}</span>;
}

export default function TerminalMesa() {
    const { id } = useParams();
    const terminalId = Number(id);
    const navigate = useNavigate();
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const { enLinea } = useConexion();
    const { hasPermission } = useAuth();
    const verExistencias = hasPermission('pos.ver_existencias');

    const [terminal, setTerminal] = useState<{ id: number; nombre: string; tipo: string; capacidad: number } | null>(null);
    const [orden, setOrden] = useState<OrdenInterface | null>(null);
    const [cargado, setCargado] = useState(false);
    const [catalogo, setCatalogo] = useState<CatalogoMesasInterface | null>(null);
    const [negocio, setNegocio] = useState<ConfiguracionNegocioInterface | null>(null);

    const [pestana, setPestana] = useState<Pestana>('productos');
    const [ticketActivo, setTicketActivo] = useState<number | null>(null);
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [categoria, setCategoria] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [ahora, setAhora] = useState(Date.now());
    const [ocupado, setOcupado] = useState(false);

    const [conExtras, setConExtras] = useState<ProductoMesaInterface | null>(null);
    const [cobro, setCobro] = useState<{ total: number; ticket_id?: number; item_ids?: number[] } | null>(null);
    const [venta, setVenta] = useState<VentaInterface | null>(null);
    const [quitando, setQuitando] = useState<ItemOrdenInterface | null>(null);
    const [ajustando, setAjustando] = useState<ItemOrdenInterface | null>(null);
    // Producto sin enviar al que se le cambian los extras (era deslactosada, no entera)
    const [editandoExtras, setEditandoExtras] = useState<ItemOrdenInterface | null>(null);
    const [anulando, setAnulando] = useState<ComandaInterface | null>(null);
    const [descuento, setDescuento] = useState<DescuentoInterface | null>(null);
    const [pidiendoDescuento, setPidiendoDescuento] = useState(false);
    const [liberando, setLiberando] = useState(false);
    const [trasladando, setTrasladando] = useState<TerminalMapaInterface[] | null>(null);
    const [renombrando, setRenombrando] = useState<{ id: number; nombre: string } | null>(null);
    // Cuenta abierta por error que se va a borrar (se confirma antes)
    const [borrando, setBorrando] = useState<OrdenInterface['tickets'][number] | null>(null);
    const [precuenta, setPrecuenta] = useState<number | null>(null);
    const uuidCobro = useRef(nuevoUuid());

    const cargar = useCallback(async () => {
        try {
            const res = await getTerminal(terminalId);
            setTerminal(res.terminal);
            setOrden(res.orden);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo cargar la mesa'));
        } finally {
            setCargado(true);
        }
    }, [terminalId]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => {
        getCatalogoMesas().then(setCatalogo).catch(e => toast.error(mensajeError(e, 'No se pudo cargar el catálogo')));
        getConfiguracionNegocio().then(setNegocio).catch(() => null);
    }, []);

    // Se refresca solo para ver lo que otro dispositivo agregó o cobró (mientras no hay una ventana abierta)
    const hayVentana = !!(conExtras || editandoExtras || borrando || cobro || venta || quitando || liberando || trasladando || renombrando || ajustando || anulando || pidiendoDescuento);
    useEffect(() => {
        if (hayVentana) return;
        const datos = setInterval(cargar, 15000);
        return () => clearInterval(datos);
    }, [cargar, hayVentana]);
    useEffect(() => {
        const reloj = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(reloj);
    }, []);

    // La cuenta activa: la elegida si sigue abierta; si no, la primera abierta
    const abiertas = orden?.tickets.filter(t => t.estado === 'abierto') ?? [];
    const activo = abiertas.find(t => t.id === ticketActivo) ?? abiertas[0] ?? null;

    // Después de un cobro o un movimiento, la selección solo conserva lo que sigue vigente
    useEffect(() => {
        if (!orden) return;
        const vigentes = new Set(orden.tickets.flatMap(t => t.items).filter(i => !i.pagado && i.estado !== 'cancelado').map(i => i.id));
        setSeleccion(s => s.filter(x => vigentes.has(x)));
    }, [orden]);

    const ejecutar = async <T extends { orden?: OrdenInterface; avisos?: string[] },>(accion: () => Promise<T>, error: string): Promise<T | null> => {
        setOcupado(true);
        try {
            const res = await accion();
            if (res?.orden) setOrden(res.orden);
            // Se agregó, pero no alcanza la existencia: el cobro es el que lo exige
            res?.avisos?.forEach(a => toast(a, { icon: '⚠️', duration: 6000 }));
            return res;
        } catch (e) {
            toast.error(mensajeError(e, error));
            return null;
        } finally {
            setOcupado(false);
        }
    };

    // ── Abrir ──────────────────────────────────────────────────
    const abrir = async () => {
        const res = await ejecutar(() => abrirTerminal(terminalId), 'No se pudo abrir la mesa');
        if (res) setTicketActivo(res.orden.tickets[0]?.id ?? null);
    };

    // ── Productos ─────────────────────────────────────────────
    const productosVisibles = useMemo(() => {
        if (!catalogo) return [];
        const q = sinTildes(busqueda.trim());
        return catalogo.productos.filter(p => q
            ? sinTildes(p.nombre).includes(q) || p.sku?.toLowerCase() === q || p.codigo_barras === q
            : categoria === null || p.categorias.includes(categoria));
    }, [catalogo, busqueda, categoria]);

    const agregar = async (producto: ProductoMesaInterface, extras?: { modificadores: number[]; cantidad: number; notas: string }) => {
        if (!orden) return;
        const res = await ejecutar(() => agregarItems(orden.id, [{
            producto_id: producto.id, cantidad: extras?.cantidad ?? 1, modificadores: extras?.modificadores ?? [], notas: extras?.notas || undefined,
        }], activo?.id), 'No se pudo agregar el producto');
        if (res) toast.success(`${producto.nombre} agregado a ${activo?.nombre ?? 'la cuenta'}`, { duration: 2000 });
    };

    // Sin stock negativo, lo que no hay (o un plato cuyos ingredientes no alcanzan) sale «Agotado»,
    // pero se puede agregar: el servidor avisa y el cobro es el que exige la existencia
    const agotadoMesa = (p: ProductoMesaInterface) => catalogo?.permitir_stock_negativo === false && !p.permite_sin_existencia
        && ((p.disponible !== null && p.disponible <= 0) || (p.alcanza !== null && p.alcanza <= 0));
    const tocarProducto = (p: ProductoMesaInterface) => {
        if (p.grupos.length > 0) setConExtras(p); else agregar(p);
    };

    // ── Envío a cocina ────────────────────────────────────────
    // itemIds: solo los seleccionados (la coca ya, el café después)
    const enviar = async (itemIds?: number[]) => {
        if (!orden) return;
        const res = await ejecutar(() => enviarComanda(orden.id, undefined, itemIds), 'No se pudo enviar');
        if (!res) return;
        if (itemIds) setSeleccion([]);
        toast.success(res.message ?? 'Enviado');
        // Un ticket por área: si la térmica no está o falló, salen desde el navegador
        if (res.impresion.errores.length) toast.error(`No se imprimió: ${[...new Set(res.impresion.errores)].join(' · ')}. Sale por el navegador.`, { duration: 6000 });
        if (res.impresion.sin_impresora || res.impresion.errores.length) imprimirComandasNavegador(res.comandas, false, negocio?.nombre);
    };

    // ── Líneas ────────────────────────────────────────────────
    const quitar = (item: ItemOrdenInterface) => {
        if (item.estado === 'pendiente') {
            ejecutar(() => quitarItem(item.id), 'No se pudo quitar');
        } else {
            setQuitando(item);
        }
    };

    // El aviso CANCELADO sale en la impresora del área; si falla, se avisa pero la cancelación queda
    const avisarImpresion = (impresion: ResultadoImpresion) => {
        if (impresion?.errores.length) toast.error(`No se imprimió el aviso a cocina: ${[...new Set(impresion.errores)].join(' · ')}. Avisa en persona.`, { duration: 6000 });
    };

    const confirmarQuitar = async (motivo: string, cuantos: number) => {
        if (!quitando) return;
        setOcupado(true);
        try {
            const res = await quitarItem(quitando.id, motivo, cuantos < quitando.cantidad ? cuantos : undefined);
            if (res) { setOrden(res.orden); setQuitando(null); toast.success(res.message ?? 'Producto cancelado'); avisarImpresion(res.impresion); }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo cancelar el producto'));
        } finally {
            setOcupado(false);
        }
    };

    const confirmarAnularComanda = async (motivo: string) => {
        if (!anulando) return;
        setOcupado(true);
        try {
            const res = await anularComanda(anulando.id, motivo);
            setOrden(res.orden); setAnulando(null); toast.success(res.message ?? 'Comanda anulada'); avisarImpresion(res.impresion);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular la comanda'));
        } finally {
            setOcupado(false);
        }
    };

    const recetaDe = (productoId: number) => catalogo?.productos.find(p => p.id === productoId)?.receta ?? [];
    const productoDe = (productoId: number) => catalogo?.productos.find(p => p.id === productoId) ?? null;

    const alternar = (idItem: number) => setSeleccion(s => s.includes(idItem) ? s.filter(x => x !== idItem) : [...s, idItem]);

    const itemsTodos = orden?.tickets.flatMap(t => t.items) ?? [];
    const seleccionados = itemsTodos.filter(i => seleccion.includes(i.id));
    const totalSeleccion = Math.round(seleccionados.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
    const entregables = seleccionados.filter(i => ['enviado', 'en_preparacion', 'listo'].includes(i.estado));
    const porEnviarSeleccion = seleccionados.filter(i => i.estado === 'pendiente');

    // ── Cobro ─────────────────────────────────────────────────
    const abrirCobro = (destino: { total: number; ticket_id?: number; item_ids?: number[] }) => {
        if (!actual?.turno) { toast.error('Abre el turno de caja para cobrar'); return; }
        if (destino.total <= 0) { toast.error('No hay nada por cobrar'); return; }
        uuidCobro.current = nuevoUuid();
        setCobro(destino);
    };
    const totalConDescuento = (bruto: number) => Math.round((bruto - montoDescuento(bruto, descuento)) * 100) / 100;

    const cobrar = async (pagos: PagoFormInterface[]) => {
        if (!orden || !cobro || !cajaId) return;
        setOcupado(true);
        try {
            const res = await cobrarOrden(orden.id, {
                uuid: uuidCobro.current, caja_id: cajaId, ticket_id: cobro.ticket_id ?? null, item_ids: cobro.item_ids,
                descuento_global: descuento,
                pagos: pagos.map(p => ({ metodo_pago_id: p.metodo_pago_id, monto: p.monto, referencia: p.referencia })),
            });
            setCobro(null);
            setDescuento(null);
            setSeleccion([]);
            setVenta(res.venta);
            setOrden(res.orden.estado === 'abierta' ? res.orden : null);
            refrescar();
            toast.success(res.message ?? 'Cobrado');
            imprimirConRespaldo(() => imprimirVentaServidor(res.venta.id, { caja_id: cajaId }));
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo cobrar'));
        } finally {
            setOcupado(false);
        }
    };

    // ── Liberar y trasladar ───────────────────────────────────
    const liberar = async (motivo?: string) => {
        if (!orden) return;
        setOcupado(true);
        try {
            const res = await cerrarOrden(orden.id, motivo);
            if (res) { toast.success(res.message); navigate('/pos'); }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo liberar la mesa'));
        } finally {
            setOcupado(false);
            setLiberando(false);
        }
    };

    const pedirLiberar = () => {
        if (!orden) return;
        if (orden.totales.por_cobrar > 0) setLiberando(true);
        else liberar();
    };

    const abrirTraslado = async () => {
        try {
            const mapa = await getMapa();
            setTrasladando(mapa.filter(t => t.tipo !== 'caja' && !t.orden && t.id !== terminalId));
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo cargar el mapa'));
        }
    };

    const trasladar = async (destino: TerminalMapaInterface) => {
        if (!orden) return;
        const res = await ejecutar(() => trasladarOrden(orden.id, destino.id), 'No se pudo trasladar');
        if (res) { setTrasladando(null); toast.success(res.message ?? 'Trasladada'); navigate(`/pos/terminal/${destino.id}`, { replace: true }); }
    };

    const imprimirPrecuenta = (ticketId: number) => {
        setPrecuenta(ticketId);
        setTimeout(() => { window.print(); setPrecuenta(null); }, 100);
    };

    if (!cargado) return <div className="flex min-h-screen items-center justify-center bg-gray-100"><Cargando texto="Cargando mesa..." /></div>;

    // ── Mesa libre ────────────────────────────────────────────
    if (!orden) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
                {venta && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
                        <div className="grid max-h-[95vh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-2xl bg-white shadow-xl md:grid-cols-2">
                            <div className="no-imprimir flex flex-col justify-center gap-3 p-8 text-center">
                                <p className="text-sm font-semibold uppercase text-green-600">Venta {venta.numero} registrada</p>
                                <p className="text-gray-500">Cambio</p>
                                <p className="text-6xl font-bold">{dinero(venta.cambio)}</p>
                                <p className="text-sm text-gray-500">{terminal?.nombre} queda libre</p>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => window.print()} className="rounded-xl bg-gray-100 py-4 font-semibold text-gray-700">Imprimir</button>
                                    <button type="button" onClick={() => navigate('/pos')} autoFocus className="rounded-xl bg-blue-600 py-4 font-bold text-white">Volver al mapa</button>
                                </div>
                            </div>
                            <div className="bg-gray-100 p-4"><TicketVenta venta={venta} negocio={negocio} /></div>
                        </div>
                    </div>
                )}
                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
                    <h1 className="text-2xl font-semibold text-gray-800">{terminal?.nombre}</h1>
                    <p className="mt-1 text-sm text-gray-500">Mesa libre</p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <Link to="/pos" className="rounded-xl bg-gray-100 py-4 font-semibold text-gray-700 hover:bg-gray-200">Volver</Link>
                        <button type="button" onClick={abrir} disabled={ocupado || !enLinea}
                            className="rounded-xl bg-green-600 py-4 font-bold text-white hover:bg-green-700 disabled:opacity-50">
                            Abrir mesa
                        </button>
                    </div>
                    {!enLinea && <p className="mt-3 text-sm text-amber-700">Las mesas necesitan conexión con el servidor.</p>}
                </div>
            </div>
        );
    }

    const ticketPrecuenta = orden.tickets.find(t => t.id === precuenta);
    const lineasActivas = activo?.items ?? [];

    return (
        <div className="flex h-screen flex-col bg-gray-100">
            {ticketPrecuenta && <PrecuentaImprimible orden={orden} ticket={ticketPrecuenta} negocio={negocio} />}

            {/* Barra superior */}
            <header className="no-imprimir flex flex-wrap items-center gap-2 bg-white px-4 py-2 shadow-sm">
                <Link to="/pos" className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">← Mapa</Link>
                <div className="min-w-0">
                    <p className="text-lg font-bold leading-tight text-gray-900">Terminal {orden.terminal.nombre}</p>
                    <p className="text-xs text-gray-500">
                        {orden.numero} · <span className="font-mono">{transcurrido(orden.abierta_at, ahora)}</span> · {orden.usuario}
                    </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <EstadoConexion />
                    {orden.terminal.tipo === 'mesa' && <button type="button" onClick={abrirTraslado} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Cambiar de mesa</button>}
                    <button type="button" onClick={pedirLiberar} disabled={ocupado} className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">Limpiar terminal</button>
                </div>
            </header>

            <div className="no-imprimir flex min-h-0 flex-1 flex-col lg:flex-row">
                {/* Izquierda: pestañas */}
                <main className="flex min-h-0 flex-1 flex-col">
                    <div className="flex gap-1 border-b border-blue-600 px-3 pt-3">
                        {([['productos', 'Productos'], ['cuentas', `Cuentas separadas (${orden.tickets.length})`], ['comandas', `Comandas (${orden.comandas.filter(c => c.estado !== 'cancelada').length})`]] as const).map(([clave, texto]) => (
                            <button key={clave} type="button" onClick={() => setPestana(clave)}
                                className={`rounded-t-xl px-5 py-3 text-sm font-semibold ${pestana === clave ? 'border border-b-0 border-blue-600 bg-white text-blue-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                {texto}
                            </button>
                        ))}
                    </div>

                    {pestana === 'productos' && (
                        <>
                            <div className="flex flex-col gap-2 p-3">
                                <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..."
                                    className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base focus:border-blue-400 focus:outline-none" />
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {[{ id: null as number | null, nombre: 'Todos' }, ...(catalogo?.categorias ?? [])].map(c => (
                                        <button key={c.id ?? 'todas'} type="button" onClick={() => { setCategoria(c.id); setBusqueda(''); }}
                                            className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold ${categoria === c.id && !busqueda ? 'bg-cyan-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                                            {c.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                                {!catalogo && <Cargando texto="Cargando productos..." />}
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                                    {productosVisibles.map(p => (
                                        <button key={p.id} type="button" onClick={() => tocarProducto(p)} disabled={ocupado || !activo}
                                            className={`flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md active:scale-[0.97] disabled:opacity-60 ${agotadoMesa(p) ? 'opacity-50' : ''}`}
                                            style={{ borderTop: `6px solid ${p.color || '#a21caf'}` }}>
                                            <div className="relative h-20 w-full bg-gray-50">
                                                {p.imagen
                                                    ? <img src={STORAGE_URL + p.imagen} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                    : <div className="flex h-full items-center justify-center text-3xl" style={{ color: p.color || '#d946ef' }}>●</div>}
                                                {p.grupos.length > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-blue-700">+ extras</span>}
                                            </div>
                                            <div className="flex flex-1 flex-col justify-between p-2.5">
                                                <p className="line-clamp-2 text-sm font-medium leading-tight text-gray-800">{p.nombre}</p>
                                                <div className="mt-1 flex items-end justify-between gap-1">
                                                    <p className="text-base font-bold text-blue-700">{dinero(p.precio)}</p>
                                                    {p.disponible === null && agotadoMesa(p) && (
                                                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Agotado</span>
                                                    )}
                                                    {/* «Permitir vender sin existencia»: ni cantidad ni «Agotado» (queda en negativo a propósito) */}
                                                    {p.disponible !== null && !p.permite_sin_existencia && (verExistencias || p.disponible <= 0) && (
                                                        <span title={p.disponible !== p.stock ? `Existencia ${cantidad(p.stock)}; el resto está en otras cuentas abiertas` : 'Existencia'}
                                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                                p.disponible <= 0 ? 'bg-red-600 text-white' : p.bajo_minimo ? 'bg-amber-400 text-gray-900' : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {verExistencias ? cantidad(p.disponible, p.permite_fraccion ? p.unidad : null) : 'Agotado'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {pestana === 'cuentas' && (
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {seleccion.length > 0 && (
                                <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm">
                                    <span className="font-semibold text-blue-900">{seleccion.length} seleccionado(s) · {dinero(totalSeleccion)}</span>
                                    {porEnviarSeleccion.length > 0 && (
                                        <button type="button" disabled={ocupado} onClick={() => enviar(porEnviarSeleccion.map(i => i.id))}
                                            className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                                            Enviar solo {porEnviarSeleccion.length === seleccion.length ? 'estos' : `${porEnviarSeleccion.length} sin enviar`}
                                        </button>
                                    )}
                                    <span className="text-blue-800">Mover a:</span>
                                    {abiertas.map(t => (
                                        <button key={t.id} type="button" disabled={ocupado} onClick={() => ejecutar(() => moverItems(orden.id, seleccion, t.id), 'No se pudo mover')}
                                            className="rounded-lg bg-white px-3 py-2 font-medium text-blue-700 hover:bg-blue-100">{t.nombre}</button>
                                    ))}
                                    <button type="button" disabled={ocupado} onClick={async () => {
                                        const r = await ejecutar(() => crearTicket(orden.id), 'No se pudo crear la cuenta');
                                        if (r) await ejecutar(() => moverItems(orden.id, seleccion, r.ticket_id), 'No se pudo mover');
                                    }} className="rounded-lg bg-white px-3 py-2 font-medium text-blue-700 hover:bg-blue-100">+ Cuenta nueva</button>
                                    {seleccionados.length === 1 && seleccionados[0].cantidad > 1 && abiertas.length > 0 && (
                                        <button type="button" disabled={ocupado} onClick={() => {
                                            const otro = abiertas.find(t => t.id !== seleccionados[0].ticket_id);
                                            if (!otro) { toast.error('Crea otra cuenta para separar'); return; }
                                            ejecutar(() => dividirItem(seleccionados[0].id, 1, otro.id), 'No se pudo separar');
                                        }} className="rounded-lg bg-white px-3 py-2 font-medium text-blue-700 hover:bg-blue-100">Separar 1 a otra cuenta</button>
                                    )}
                                    <button type="button" onClick={() => setSeleccion([])} className="ml-auto text-blue-700 hover:underline">Quitar selección</button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                {orden.tickets.map(t => (
                                    <section key={t.id} className={`flex flex-col overflow-hidden rounded-xl border-2 bg-white ${t.estado === 'pagado' ? 'border-emerald-400 opacity-80' : t.id === activo?.id ? 'border-blue-600' : 'border-gray-200'}`}>
                                        <header className={`flex items-center justify-between px-4 py-3 text-white ${t.estado === 'pagado' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                            <button type="button" onClick={() => t.estado === 'abierto' && setRenombrando({ id: t.id, nombre: t.nombre })} className="text-lg font-semibold"
                                                title={t.estado === 'abierto' ? 'Toca para cambiar el nombre' : undefined}>
                                                {t.nombre}{t.estado === 'pagado' ? ' · pagado' : ' ✏️'}
                                            </button>
                                            {t.estado === 'abierto' && t.id !== activo?.id && (
                                                <button type="button" onClick={() => setTicketActivo(t.id)} className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold">Usar</button>
                                            )}
                                        </header>
                                        <ul className="flex-1 divide-y divide-gray-100">
                                            {t.items.length === 0 && <li className="p-4 text-sm text-gray-400">Sin productos</li>}
                                            {t.items.map(i => (
                                                <li key={i.id} className={`flex items-start gap-2 px-3 py-2 ${i.estado === 'cancelado' ? 'opacity-50' : ''}`}>
                                                    {!i.pagado && i.estado !== 'cancelado' && (
                                                        <input type="checkbox" className="mt-1 h-5 w-5" checked={seleccion.includes(i.id)} onChange={() => alternar(i.id)} aria-label={`Seleccionar ${i.descripcion}`} />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-gray-800">{cantidad(i.cantidad)} × {i.descripcion}</p>
                                                        {i.notas && <p className="text-xs italic text-gray-500">{i.notas}</p>}
                                                        <ChipEstado item={i} />
                                                    </div>
                                                    <span className="whitespace-nowrap text-sm font-medium">{dinero(i.subtotal)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <footer className="space-y-2 border-t border-gray-100 bg-gray-50 p-3">
                                            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{dinero(t.total)}</span></div>
                                            {t.estado === 'abierto' && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button type="button" onClick={() => imprimirPrecuenta(t.id)} className="rounded-lg bg-white py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200">Precuenta</button>
                                                    <button type="button" disabled={ocupado || abiertas.length <= 1} onClick={() => setBorrando(t)}
                                                        className="rounded-lg bg-white py-2 text-sm font-medium text-red-600 ring-1 ring-gray-200 disabled:opacity-40">Quitar</button>
                                                    <button type="button" disabled={ocupado || t.por_cobrar <= 0} onClick={() => abrirCobro({ total: t.por_cobrar, ticket_id: t.id })}
                                                        className="rounded-lg bg-green-600 py-2 text-sm font-bold text-white disabled:opacity-40">Cobrar {dinero(t.por_cobrar)}</button>
                                                </div>
                                            )}
                                        </footer>
                                    </section>
                                ))}
                                <button type="button" disabled={ocupado} onClick={async () => {
                                    const r = await ejecutar(() => crearTicket(orden.id), 'No se pudo crear la cuenta');
                                    if (r) setTicketActivo(r.ticket_id);
                                }} className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-white text-blue-700 hover:bg-blue-50">
                                    <span className="text-5xl leading-none">+</span>
                                    <span className="mt-2 font-semibold">Añadir cuenta</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {pestana === 'comandas' && (
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {orden.comandas.length === 0 && <p className="p-6 text-center text-gray-500">Aún no se ha enviado nada a cocina o barra</p>}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                {orden.comandas.map(c => (
                                    <section key={c.id} className={`flex flex-col overflow-hidden rounded-xl border-2 bg-white ${c.estado === 'cancelada' ? 'opacity-50' : ''}`} style={{ borderColor: c.color }}>
                                        <header className="px-4 py-2 text-white" style={{ backgroundColor: c.color }}>
                                            <div className="flex justify-between font-semibold"><span>#{c.numero}</span><span>{c.area ?? 'General'}</span></div>
                                            <div className="flex justify-between text-xs opacity-90">
                                                <span>{fechaHora(c.enviada_at)}</span>
                                                <span className="font-mono">{c.estado === 'entregada' || c.estado === 'cancelada' ? '—' : transcurrido(c.enviada_at, ahora)}</span>
                                            </div>
                                        </header>
                                        <ul className="flex-1 divide-y divide-gray-100">
                                            {c.items.map(i => (
                                                <li key={i.id} className={`px-4 py-2 ${i.cancelado ? 'line-through opacity-50' : ''}`}>
                                                    <p className="text-gray-900">{cantidad(i.cantidad)}  {i.nombre}</p>
                                                    {i.modificadores.map(m => <p key={m} className="pl-4 text-xs text-gray-500">+ {m}</p>)}
                                                    {(i.ajustes ?? []).map(t => <p key={t} className="pl-4 text-xs font-semibold text-red-700">! {t}</p>)}
                                                    {i.notas && <p className="pl-4 text-xs italic text-gray-500">{i.notas}</p>}
                                                </li>
                                            ))}
                                        </ul>
                                        <footer className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2">
                                            <span className="text-sm font-medium text-gray-600">{ESTADOS_COMANDA[c.estado]}</span>
                                            <div className="flex gap-2">
                                                {c.estado !== 'cancelada' && (
                                                    <button type="button" disabled={ocupado} onClick={() => setAnulando(c)}
                                                        className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-gray-200">Anular</button>
                                                )}
                                                {['pendiente', 'en_preparacion', 'terminada'].includes(c.estado) && (
                                                    <button type="button" disabled={ocupado} onClick={async () => {
                                                        try { await entregarComanda(c.id); await cargar(); } catch (e) { toast.error(mensajeError(e, 'No se pudo marcar')); }
                                                    }} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-gray-200">Entregada</button>
                                                )}
                                                <button type="button" onClick={async () => {
                                                    try {
                                                        const r = await imprimirComanda(c.id);
                                                        if (r.impreso) toast.success(r.message); else imprimirComandasNavegador([r.comanda], true, negocio?.nombre);
                                                    } catch (e) { toast.error(mensajeError(e, 'No se pudo imprimir')); }
                                                }} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200" aria-label="Imprimir comanda">🖨</button>
                                            </div>
                                        </footer>
                                    </section>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                {/* Derecha: cuenta activa */}
                <aside className="flex h-[48vh] flex-col border-t border-gray-200 bg-white lg:h-auto lg:w-[400px] lg:border-l lg:border-t-0 xl:w-[440px]">
                    <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-3 py-2">
                        {abiertas.map(t => (
                            <button key={t.id} type="button" onClick={() => setTicketActivo(t.id)}
                                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${t.id === activo?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {t.nombre} · {dinero(t.por_cobrar)}
                            </button>
                        ))}
                        <button type="button" disabled={ocupado} onClick={async () => {
                            const r = await ejecutar(() => crearTicket(orden.id), 'No se pudo crear la cuenta');
                            if (r) setTicketActivo(r.ticket_id);
                        }} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-blue-700" aria-label="Añadir cuenta">+</button>
                        {activo && (
                            <button type="button" onClick={() => setRenombrando({ id: activo.id, nombre: activo.nombre })}
                                className="ml-auto whitespace-nowrap rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                                title={`Cambiar el nombre de ${activo.nombre}`}>✏️ Nombre</button>
                        )}
                        {activo && abiertas.length > 1 && (
                            <button type="button" onClick={() => setBorrando(activo)}
                                className="whitespace-nowrap rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                                title={`Borrar ${activo.nombre} (abierta por error)`}>🗑 Borrar</button>
                        )}
                    </div>

                    <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
                        {!activo && <p className="p-6 text-center text-sm text-gray-500">Todas las cuentas están pagadas. Añade una cuenta para seguir agregando.</p>}
                        {activo && lineasActivas.length === 0 && <p className="p-6 text-center text-sm text-gray-400">Toca un producto para agregarlo a {activo.nombre}</p>}
                        {lineasActivas.map(i => (
                            <div key={i.id} className={`px-3 py-2.5 ${i.estado === 'cancelado' ? 'opacity-50' : ''}`}>
                                <div className="flex items-start gap-2">
                                    {!i.pagado && i.estado !== 'cancelado' && (
                                        <input type="checkbox" className="mt-1 h-5 w-5" checked={seleccion.includes(i.id)} onChange={() => alternar(i.id)} aria-label={`Seleccionar ${i.descripcion}`} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium leading-tight text-gray-800">{i.nombre}</p>
                                        {i.modificadores.length > 0 && <p className="text-xs text-gray-500">{i.modificadores.map(m => `+ ${textoModificador(m)}`).join(' · ')}</p>}
                                        {(i.texto_ajustes ?? []).length > 0 && <p className="text-xs font-semibold text-red-700">{i.texto_ajustes.map(t => `! ${t}`).join(' · ')}</p>}
                                        {i.notas && <p className="text-xs italic text-gray-500">{i.notas}</p>}
                                        {i.estado === 'cancelado' && i.motivo_cancelacion && <p className="text-xs text-red-600">Cancelado: {i.motivo_cancelacion}</p>}
                                        <div className="mt-1 flex items-center gap-2"><ChipEstado item={i} /><span className="text-xs text-gray-400">{i.hora}{i.usuario ? ` · agregó ${i.usuario}` : ''}</span></div>
                                    </div>
                                    <p className="whitespace-nowrap font-semibold">{dinero(i.subtotal)}</p>
                                </div>
                                {!i.pagado && i.estado !== 'cancelado' && (
                                    <div className="mt-2 flex items-center gap-2 pl-7">
                                        {i.estado === 'pendiente'
                                            ? <QtyStepper value={i.cantidad} min={1} onChange={v => ejecutar(() => actualizarItem(i.id, { cantidad: v }), 'No se pudo cambiar la cantidad')} ariaLabel={`Cantidad de ${i.nombre}`} />
                                            : <span className="text-sm text-gray-600">{cantidad(i.cantidad)} × {dinero(i.precio_unitario)}</span>}
                                        {i.estado === 'pendiente' && (productoDe(i.producto_id)?.grupos.length ?? 0) > 0 && (
                                            <button type="button" onClick={() => setEditandoExtras(i)}
                                                className="h-10 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200">Cambiar extras</button>
                                        )}
                                        {i.estado === 'pendiente' && recetaDe(i.producto_id).length > 0 && (
                                            <button type="button" onClick={() => setAjustando(i)}
                                                className="h-10 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200">Ingredientes</button>
                                        )}
                                        <button type="button" onClick={() => quitar(i)} className="ml-auto h-10 w-10 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Quitar ${i.nombre}`}>✕</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 border-t border-gray-200 p-3">
                        {activo && (
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" className="h-5 w-5"
                                    checked={lineasActivas.filter(i => !i.pagado && i.estado !== 'cancelado').every(i => seleccion.includes(i.id)) && lineasActivas.some(i => !i.pagado && i.estado !== 'cancelado')}
                                    onChange={e => {
                                        const ids = lineasActivas.filter(i => !i.pagado && i.estado !== 'cancelado').map(i => i.id);
                                        setSeleccion(s => e.target.checked ? [...new Set([...s, ...ids])] : s.filter(x => !ids.includes(x)));
                                    }} />
                                Seleccionar todos
                            </label>
                        )}
                        <div className="flex items-end justify-between">
                            <span className="text-gray-600">{seleccion.length ? 'Seleccionado' : `Por cobrar ${activo ? `(${activo.nombre})` : ''}`}</span>
                            <span className="text-3xl font-bold">{dinero(seleccion.length ? totalSeleccion : activo?.por_cobrar ?? 0)}</span>
                        </div>
                        {descuento && (
                            <p className="text-right text-sm font-medium text-green-700">
                                Descuento {descuento.tipo === 'porcentaje' ? `${descuento.valor}%` : dinero(descuento.valor)} en el próximo cobro
                                <button type="button" onClick={() => setDescuento(null)} className="ml-2 text-red-600 hover:underline">quitar</button>
                            </p>
                        )}
                        <p className="text-right text-xs text-gray-500">Mesa completa: {dinero(orden.totales.total)} · cobrado {dinero(orden.totales.cobrado)}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {orden.totales.por_enviar > 0 && (
                                <button type="button" onClick={() => enviar()} disabled={ocupado} className="col-span-2 rounded-xl bg-amber-500 py-4 text-lg font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                                    Enviar a cocina ({orden.totales.por_enviar})
                                </button>
                            )}
                            {entregables.length > 0 && (
                                <button type="button" onClick={() => ejecutar(() => entregarItems(orden.id, entregables.map(i => i.id)), 'No se pudo marcar')} disabled={ocupado}
                                    className="col-span-2 rounded-xl bg-emerald-50 py-3 font-semibold text-emerald-800 hover:bg-emerald-100">
                                    Marcar {entregables.length} entregado(s)
                                </button>
                            )}
                            {activo && <button type="button" onClick={() => imprimirPrecuenta(activo.id)} className="rounded-xl bg-gray-100 py-4 font-semibold text-gray-700 hover:bg-gray-200">Precuenta</button>}
                            <button type="button" onClick={() => setPidiendoDescuento(true)} disabled={ocupado}
                                className={`rounded-xl py-4 font-semibold ${descuento ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${activo ? '' : 'col-span-2'}`}>
                                {descuento ? 'Descuento ✓' : 'Descuento'}
                            </button>
                            {abiertas.filter(t => t.por_cobrar > 0).length > 1 && (
                                <button type="button" disabled={ocupado} onClick={() => { setSeleccion([]); abrirCobro({ total: orden.totales.por_cobrar }); }}
                                    className="col-span-2 rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-40">
                                    Cobrar toda la mesa ({abiertas.filter(t => t.por_cobrar > 0).length} cuentas) · {dinero(orden.totales.por_cobrar)}
                                </button>
                            )}
                            <button type="button" disabled={ocupado || (seleccion.length ? totalSeleccion : activo?.por_cobrar ?? 0) <= 0}
                                onClick={() => seleccion.length ? abrirCobro({ total: totalSeleccion, item_ids: seleccion }) : activo && abrirCobro({ total: activo.por_cobrar, ticket_id: activo.id })}
                                className="col-span-2 rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                                Cobrar
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Ventanas */}
            <ModificadoresModal producto={conExtras} grupos={catalogo?.grupos ?? []} onCancel={() => setConExtras(null)}
                onConfirm={d => { const p = conExtras; setConExtras(null); if (p) agregar(p, d); }} />
            <ModificadoresModal producto={editandoExtras ? productoDe(editandoExtras.producto_id) : null} grupos={catalogo?.grupos ?? []}
                inicial={editandoExtras ? { modificadores: idsModificadores(editandoExtras.modificadores), cantidad: editandoExtras.cantidad, notas: editandoExtras.notas ?? '' } : null}
                onCancel={() => setEditandoExtras(null)}
                onConfirm={async d => {
                    if (!editandoExtras) return;
                    const r = await ejecutar(() => actualizarItem(editandoExtras.id, { modificadores: d.modificadores, cantidad: d.cantidad, notas: d.notas || null }), 'No se pudieron cambiar los extras');
                    if (r) { setEditandoExtras(null); toast.success('Extras actualizados'); }
                }} />

            <CobroModal isOpen={!!cobro} total={totalConDescuento(cobro?.total ?? 0)} metodos={catalogos?.metodos_pago ?? []} isLoading={ocupado}
                enLinea={enLinea}
                onCancel={() => setCobro(null)} onConfirm={cobrar} />

            <CancelarItemModal item={quitando} isLoading={ocupado} onClose={() => setQuitando(null)} onConfirm={confirmarQuitar} />

            <MotivoModal isOpen={!!anulando} titulo={`Anular comanda #${anulando?.numero ?? ''} (${anulando?.area ?? 'General'})`}
                descripcion="Se cancela todo lo que tenga sin cobrar, sale un aviso CANCELADO en su área y queda en la auditoría. Pide autorización del administrador."
                textoConfirmar="Anular comanda" isLoading={ocupado} onClose={() => setAnulando(null)} onConfirm={confirmarAnularComanda} />

            <IngredientesModal titulo={ajustando?.nombre ?? null} receta={ajustando ? recetaDe(ajustando.producto_id) : []} actuales={ajustando?.ajustes ?? []}
                isLoading={ocupado} onCancel={() => setAjustando(null)}
                onConfirm={async (ajustes) => {
                    if (!ajustando) return;
                    const r = await ejecutar(() => actualizarItem(ajustando.id, { ajustes }), 'No se pudo guardar');
                    if (r) setAjustando(null);
                }} />

            <DescuentoModal isOpen={pidiendoDescuento} titulo="Descuento del cobro"
                importe={seleccion.length ? totalSeleccion : activo?.por_cobrar ?? orden.totales.por_cobrar}
                actual={descuento} maximoSinAutorizacion={Number(negocio?.descuento_max_sin_autorizacion ?? 10)}
                onCancel={() => setPidiendoDescuento(false)} onConfirm={d => { setDescuento(d); setPidiendoDescuento(false); }} />

            <MotivoModal isOpen={liberando} titulo={`Limpiar ${orden.terminal.nombre}`}
                descripcion={`Quedan ${dinero(orden.totales.por_cobrar)} sin cobrar. Se cancelarán y quedará en auditoría. Requiere autorización.`}
                textoConfirmar="Cancelar y liberar" isLoading={ocupado} onClose={() => setLiberando(false)} onConfirm={m => liberar(m)} />

            {renombrando && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold">Nombre de la cuenta</h2>
                        <input value={renombrando.nombre} onChange={e => setRenombrando(r => r && { ...r, nombre: e.target.value })} maxLength={60} autoFocus
                            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-base focus:border-blue-400 focus:outline-none" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setRenombrando(null)} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm">Cancelar</button>
                            <button type="button" disabled={!renombrando.nombre.trim()} onClick={async () => {
                                const r = await ejecutar(() => renombrarTicket(renombrando.id, renombrando.nombre.trim()), 'No se pudo renombrar');
                                if (r) setRenombrando(null);
                            }} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {borrando && (() => {
                const vivos = borrando.items.filter(i => i.estado !== 'cancelado');
                const enviados = vivos.filter(i => i.estado !== 'pendiente');
                return (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                            <h2 className="text-lg font-semibold">¿Borrar {borrando.nombre}?</h2>
                            {enviados.length > 0 ? (
                                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                    Tiene {enviados.length} producto(s) ya enviados a cocina. Cancélalos (con motivo) o muévelos a otra cuenta antes de borrarla.
                                </p>
                            ) : vivos.length > 0 ? (
                                <p className="text-sm text-gray-600">
                                    También se quitan {vivos.length} producto(s) sin enviar: {vivos.map(i => i.descripcion).join(', ')}. No salió comanda ni se descontó inventario.
                                </p>
                            ) : (
                                <p className="text-sm text-gray-600">La cuenta está vacía.</p>
                            )}
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setBorrando(null)} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm">Cancelar</button>
                                <button type="button" disabled={ocupado || enviados.length > 0} onClick={async () => {
                                    const r = await ejecutar(() => eliminarTicket(borrando.id), 'No se pudo borrar la cuenta');
                                    if (r) { setBorrando(null); toast.success(r.message ?? 'Cuenta borrada'); }
                                }} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50">Borrar cuenta</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {trasladando && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold">Pasar la orden a otra mesa</h2>
                        {trasladando.length === 0 && <p className="text-sm text-gray-500">No hay mesas libres</p>}
                        <div className="grid grid-cols-3 gap-2">
                            {trasladando.map(t => (
                                <button key={t.id} type="button" disabled={ocupado} onClick={() => trasladar(t)}
                                    className="rounded-xl bg-cyan-50 py-4 font-semibold text-cyan-800 hover:bg-cyan-100">{t.nombre}</button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setTrasladando(null)} className="w-full rounded-xl bg-gray-100 py-3 text-sm">Cancelar</button>
                    </div>
                </div>
            )}

            {venta && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
                    <div className="grid max-h-[95vh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-2xl bg-white shadow-xl md:grid-cols-2">
                        <div className="no-imprimir flex flex-col justify-center gap-3 p-8 text-center">
                            <p className="text-sm font-semibold uppercase text-green-600">Venta {venta.numero} registrada</p>
                            <p className="text-gray-500">Cambio</p>
                            <p className="text-6xl font-bold">{dinero(venta.cambio)}</p>
                            <p className="text-sm text-gray-500">Total {dinero(venta.total)}</p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => window.print()} className="rounded-xl bg-gray-100 py-4 font-semibold text-gray-700">Imprimir</button>
                                <button type="button" onClick={() => setVenta(null)} autoFocus className="rounded-xl bg-blue-600 py-4 font-bold text-white">Seguir con la mesa</button>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4"><TicketVenta venta={venta} negocio={negocio} /></div>
                    </div>
                </div>
            )}
        </div>
    );
}
