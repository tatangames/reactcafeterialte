import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import ClienteBuscador from '../../components/clientes/ClienteBuscador';
import QtyStepper from '../../components/form/QtyStepper';
import MotivoModal from '../../components/modal/MotivoModal';
import ModificadoresModal from '../../components/mesas/ModificadoresModal';
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
    abrirTerminal, actualizarItem, actualizarOrden, agregarItems, cerrarOrden, cobrarOrden, crearTicket, dividirItem,
    eliminarTicket, entregarComanda, enviarComanda, entregarItems, getCatalogoMesas, getMapa, getTerminal, imprimirComanda, moverItems,
    quitarItem, renombrarTicket, trasladarOrden,
} from '../../services/mesas';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { imprimirConRespaldo } from '../../utils/imprimir';
import { imprimirComandasNavegador } from '../../utils/imprimirComandas';
import { cantidad, dinero, mensajeError } from '../../utils/formato';
import { ClienteInterface } from '../../types/clientes';
import { ConfiguracionNegocioInterface } from '../../types/interfaces';
import {
    CatalogoMesasInterface, ESTADOS_COMANDA, ESTADOS_ITEM, ItemOrdenInterface, OrdenInterface, ProductoMesaInterface,
    TerminalMapaInterface, transcurrido,
} from '../../types/mesas';
import { PagoFormInterface, VentaInterface } from '../../types/pos';

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
    const [comensales, setComensales] = useState(2);
    const [eligiendoCliente, setEligiendoCliente] = useState(false);
    const [cliente, setCliente] = useState<ClienteInterface | null>(null);
    const [cobro, setCobro] = useState<{ total: number; ticket_id?: number; item_ids?: number[] } | null>(null);
    const [venta, setVenta] = useState<VentaInterface | null>(null);
    const [quitando, setQuitando] = useState<ItemOrdenInterface | null>(null);
    const [liberando, setLiberando] = useState(false);
    const [trasladando, setTrasladando] = useState<TerminalMapaInterface[] | null>(null);
    const [renombrando, setRenombrando] = useState<{ id: number; nombre: string } | null>(null);
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
    const hayVentana = !!(conExtras || cobro || venta || quitando || liberando || trasladando || renombrando || eligiendoCliente);
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

    const ejecutar = async <T extends { orden?: OrdenInterface },>(accion: () => Promise<T>, error: string): Promise<T | null> => {
        setOcupado(true);
        try {
            const res = await accion();
            if (res?.orden) setOrden(res.orden);
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
        const res = await ejecutar(() => abrirTerminal(terminalId, { comensales }), 'No se pudo abrir la mesa');
        if (res) setTicketActivo(res.orden.tickets[0]?.id ?? null);
    };

    // ── Productos ─────────────────────────────────────────────
    const productosVisibles = useMemo(() => {
        if (!catalogo) return [];
        const q = busqueda.trim().toLowerCase();
        return catalogo.productos.filter(p => q
            ? p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase() === q || p.codigo_barras === q
            : categoria === null || p.categorias.includes(categoria));
    }, [catalogo, busqueda, categoria]);

    const agregar = async (producto: ProductoMesaInterface, extras?: { modificadores: number[]; cantidad: number; notas: string }) => {
        if (!orden) return;
        const res = await ejecutar(() => agregarItems(orden.id, [{
            producto_id: producto.id, cantidad: extras?.cantidad ?? 1, modificadores: extras?.modificadores ?? [], notas: extras?.notas || undefined,
        }], activo?.id), 'No se pudo agregar el producto');
        if (res) toast.success(`${producto.nombre} agregado a ${activo?.nombre ?? 'la cuenta'}`, { duration: 1200 });
    };

    const tocarProducto = (p: ProductoMesaInterface) => (p.grupos.length > 0 ? setConExtras(p) : agregar(p));

    // ── Envío a cocina ────────────────────────────────────────
    const enviar = async () => {
        if (!orden) return;
        const res = await ejecutar(() => enviarComanda(orden.id), 'No se pudo enviar');
        if (!res) return;
        toast.success(res.message ?? 'Enviado');
        // Un ticket por área: si la térmica no está o falló, salen desde el navegador
        if (res.impresion.errores.length) toast.error(`No se imprimió: ${[...new Set(res.impresion.errores)].join(' · ')}. Sale por el navegador.`, { duration: 6000 });
        if (res.impresion.sin_impresora || res.impresion.errores.length) imprimirComandasNavegador(res.comandas);
    };

    // ── Líneas ────────────────────────────────────────────────
    const quitar = (item: ItemOrdenInterface) => {
        if (item.estado === 'pendiente') {
            ejecutar(() => quitarItem(item.id), 'No se pudo quitar');
        } else {
            setQuitando(item);
        }
    };

    const confirmarQuitar = async (motivo: string) => {
        if (!quitando) return;
        setOcupado(true);
        try {
            const res = await quitarItem(quitando.id, motivo);
            if (res) { setOrden(res.orden); setQuitando(null); toast.success('Producto cancelado'); }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo cancelar el producto'));
        } finally {
            setOcupado(false);
        }
    };

    const alternar = (idItem: number) => setSeleccion(s => s.includes(idItem) ? s.filter(x => x !== idItem) : [...s, idItem]);

    const itemsTodos = orden?.tickets.flatMap(t => t.items) ?? [];
    const seleccionados = itemsTodos.filter(i => seleccion.includes(i.id));
    const totalSeleccion = Math.round(seleccionados.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
    const entregables = seleccionados.filter(i => ['enviado', 'en_preparacion', 'listo'].includes(i.estado));

    // ── Cobro ─────────────────────────────────────────────────
    const abrirCobro = (destino: { total: number; ticket_id?: number; item_ids?: number[] }) => {
        if (!actual?.turno) { toast.error('Abre el turno de caja para cobrar'); return; }
        if (destino.total <= 0) { toast.error('No hay nada por cobrar'); return; }
        uuidCobro.current = nuevoUuid();
        setCobro(destino);
    };

    const cobrar = async (pagos: PagoFormInterface[]) => {
        if (!orden || !cobro || !cajaId) return;
        setOcupado(true);
        try {
            const res = await cobrarOrden(orden.id, {
                uuid: uuidCobro.current, caja_id: cajaId, ticket_id: cobro.ticket_id ?? null, item_ids: cobro.item_ids,
                cliente_id: cliente?.id ?? orden.cliente?.id ?? null,
                pagos: pagos.map(p => ({ metodo_pago_id: p.metodo_pago_id, monto: p.monto, referencia: p.referencia })),
            });
            setCobro(null);
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

    // ── Cliente, liberar y trasladar ──────────────────────────
    const elegirCliente = async (c: ClienteInterface) => {
        if (!orden) return;
        setEligiendoCliente(false);
        setCliente(c);
        await ejecutar(() => actualizarOrden(orden.id, { cliente_id: c.id }), 'No se pudo asignar el cliente');
    };

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

    if (!cargado) return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-500">Cargando...</div>;

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
                    <p className="mt-1 text-sm text-gray-500">{terminal?.tipo === 'llevar' ? 'Sin órdenes para llevar en curso' : 'Mesa libre'}</p>
                    {terminal?.tipo === 'mesa' && (
                        <div className="mt-6">
                            <p className="mb-2 text-sm font-medium text-gray-700">¿Cuántas personas?</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                    <button key={n} type="button" onClick={() => setComensales(n)}
                                        className={`h-12 rounded-xl text-lg font-semibold ${comensales === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{n}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <Link to="/pos" className="rounded-xl bg-gray-100 py-4 font-semibold text-gray-700 hover:bg-gray-200">Volver</Link>
                        <button type="button" onClick={abrir} disabled={ocupado || !enLinea}
                            className="rounded-xl bg-green-600 py-4 font-bold text-white hover:bg-green-700 disabled:opacity-50">
                            {terminal?.tipo === 'llevar' ? 'Nueva orden' : 'Abrir mesa'}
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
                        {orden.numero} · {orden.comensales ? `${orden.comensales} persona(s) · ` : ''}<span className="font-mono">{transcurrido(orden.abierta_at, ahora)}</span> · {orden.usuario}
                    </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <EstadoConexion />
                    <button type="button" onClick={() => setEligiendoCliente(true)} className="max-w-[220px] truncate rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                        👤 {orden.cliente?.nombre ?? 'Consumidor final'}
                    </button>
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
                                {!catalogo && <p className="p-6 text-center text-gray-500">Cargando productos...</p>}
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                                    {productosVisibles.map(p => (
                                        <button key={p.id} type="button" onClick={() => tocarProducto(p)} disabled={ocupado || !activo}
                                            className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md active:scale-[0.97] disabled:opacity-60"
                                            style={{ borderTop: `6px solid ${p.color || '#a21caf'}` }}>
                                            <div className="relative h-20 w-full bg-gray-50">
                                                {p.imagen
                                                    ? <img src={STORAGE_URL + p.imagen} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                    : <div className="flex h-full items-center justify-center text-3xl" style={{ color: p.color || '#d946ef' }}>●</div>}
                                                {p.grupos.length > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-blue-700">+ extras</span>}
                                            </div>
                                            <div className="flex flex-1 flex-col justify-between p-2.5">
                                                <p className="line-clamp-2 text-sm font-medium leading-tight text-gray-800">{p.nombre}</p>
                                                <p className="mt-1 text-base font-bold text-blue-700">{dinero(p.precio)}</p>
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
                                            <button type="button" onClick={() => t.estado === 'abierto' && setRenombrando({ id: t.id, nombre: t.nombre })} className="text-lg font-semibold">
                                                {t.nombre}{t.estado === 'pagado' ? ' · pagado' : ''}
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
                                                    <button type="button" disabled={ocupado || t.items.length > 0} onClick={() => ejecutar(() => eliminarTicket(t.id), 'No se pudo quitar la cuenta')}
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
                                                <span>{c.enviada_at.slice(0, 16).split(' ').map((p, n) => n === 0 ? p.split('-').reverse().join('/') : p).join(' ')}</span>
                                                <span className="font-mono">{c.estado === 'entregada' || c.estado === 'cancelada' ? '—' : transcurrido(c.enviada_at, ahora)}</span>
                                            </div>
                                        </header>
                                        <ul className="flex-1 divide-y divide-gray-100">
                                            {c.items.map(i => (
                                                <li key={i.id} className={`px-4 py-2 ${i.cancelado ? 'line-through opacity-50' : ''}`}>
                                                    <p className="text-gray-900">{cantidad(i.cantidad)}  {i.nombre}</p>
                                                    {i.modificadores.map(m => <p key={m} className="pl-4 text-xs text-gray-500">+ {m}</p>)}
                                                    {i.notas && <p className="pl-4 text-xs italic text-gray-500">{i.notas}</p>}
                                                </li>
                                            ))}
                                        </ul>
                                        <footer className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2">
                                            <span className="text-sm font-medium text-gray-600">{ESTADOS_COMANDA[c.estado]}</span>
                                            <div className="flex gap-2">
                                                {['pendiente', 'en_preparacion', 'terminada'].includes(c.estado) && (
                                                    <button type="button" disabled={ocupado} onClick={async () => {
                                                        try { await entregarComanda(c.id); await cargar(); } catch (e) { toast.error(mensajeError(e, 'No se pudo marcar')); }
                                                    }} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-gray-200">Entregada</button>
                                                )}
                                                <button type="button" onClick={async () => {
                                                    try {
                                                        const r = await imprimirComanda(c.id);
                                                        if (r.impreso) toast.success(r.message); else imprimirComandasNavegador([r.comanda], true);
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
                                        {i.modificadores.length > 0 && <p className="text-xs text-gray-500">{i.modificadores.map(m => `+ ${m.opcion}`).join(' · ')}</p>}
                                        {i.notas && <p className="text-xs italic text-gray-500">{i.notas}</p>}
                                        <div className="mt-1 flex items-center gap-2"><ChipEstado item={i} /><span className="text-xs text-gray-400">{i.hora}</span></div>
                                    </div>
                                    <p className="whitespace-nowrap font-semibold">{dinero(i.subtotal)}</p>
                                </div>
                                {!i.pagado && i.estado !== 'cancelado' && (
                                    <div className="mt-2 flex items-center gap-2 pl-7">
                                        {i.estado === 'pendiente'
                                            ? <QtyStepper value={i.cantidad} min={1} onChange={v => ejecutar(() => actualizarItem(i.id, { cantidad: v }), 'No se pudo cambiar la cantidad')} ariaLabel={`Cantidad de ${i.nombre}`} />
                                            : <span className="text-sm text-gray-600">{cantidad(i.cantidad)} × {dinero(i.precio_unitario)}</span>}
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
                        <p className="text-right text-xs text-gray-500">Mesa completa: {dinero(orden.totales.total)} · cobrado {dinero(orden.totales.cobrado)}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {orden.totales.por_enviar > 0 && (
                                <button type="button" onClick={enviar} disabled={ocupado} className="col-span-2 rounded-xl bg-amber-500 py-4 text-lg font-bold text-white hover:bg-amber-600 disabled:opacity-50">
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
                            <button type="button" disabled={ocupado || (seleccion.length ? totalSeleccion : activo?.por_cobrar ?? 0) <= 0}
                                onClick={() => seleccion.length ? abrirCobro({ total: totalSeleccion, item_ids: seleccion }) : activo && abrirCobro({ total: activo.por_cobrar, ticket_id: activo.id })}
                                className={`rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-40 ${activo ? '' : 'col-span-2'}`}>
                                Cobrar
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Ventanas */}
            <ModificadoresModal producto={conExtras} grupos={catalogo?.grupos ?? []} onCancel={() => setConExtras(null)}
                onConfirm={d => { const p = conExtras; setConExtras(null); if (p) agregar(p, d); }} />

            <CobroModal isOpen={!!cobro} total={cobro?.total ?? 0} metodos={catalogos?.metodos_pago ?? []} isLoading={ocupado}
                cliente={cliente && cliente.id === orden.cliente?.id ? cliente : null} enLinea={enLinea}
                onCancel={() => setCobro(null)} onConfirm={cobrar} />

            <MotivoModal isOpen={!!quitando} titulo={`Cancelar ${quitando?.descripcion ?? ''}`}
                descripcion="Ya se envió a preparar: queda cancelado en la comanda y en la auditoría. Requiere autorización."
                textoConfirmar="Cancelar producto" isLoading={ocupado} onClose={() => setQuitando(null)} onConfirm={confirmarQuitar} />

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

            {eligiendoCliente && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Cliente de la mesa</h2>
                            <button type="button" onClick={() => setEligiendoCliente(false)} className="h-10 w-10 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">✕</button>
                        </div>
                        <ClienteBuscador autoFocus onSelect={elegirCliente} />
                    </div>
                </div>
            )}

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
