import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { useConexion } from '../../context/ConexionContext';
import { esErrorDeRed } from '../../services/sync';
import { guardarCache, leerCache } from '../../utils/offlineDb';
import { construirVentaOffline } from '../../utils/ventaOffline';
import { getConfiguracionNegocio } from '../../services/configuracion';
import { getCatalogoPos, guardarPrecuenta, ItemVentaPayload, registrarVenta } from '../../services/pos';
import { imprimirVentaServidor, intentarImpresion, reintentarTrabajo } from '../../services/impresion';
import { comandasDeMostrador, imprimirComandasNavegador } from '../../utils/imprimirComandas';
import { calcularCarrito } from '../../utils/carrito';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { mensajeError } from '../../utils/formato';
import { ConfiguracionNegocioInterface } from '../../types/interfaces';
import {
    CatalogoPosInterface, DescuentoInterface, LineaCarritoInterface, PagoFormInterface,
    PedidoInterface, PedidoItemInterface, ProductoPosInterface, VentaInterface,
} from '../../types/pos';
import { ClienteInterface, PedidoEspecialInterface } from '../../types/clientes';

const CLAVE_CARRITO = 'pos_carrito';

interface EstadoCarrito {
    lineas: LineaCarritoInterface[];
    descuentoGlobal: DescuentoInterface | null;
    precuenta: { id: number; numero: string; nombre: string; tipo?: 'precuenta' | 'especial'; anticipo?: number } | null;
    cliente: ClienteInterface | null;
}

const carritoVacio: EstadoCarrito = { lineas: [], descuentoGlobal: null, precuenta: null, cliente: null };

// El carrito sobrevive a una recarga de la página (se guarda en el dispositivo)
const leerCarrito = (): EstadoCarrito => {
    try {
        const guardado = localStorage.getItem(CLAVE_CARRITO);
        return guardado ? { ...carritoVacio, ...JSON.parse(guardado) } : carritoVacio;
    } catch {
        return carritoVacio;
    }
};

export function usePosHook() {
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const { user, hasPermission } = useAuth();
    const { enLinea, encolar, reportarErrorDeRed } = useConexion();

    const [catalogo, setCatalogo] = useState<CatalogoPosInterface | null>(null);
    const [negocio, setNegocio] = useState<ConfiguracionNegocioInterface | null>(null);
    const [cargando, setCargando] = useState(true);
    const [carrito, setCarrito] = useState<EstadoCarrito>(leerCarrito);
    const [categoria, setCategoria] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [cobrando, setCobrando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [ventaRealizada, setVentaRealizada] = useState<VentaInterface | null>(null);
    const [impresion, setImpresion] = useState<{ estado: 'imprimiendo' | 'ok' | 'error'; mensaje: string; trabajoId?: number }>({
        estado: 'ok', mensaje: '',
    });

    // Un uuid por venta: si la red falla y se reintenta, el servidor no la duplica
    const uuidVenta = useRef(nuevoUuid());

    // Catálogo y configuración: del servidor y, sin conexión, de la última copia del dispositivo
    const cargarCatalogo = useCallback(async () => {
        try {
            const [cat, conf] = await Promise.all([getCatalogoPos(), getConfiguracionNegocio()]);
            setCatalogo(cat);
            setNegocio(conf);
            guardarCache('pos_catalogo', cat);
            guardarCache('pos_negocio', conf);
        } catch (error) {
            if (esErrorDeRed(error)) {
                reportarErrorDeRed();
                const [cat, conf] = await Promise.all([
                    leerCache<CatalogoPosInterface>('pos_catalogo'),
                    leerCache<ConfiguracionNegocioInterface>('pos_negocio'),
                ]);
                if (cat) setCatalogo(cat.valor);
                if (conf) setNegocio(conf.valor);
                if (!cat) toast.error('Sin conexión y sin catálogo guardado en este dispositivo');
            } else {
                toast.error(mensajeError(error, 'No se pudo cargar el catálogo'));
            }
        } finally {
            setCargando(false);
        }
    }, [reportarErrorDeRed]);

    useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

    useEffect(() => {
        try {
            localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
        } catch {
            // sin almacenamiento: el carrito solo vive en memoria
        }
    }, [carrito]);

    const totales = useMemo(() => calcularCarrito(carrito.lineas, carrito.descuentoGlobal), [carrito]);

    // ── Catálogo visible ────────────────────────────────────────
    const productosVisibles = useMemo(() => {
        if (!catalogo) return [];
        const texto = busqueda.trim().toLowerCase();
        return catalogo.productos.filter((p) =>
            (texto
                ? p.nombre.toLowerCase().includes(texto) || p.sku?.toLowerCase() === texto || p.codigo_barras === texto
                : categoria === null || p.categorias.includes(categoria))
        );
    }, [catalogo, busqueda, categoria]);

    // ── Carrito ────────────────────────────────────────────────
    const agregar = (producto: ProductoPosInterface, cantidad = 1) => {
        setCarrito((c) => {
            const existe = c.lineas.find((l) => l.producto.id === producto.id);
            const lineas = existe
                ? c.lineas.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: Math.round((l.cantidad + cantidad) * 1000) / 1000 } : l))
                : [...c.lineas, { producto, cantidad, descuento: null }];
            return { ...c, lineas };
        });
    };

    const cambiarCantidad = (productoId: number, cantidad: number) => {
        setCarrito((c) => ({
            ...c,
            lineas: cantidad <= 0
                ? c.lineas.filter((l) => l.producto.id !== productoId)
                : c.lineas.map((l) => (l.producto.id === productoId ? { ...l, cantidad } : l)),
        }));
    };

    const quitar = (productoId: number) => cambiarCantidad(productoId, 0);

    const descuentoLinea = (productoId: number, descuento: DescuentoInterface | null) =>
        setCarrito((c) => ({ ...c, lineas: c.lineas.map((l) => (l.producto.id === productoId ? { ...l, descuento } : l)) }));

    const descuentoGlobal = (descuento: DescuentoInterface | null) => setCarrito((c) => ({ ...c, descuentoGlobal: descuento }));

    const asignarCliente = (cliente: ClienteInterface | null) => setCarrito((c) => ({ ...c, cliente }));

    // Lo que falta cobrar: en un pedido especial ya se recibió el anticipo
    const anticipo = carrito.precuenta?.tipo === 'especial' ? carrito.precuenta.anticipo ?? 0 : 0;
    const porCobrar = Math.max(Math.round((totales.total - anticipo) * 100) / 100, 0);

    const vaciar = () => {
        setCarrito(carritoVacio);
        uuidVenta.current = nuevoUuid();
    };

    // Lector de código de barras o Enter en la búsqueda: código exacto, o el único resultado
    const buscarYAgregar = () => {
        if (!catalogo) return;
        const texto = busqueda.trim();
        if (!texto) return;
        const exacto = catalogo.productos.find((p) => p.codigo_barras === texto || p.sku?.toLowerCase() === texto.toLowerCase());
        const unico = productosVisibles.length === 1 ? productosVisibles[0] : null;
        const producto = exacto ?? unico;
        if (producto) {
            agregar(producto);
            setBusqueda('');
        } else {
            toast.error('No se encontró el producto');
        }
    };

    const itemsPayload = (): ItemVentaPayload[] => carrito.lineas.map((l) => ({
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        descuento_tipo: l.descuento?.tipo ?? null,
        descuento_valor: l.descuento?.valor ?? 0,
    }));

    // ── Impresión del ticket (y comandas) en la térmica ─────────
    // modo: 'nuevo' (ticket + comandas al cobrar), 'copia' (reimpresión), 'reintento' (el trabajo que falló)
    // Al cobrar, todo sale en comanda: si la térmica no imprimió una por área, salen desde el navegador
    const imprimirTicket = async (ventaId: number, modo: 'nuevo' | 'copia' | 'reintento' = 'nuevo',
        comandas: ReturnType<typeof comandasDeMostrador> = []) => {
        setImpresion({ estado: 'imprimiendo', mensaje: '' });
        let comandasImpresas = 0;
        const res = await intentarImpresion(async () => {
            if (modo === 'reintento' && impresion.trabajoId) return reintentarTrabajo(impresion.trabajoId);
            const r = await imprimirVentaServidor(ventaId, { caja_id: cajaId, copia: modo === 'copia', comandas: modo === 'nuevo' });
            comandasImpresas = r.trabajos.filter((t) => t.tipo === 'comanda' && t.estado === 'impreso').length;
            return r;
        });
        setImpresion({ estado: res.impreso ? 'ok' : 'error', mensaje: res.mensaje, trabajoId: res.trabajoId });
        if (modo === 'nuevo' && comandasImpresas < comandas.length) imprimirComandasNavegador(comandas);
    };

    // ── Venta sin conexión ─────────────────────────────────────
    const venderSinConexion = async (pagos: PagoFormInterface[]) => {
        if (!cajaId) return;

        if (carrito.precuenta) {
            toast.error(carrito.precuenta.tipo === 'especial'
                ? 'Los pedidos especiales necesitan conexión con el servidor: entrégalo cuando vuelva la conexión'
                : 'Las precuentas necesitan conexión con el servidor: cóbrala cuando vuelva la conexión');
            return;
        }
        if (pagos.some((p) => catalogos?.metodos_pago.find((m) => m.id === p.metodo_pago_id)?.tipo === 'credito')) {
            toast.error('La venta al crédito necesita conexión con el servidor');
            return;
        }

        // Un descuento sobre el máximo (o sin permiso de descuentos) solo lo hace el administrador
        const maximo = Number(negocio?.descuento_max_sin_autorizacion ?? 10);
        const sinPermiso = totales.descuentoTotal > 0 && !hasPermission('pos.descuento.autorizar')
            && (totales.porcentajeDescuento > maximo + 0.001 || !hasPermission('pos.descuento'));
        if (sinPermiso) {
            toast.error(`Un descuento de ${totales.porcentajeDescuento.toFixed(1)}% solo lo puede hacer el administrador`);
            return;
        }

        const { payload, ticket } = construirVentaOffline({
            uuid: uuidVenta.current,
            cajaId,
            cajaNombre: actual?.turno?.caja ?? actual?.caja.nombre ?? null,
            turnoId: actual?.turno?.id ?? null,
            usuario: user?.nombre ?? null,
            lineas: carrito.lineas,
            totales,
            descuentoGlobal: carrito.descuentoGlobal,
            pagos,
            metodos: catalogos?.metodos_pago ?? [],
        });

        // El cliente queda en la venta para su historial (sin crédito: eso requiere conexión)
        if (carrito.cliente) {
            payload.cliente_id = carrito.cliente.id;
            ticket.cliente = { id: carrito.cliente.id, nombre: carrito.cliente.nombre, documento: carrito.cliente.documento, telefono: carrito.cliente.telefono };
        }

        await encolar({ uuid: payload.uuid, payload, ticket, creado: new Date().toISOString(), estado: 'pendiente', intentos: 0 });

        // Existencias locales para que el catálogo refleje lo vendido mientras no hay conexión
        if (catalogo) {
            const vendido = new Map(carrito.lineas.map((l) => [l.producto.id, l.cantidad]));
            const actualizado = {
                ...catalogo,
                productos: catalogo.productos.map((p) =>
                    p.controla_stock && vendido.has(p.id) ? { ...p, stock: (p.stock ?? 0) - vendido.get(p.id)! } : p),
            };
            setCatalogo(actualizado);
            guardarCache('pos_catalogo', actualizado);
        }

        setVentaRealizada(ticket);
        setImpresion({ estado: 'error', mensaje: 'Sin conexión con el servidor: imprime el ticket desde el navegador' });
        // Sin servidor no hay térmica: las comandas salen desde el navegador
        imprimirComandasNavegador(comandasDeMostrador(carrito.lineas, ticket.numero, user?.nombre ?? null));
        setCobrando(false);
        vaciar();
        toast('Venta guardada en el dispositivo. Se enviará al volver la conexión.', { icon: '📴' });
    };

    // ── Cobro ──────────────────────────────────────────────────
    const cobrar = async (pagos: PagoFormInterface[]) => {
        if (!cajaId) return;
        setGuardando(true);

        if (!enLinea) {
            try {
                await venderSinConexion(pagos);
            } finally {
                setGuardando(false);
            }
            return;
        }

        try {
            const res = await registrarVenta({
                uuid: uuidVenta.current,
                caja_id: cajaId,
                items: itemsPayload(),
                descuento_global: carrito.descuentoGlobal,
                pagos: pagos.map((p) => ({ metodo_pago_id: p.metodo_pago_id, monto: p.monto, referencia: p.referencia })),
                pedido_id: carrito.precuenta?.id ?? null,
                cliente_id: carrito.cliente?.id ?? null,
            });

            const comandas = comandasDeMostrador(carrito.lineas, res.venta.numero, user?.nombre ?? null);
            setVentaRealizada(res.venta);
            setCobrando(false);
            vaciar();
            refrescar();
            cargarCatalogo(); // existencias actualizadas
            imprimirTicket(res.venta.id, 'nuevo', comandas); // no se espera: imprimir nunca frena la siguiente venta
        } catch (error) {
            // El servidor no respondió: la venta se guarda en el dispositivo con el mismo uuid
            if (esErrorDeRed(error)) {
                reportarErrorDeRed();
                await venderSinConexion(pagos);
            } else {
                toast.error(mensajeError(error, 'No se pudo registrar la venta'));
            }
        } finally {
            setGuardando(false);
        }
    };

    // ── Precuentas ─────────────────────────────────────────────
    const guardarComoPrecuenta = async (nombre: string) => {
        setGuardando(true);
        try {
            const res = await guardarPrecuenta({
                uuid: nuevoUuid(),
                caja_id: cajaId,
                nombre,
                items: itemsPayload(),
            }, carrito.precuenta?.id);
            toast.success(res.message);
            vaciar();
            return true;
        } catch (error) {
            toast.error(mensajeError(error, 'No se pudo guardar la precuenta'));
            return false;
        } finally {
            setGuardando(false);
        }
    };

    // Pasa los productos guardados al carrito con los precios vigentes del catálogo
    const lineasDesde = (items: PedidoItemInterface[]): LineaCarritoInterface[] => {
        if (!catalogo) return [];
        const lineas: LineaCarritoInterface[] = [];
        const faltantes: string[] = [];

        items.forEach((i) => {
            const producto = catalogo.productos.find((p) => p.id === i.producto_id);
            if (!producto) {
                faltantes.push(i.nombre);
                return;
            }
            lineas.push({
                producto,
                cantidad: i.cantidad,
                descuento: i.descuento_tipo ? { tipo: i.descuento_tipo, valor: i.descuento_valor } : null,
            });
        });

        if (faltantes.length) toast.error(`Ya no están a la venta: ${faltantes.join(', ')}`);
        return lineas;
    };

    // Recupera una precuenta al carrito
    const abrirPrecuenta = (pedido: PedidoInterface) => {
        if (!catalogo) return;
        uuidVenta.current = nuevoUuid();
        setCarrito({
            lineas: lineasDesde(pedido.items), descuentoGlobal: null, cliente: null,
            precuenta: { id: pedido.id, numero: pedido.numero, nombre: pedido.nombre, tipo: 'precuenta' },
        });
    };

    // Pedido especial que se entrega: se cobra lo pendiente después del anticipo
    const abrirPedidoEspecial = (pedido: PedidoEspecialInterface, cliente: ClienteInterface | null) => {
        if (!catalogo) return;
        uuidVenta.current = nuevoUuid();
        setCarrito({
            lineas: lineasDesde(pedido.items), descuentoGlobal: null, cliente,
            precuenta: { id: pedido.id, numero: pedido.numero, nombre: pedido.nombre, tipo: 'especial', anticipo: pedido.anticipo },
        });
    };

    return {
        cajaId, turno: actual?.turno ?? null, metodosPago: catalogos?.metodos_pago ?? [],
        // Mientras llega el turno de la caja no se muestra el aviso de "sin turno"
        esperandoCaja: !catalogos || (!!cajaId && !actual),
        catalogo, negocio, cargando, cargarCatalogo,
        carrito, totales, categoria, setCategoria, busqueda, setBusqueda, productosVisibles,
        agregar, cambiarCantidad, quitar, descuentoLinea, descuentoGlobal, vaciar, buscarYAgregar,
        asignarCliente, anticipo, porCobrar, enLinea,
        cobrando, setCobrando, guardando, cobrar, ventaRealizada, setVentaRealizada,
        impresion, imprimirTicket,
        guardarComoPrecuenta, abrirPrecuenta, abrirPedidoEspecial,
    };
}
