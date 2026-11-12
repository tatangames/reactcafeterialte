import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import CarritoPanel from '../../components/pos/CarritoPanel';
import CantidadModal from '../../components/pos/CantidadModal';
import CobroModal from '../../components/pos/CobroModal';
import ClienteBuscador from '../../components/clientes/ClienteBuscador';
import EstadoConexion from '../../components/pos/EstadoConexion';
import DescuentoModal from '../../components/pos/DescuentoModal';
import PrecuentasModal from '../../components/pos/PrecuentasModal';
import PedidosMostradorModal from '../../components/pos/PedidosMostradorModal';
import ModificadoresModal from '../../components/mesas/ModificadoresModal';
import IngredientesModal from '../../components/mesas/IngredientesModal';
import TicketVenta from '../../components/pos/TicketVenta';
import { getCliente, getPedidoEspecial } from '../../services/clientes';
import { mensajeError } from '../../utils/formato';
import { useAuth } from '../../context/AuthContext';
import { usePosHook } from '../../hooks/pos/usePosHook';
import { STORAGE_URL } from '../../services/api';
import { LineaCarritoInterface, ProductoPosInterface } from '../../types/pos';
import { cantidad, dinero } from '../../utils/formato';
import { claveDe, precioDe } from '../../utils/carrito';
import Cargando from '../../components/ui/loading/Cargando';

function TarjetaProducto({ producto, bloqueado, verExistencia, onClick }: { producto: ProductoPosInterface; bloqueado: boolean; verExistencia: boolean; onClick: () => void }) {
    // bloqueado: sin stock negativo, no hay existencia o no alcanzan los ingredientes de su receta.
    // Con «Permitir vender sin existencia» (del negocio o del producto) no sale «Agotado» aunque marque 0
    const agotado = bloqueado;
    return (
        <button type="button" onClick={onClick}
            className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md active:scale-[0.97] ${bloqueado ? 'opacity-50' : ''}`}
            style={{ borderTop: `6px solid ${producto.color || '#E5E7EB'}` }}>
            <div className="relative h-24 w-full bg-gray-50">
                {producto.imagen
                    ? <img src={STORAGE_URL + producto.imagen} alt="" className="h-full w-full object-cover" loading="lazy" />
                    : <div className="flex h-full items-center justify-center text-3xl" style={{ color: producto.color || '#D1D5DB' }}>●</div>}
                {/* Sin el permiso pos.ver_existencias solo se avisa lo agotado, no la cantidad */}
                {((producto.controla_stock && verExistencia) || agotado) && (
                    <span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        agotado ? 'bg-red-600 text-white' : producto.bajo_minimo ? 'bg-amber-400 text-gray-900' : 'bg-white/90 text-gray-700'
                    }`}>
                        {agotado ? 'Agotado' : cantidad(producto.stock, producto.permite_fraccion ? producto.unidad : null)}
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col justify-between p-2.5">
                <p className="text-sm font-medium leading-tight text-gray-800 line-clamp-2">{producto.nombre}</p>
                <p className="mt-1 text-base font-bold text-blue-700">
                    {producto.consumo_interno ? <span className="text-xs font-semibold text-blue-700">Consumo interno</span> : dinero(producto.precio)}{(producto.grupos?.length ?? 0) > 0 ? <span className="text-xs font-normal text-gray-500"> +</span> : null}{producto.permite_fraccion && producto.unidad ? <span className="text-xs font-normal text-gray-500"> /{producto.unidad}</span> : null}
                </p>
            </div>
        </button>
    );
}

export default function PosPage() {
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const pos = usePosHook();

    const [cantidadDe, setCantidadDe] = useState<{ producto: ProductoPosInterface; inicial?: number; clave?: string } | null>(null);
    const [descuentoDe, setDescuentoDe] = useState<LineaCarritoInterface | 'global' | null>(null);
    const [precuentasAbiertas, setPrecuentasAbiertas] = useState(false);
    const [eligiendoCliente, setEligiendoCliente] = useState(false);
    const [nombrePrecuenta, setNombrePrecuenta] = useState<string | null>(null);
    // Extras al tocar el producto (o al editar una línea del carrito) e ingredientes de una línea
    const [extrasDe, setExtrasDe] = useState<{ producto: ProductoPosInterface; linea?: LineaCarritoInterface } | null>(null);
    const [ingredientesDe, setIngredientesDe] = useState<LineaCarritoInterface | null>(null);
    // Enviar comanda sin cobrar: nombre del cliente y la lista «Por cobrar»
    const [nombreComanda, setNombreComanda] = useState<string | null>(null);
    const [verPedidos, setVerPedidos] = useState(false);
    const busquedaRef = useRef<HTMLInputElement>(null);
    const [params, setParams] = useSearchParams();
    const pedidoParam = params.get('pedido');

    // /pos?pedido=ID: entregar un pedido especial (viene de la pantalla de pedidos)
    useEffect(() => {
        if (!pedidoParam || !pos.catalogo) return;
        setParams({}, { replace: true });
        (async () => {
            try {
                const pedido = await getPedidoEspecial(Number(pedidoParam));
                if (pedido.estado !== 'abierto') {
                    toast.error(`El pedido ${pedido.numero} ya fue entregado o cancelado`);
                    return;
                }
                const cliente = pedido.cliente_id ? (await getCliente(pedido.cliente_id)).cliente : null;
                pos.abrirPedidoEspecial(pedido, cliente);
            } catch (e) {
                toast.error(mensajeError(e, 'No se pudo abrir el pedido'));
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pedidoParam, pos.catalogo]);

    // El lector de códigos escribe donde esté el foco: se mantiene en la búsqueda
    useEffect(() => {
        if (!pos.cobrando && !cantidadDe && !descuentoDe && !pos.ventaRealizada && !extrasDe && !ingredientesDe
            && nombreComanda === null && !verPedidos) busquedaRef.current?.focus();
    }, [pos.cobrando, cantidadDe, descuentoDe, pos.ventaRealizada, extrasDe, ingredientesDe, nombreComanda, verPedidos]);

    // Con extras (Leche, Endulzante) primero se eligen; por peso se pide la cantidad; si no, se suma 1
    const tocarProducto = (p: ProductoPosInterface) => {
        if (pos.agotado(p)) { toast.error(`No hay existencia de ${p.nombre}`); return; }
        if (p.grupos?.length) setExtrasDe({ producto: p });
        else if (p.permite_fraccion) setCantidadDe({ producto: p });
        else pos.agregar(p);
    };

    const enviarComanda = () => {
        if (pos.agregandoA) pos.enviarPedido();
        else setNombreComanda('');
    };

    const maxDescuento = Number(pos.negocio?.descuento_max_sin_autorizacion ?? 10);
    const lineaDescuento = descuentoDe && descuentoDe !== 'global' ? descuentoDe : null;
    const importeLinea = lineaDescuento ? Math.round(precioDe(lineaDescuento) * lineaDescuento.cantidad * 100) / 100 : 0;

    // ── Sin turno abierto: no se puede vender ───────────────────
    if (!pos.esperandoCaja && !pos.turno) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
                <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
                    <p className="text-5xl">🔒</p>
                    <h1 className="mt-4 text-xl font-semibold text-gray-800">No hay turno de caja abierto</h1>
                    <p className="mt-2 text-sm text-gray-500">Para vender, abre el turno de esta caja con su fondo inicial.</p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Link to="/dashboard" className="px-5 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Volver</Link>
                        <Link to="/caja" className="px-5 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl">Ir a caja</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-gray-100">

            {/* Barra superior */}
            <header className="flex items-center gap-3 bg-white px-4 py-2 shadow-sm">
                <button type="button" onClick={() => navigate('/dashboard')} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100" title="Volver al panel">
                    <img src="/images/logo/logoeci.png" alt="" className="h-9 w-9" />
                    <span className="hidden md:inline font-semibold text-gray-800">{pos.negocio?.nombre ?? 'Panadería Eduardo'}</span>
                </button>
                <div className="ml-2 hidden sm:block text-xs text-gray-500">
                    {pos.turno?.caja} · Turno #{pos.turno?.id} · {user?.nombre}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <EstadoConexion />
                    <Link to="/pos" className="px-4 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl">Mesas</Link>
                    <button type="button" onClick={() => { pos.cargarPedidos(); setVerPedidos(true); }} disabled={!pos.enLinea}
                        title={pos.enLinea ? 'Pedidos con la comanda enviada que falta cobrar' : 'Necesita conexión con el servidor'}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-40 ${pos.pedidos.length ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}>
                        Por cobrar ({pos.pedidos.length})
                    </button>
                    {hasPermission('pos.precuentas') && (
                        <button type="button" onClick={() => setPrecuentasAbiertas(true)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">
                            Precuentas
                        </button>
                    )}
                    {(hasPermission('pos.historial') || hasPermission('pos.vender')) && (
                        <Link to={`/ventas?turno=${pos.turno?.id ?? ''}`} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">
                            Ventas
                        </Link>
                    )}
                    <Link to="/caja" className="hidden sm:inline-block px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Caja</Link>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                {/* Catálogo */}
                <main className="flex min-h-0 flex-1 flex-col">
                    <div className="flex flex-col gap-2 p-3">
                        <input
                            ref={busquedaRef}
                            type="search"
                            value={pos.busqueda}
                            onChange={(e) => pos.setBusqueda(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pos.buscarYAgregar(); } }}
                            placeholder="Buscar producto o escanear código..."
                            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base focus:border-blue-400 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-2 pb-1">
                            {[{ id: null as number | null, nombre: 'Todos' }, ...(pos.catalogo?.categorias ?? [])].map((c) => (
                                <button key={c.id ?? 'todos'} type="button" onClick={() => { pos.setCategoria(c.id); pos.setBusqueda(''); }}
                                    className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold transition ${
                                        pos.categoria === c.id && !pos.busqueda ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}>
                                    {c.nombre}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                        {pos.cargando && <Cargando texto="Cargando productos..." />}
                        {!pos.cargando && pos.productosVisibles.length === 0 && (
                            <p className="p-6 text-center text-gray-500">No hay productos {pos.busqueda ? 'con esa búsqueda' : 'en esta categoría'}</p>
                        )}
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                            {pos.productosVisibles.map((p) => (
                                <TarjetaProducto key={p.id} producto={p} bloqueado={pos.agotado(p)} verExistencia={hasPermission('pos.ver_existencias')} onClick={() => tocarProducto(p)} />
                            ))}
                        </div>
                    </div>
                </main>

                {/* Carrito */}
                <aside className="h-[45vh] lg:h-auto lg:w-[380px] xl:w-[420px] border-t lg:border-t-0 lg:border-l border-gray-200">
                    <CarritoPanel
                        lineas={pos.carrito.lineas}
                        totales={pos.totales}
                        precuenta={pos.carrito.precuenta}
                        cliente={pos.carrito.cliente}
                        onElegirCliente={() => setEligiendoCliente(true)}
                        onQuitarCliente={() => pos.asignarCliente(null)}
                        tieneDescuentoGlobal={!!pos.carrito.descuentoGlobal}
                        puedeDescontar={hasPermission('pos.descuento') || hasPermission('pos.descuento.autorizar')}
                        puedePrecuentas={hasPermission('pos.precuentas')}
                        onCantidad={pos.cambiarCantidad}
                        onEditarCantidad={(l) => setCantidadDe({ producto: l.producto, inicial: l.cantidad, clave: claveDe(l) })}
                        onEditarLinea={(l) => setExtrasDe({ producto: l.producto, linea: l })}
                        onIngredientes={(l) => setIngredientesDe(l)}
                        agregandoA={pos.agregandoA?.nombre ?? null}
                        onEnviarComanda={enviarComanda}
                        onNoAgregar={() => pos.setAgregandoA(null)}
                        onDescuentoLinea={(l) => setDescuentoDe(l)}
                        onDescuentoGlobal={() => setDescuentoDe('global')}
                        onGuardarPrecuenta={() => setNombrePrecuenta(pos.carrito.precuenta?.nombre ?? '')}
                        onVaciar={pos.vaciar}
                        onCobrar={() => pos.setCobrando(true)}
                    />
                </aside>
            </div>

            {/* Ventanas */}
            <CantidadModal
                producto={cantidadDe?.producto ?? null}
                cantidadInicial={cantidadDe?.inicial}
                onCancel={() => setCantidadDe(null)}
                onConfirm={(c) => {
                    if (!cantidadDe) return;
                    if (cantidadDe.inicial !== undefined) pos.cambiarCantidad(cantidadDe.clave ?? `p${cantidadDe.producto.id}`, c);
                    else pos.agregar(cantidadDe.producto, c);
                    setCantidadDe(null);
                }}
            />

            <DescuentoModal
                isOpen={!!descuentoDe}
                titulo={descuentoDe === 'global' ? 'Descuento general' : `Descuento: ${lineaDescuento?.producto.nombre ?? ''}`}
                importe={descuentoDe === 'global' ? pos.totales.subtotal : importeLinea}
                actual={descuentoDe === 'global' ? pos.carrito.descuentoGlobal : lineaDescuento?.descuento ?? null}
                maximoSinAutorizacion={maxDescuento}
                onCancel={() => setDescuentoDe(null)}
                onConfirm={(d) => {
                    if (descuentoDe === 'global') pos.descuentoGlobal(d);
                    else if (lineaDescuento) pos.descuentoLinea(claveDe(lineaDescuento), d);
                    setDescuentoDe(null);
                }}
            />

            {eligiendoCliente && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setEligiendoCliente(false)}>
                    <div className="w-full max-w-lg space-y-3 rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">Cliente de la venta</h2>
                                <p className="text-sm text-gray-500">Para venderle al crédito o sacar el ticket a su nombre. Si tiene límite de crédito, al cobrar aparece «Crédito».</p>
                            </div>
                            <button type="button" onClick={() => setEligiendoCliente(false)} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100" aria-label="Cerrar">✕</button>
                        </div>
                        <ClienteBuscador autoFocus onSelect={(c) => { pos.asignarCliente(c); setEligiendoCliente(false); }} />
                    </div>
                </div>
            )}
            <CobroModal
                isOpen={pos.cobrando}
                total={pos.porCobrar}
                anticipo={pos.anticipo}
                cliente={pos.carrito.cliente}
                enLinea={pos.enLinea}
                metodos={pos.metodosPago}
                isLoading={pos.guardando}
                onCancel={() => pos.setCobrando(false)}
                onAnular={() => { pos.setCobrando(false); pos.vaciar(); }}
                onConfirm={pos.cobrar}
            />

            <ModificadoresModal
                producto={extrasDe ? { ...extrasDe.producto, grupos: extrasDe.producto.grupos ?? [] } : null}
                grupos={pos.catalogo?.grupos ?? []}
                inicial={extrasDe?.linea ? { modificadores: extrasDe.linea.modificadores ?? [], cantidad: extrasDe.linea.cantidad, notas: extrasDe.linea.notas } : null}
                onCancel={() => setExtrasDe(null)}
                onConfirm={(d) => {
                    if (!extrasDe) return;
                    const ok = extrasDe.linea
                        ? pos.editarLinea(claveDe(extrasDe.linea), d)
                        : pos.agregar(extrasDe.producto, d.cantidad, { modificadores: d.modificadores, notas: d.notas });
                    if (ok) setExtrasDe(null);
                }}
            />

            <IngredientesModal
                titulo={ingredientesDe?.producto.nombre ?? null}
                receta={ingredientesDe?.producto.receta ?? []}
                actuales={ingredientesDe?.ajustes ?? []}
                onCancel={() => setIngredientesDe(null)}
                onConfirm={(ajustes) => { if (ingredientesDe) pos.ajustarLinea(claveDe(ingredientesDe), ajustes); setIngredientesDe(null); }}
            />

            {nombreComanda !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold">Enviar comanda</h2>
                            <p className="text-sm text-gray-500">Sale a cocina o barra ahora; se cobra cuando el cliente recoja.</p>
                        </div>
                        <input type="text" value={nombreComanda} onChange={(e) => setNombreComanda(e.target.value)} maxLength={60} autoFocus
                            onKeyDown={async (e) => { if (e.key === 'Enter' && nombreComanda.trim() && await pos.enviarPedido(nombreComanda)) setNombreComanda(null); }}
                            placeholder="¿A nombre de quién? (Juan, señora de rojo, #3)"
                            className="w-full h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-blue-400 focus:outline-none" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setNombreComanda(null)} className="flex-1 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl">Cancelar</button>
                            <button type="button" disabled={!nombreComanda.trim() || pos.guardando}
                                onClick={async () => { if (await pos.enviarPedido(nombreComanda)) setNombreComanda(null); }}
                                className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                                Enviar {dinero(pos.totales.total)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PedidosMostradorModal isOpen={verPedidos} cajaId={pos.cajaId} pedidos={pos.pedidos} metodos={pos.metodosPago}
                onClose={() => setVerPedidos(false)} onCambio={pos.cargarPedidos}
                onCobrado={(v) => { setVerPedidos(false); pos.pedidoCobrado(v); }}
                onAgregarA={(p) => { setVerPedidos(false); pos.setAgregandoA(p); }} />

            <PrecuentasModal isOpen={precuentasAbiertas} onClose={() => setPrecuentasAbiertas(false)} onAbrir={pos.abrirPrecuenta} />

            {nombrePrecuenta !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
                        <h2 className="text-lg font-semibold">Dejar en espera</h2>
                        <input type="text" value={nombrePrecuenta} onChange={(e) => setNombrePrecuenta(e.target.value)} maxLength={100} autoFocus
                            placeholder="Nombre del cliente o mesa"
                            className="w-full h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-blue-400 focus:outline-none" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setNombrePrecuenta(null)} className="flex-1 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl">Cancelar</button>
                            <button type="button" disabled={!nombrePrecuenta.trim() || pos.guardando}
                                onClick={async () => { if (await pos.guardarComoPrecuenta(nombrePrecuenta.trim())) setNombrePrecuenta(null); }}
                                className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Venta realizada: cambio y ticket */}
            {pos.ventaRealizada && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[95vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2">
                        <div className="no-imprimir flex flex-col justify-center gap-4 p-8 text-center">
                            {pos.ventaRealizada.pendiente ? (
                                <p className="text-sm font-semibold uppercase text-amber-600">Venta {pos.ventaRealizada.numero} guardada sin conexión</p>
                            ) : (
                                <p className="text-sm font-semibold uppercase text-green-600">Venta {pos.ventaRealizada.numero} registrada</p>
                            )}
                            <p className="text-gray-500">Cambio</p>
                            <p className="text-6xl font-bold text-gray-900">{dinero(pos.ventaRealizada.cambio)}</p>
                            <p className="text-sm text-gray-500">Total {dinero(pos.ventaRealizada.total)}</p>
                            {pos.ventaRealizada.credito && (
                                <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                                    {dinero(pos.ventaRealizada.credito.monto)} al crédito de {pos.ventaRealizada.cliente?.nombre}: imprime el ticket para la firma del cliente
                                </p>
                            )}

                            {/* Estado de la impresora térmica */}
                            {pos.impresion.estado === 'imprimiendo' && <p className="text-sm text-gray-500">Imprimiendo ticket…</p>}
                            {pos.impresion.estado === 'ok' && pos.impresion.mensaje && <p className="text-sm text-green-700">✓ Ticket impreso</p>}
                            {pos.impresion.estado === 'error' && (
                                <div className="rounded-xl bg-amber-50 p-3 text-left text-sm text-amber-800">
                                    <p className="font-medium">No se imprimió el ticket</p>
                                    <p className="text-xs">{pos.impresion.mensaje}</p>
                                    <div className="mt-2 flex gap-2">
                                        {pos.impresion.trabajoId && (
                                            <button type="button" onClick={() => pos.imprimirTicket(pos.ventaRealizada!.id, 'reintento')}
                                                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">Reintentar</button>
                                        )}
                                        <button type="button" onClick={() => window.print()}
                                            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">Imprimir desde el navegador</button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button type="button"
                                    // Sin conexión la térmica no recibe nada: se usa la impresión del navegador
                                    onClick={() => pos.ventaRealizada!.pendiente ? window.print() : pos.imprimirTicket(pos.ventaRealizada!.id, 'copia')}
                                    disabled={pos.impresion.estado === 'imprimiendo'}
                                    className="py-4 rounded-xl bg-gray-100 text-base font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                                    Imprimir otra vez
                                </button>
                                <button type="button" onClick={() => pos.setVentaRealizada(null)} autoFocus
                                    className="py-4 rounded-xl bg-blue-600 text-base font-bold text-white hover:bg-blue-700">
                                    Nueva venta
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4">
                            <TicketVenta venta={pos.ventaRealizada} negocio={pos.negocio} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
