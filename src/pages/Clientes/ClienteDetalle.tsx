import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import MotivoModal from '../../components/modal/MotivoModal';
import ClienteFormModal from '../../components/clientes/ClienteFormModal';
import PagoCajaModal, { PagoCajaForm } from '../../components/clientes/PagoCajaModal';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import {
    anularAbono, descargarEstadoCuentaPdf, getCliente, getEstadoCuenta, registrarAbono,
} from '../../services/clientes';
import { getVentas } from '../../services/pos';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { dinero, haceDias, hoyLocal, mensajeError, fechaCorta, fechaHora } from '../../utils/formato';
import { AbonoInterface, ClienteDetalleInterface, EstadoCuentaInterface } from '../../types/clientes';
import { VentasResponseInterface } from '../../types/pos';
import { CargandoPagina, FilaCargando } from '../../components/ui/loading/Cargando';

type Pestana = 'pendientes' | 'abonos' | 'compras' | 'estado';

const tarjeta = 'rounded-xl border border-gray-200 bg-white p-4';
const fecha = (iso: string) => fechaCorta(iso);

export default function ClienteDetalle() {
    const { id } = useParams();
    const clienteId = Number(id);
    const { hasPermission } = useAuth();
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const puedeCuentas = hasPermission('cuentas_cobrar.gestionar');

    const [datos, setDatos] = useState<ClienteDetalleInterface | null>(null);
    const [pestana, setPestana] = useState<Pestana>(puedeCuentas ? 'pendientes' : 'compras');
    const [editando, setEditando] = useState(false);
    const [abonando, setAbonando] = useState(false);
    const [anulando, setAnulando] = useState<AbonoInterface | null>(null);
    const [guardando, setGuardando] = useState(false);

    const [compras, setCompras] = useState<VentasResponseInterface | null>(null);
    const [paginaCompras, setPaginaCompras] = useState(1);

    const [rango, setRango] = useState({ desde: haceDias(89), hasta: hoyLocal() });
    const [estado, setEstado] = useState<EstadoCuentaInterface | null>(null);

    const cargar = useCallback(() => {
        getCliente(clienteId).then(setDatos).catch(e => toast.error(mensajeError(e, 'No se pudo cargar el cliente')));
    }, [clienteId]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        if (pestana !== 'compras') return;
        getVentas({ cliente_id: clienteId, page: paginaCompras })
            .then(setCompras)
            .catch(e => toast.error(mensajeError(e, 'Error al cargar las compras')));
    }, [pestana, clienteId, paginaCompras]);

    useEffect(() => {
        if (pestana !== 'estado') return;
        getEstadoCuenta(clienteId, rango)
            .then(res => setEstado(res.estado))
            .catch(e => toast.error(mensajeError(e, 'Error al cargar el estado de cuenta')));
    }, [pestana, clienteId, rango, datos]);

    const turnoAbierto = !!actual?.turno;

    const abonar = async (pago: PagoCajaForm) => {
        if (!cajaId) return;
        setGuardando(true);
        try {
            const res = await registrarAbono(clienteId, { ...pago, uuid: nuevoUuid(), caja_id: cajaId });
            toast.success(res.message);
            setAbonando(false);
            cargar();
            refrescar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo registrar el abono'));
        } finally {
            setGuardando(false);
        }
    };

    const anular = async (motivo: string) => {
        if (!anulando) return;
        setGuardando(true);
        try {
            const res = await anularAbono(anulando.id, motivo);
            if (res) {
                toast.success(res.message);
                setAnulando(null);
                cargar();
                refrescar();
            }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular el abono'));
        } finally {
            setGuardando(false);
        }
    };

    const pdf = () => {
        if (!datos) return;
        descargarEstadoCuentaPdf(clienteId, rango, datos.cliente.nombre)
            .catch(e => toast.error(mensajeError(e, 'No se pudo generar el PDF')));
    };

    if (!datos) return <CargandoPagina />;
    const { cliente, resumen } = datos;

    const pestanas: { clave: Pestana; texto: string; visible: boolean }[] = [
        { clave: 'pendientes', texto: `Por cobrar (${datos.pendientes.length})`, visible: puedeCuentas },
        { clave: 'abonos', texto: 'Abonos', visible: puedeCuentas },
        { clave: 'compras', texto: 'Compras', visible: true },
        { clave: 'estado', texto: 'Estado de cuenta', visible: puedeCuentas },
    ];

    return (
        <div className="p-6">
            <ClienteFormModal isOpen={editando} cliente={cliente} onClose={() => setEditando(false)}
                onSaved={() => { setEditando(false); cargar(); }} />
            <PagoCajaModal isOpen={abonando} titulo={`Abono de ${cliente.nombre}`}
                descripcion="Entra a la caja del turno y se aplica a las cuentas más antiguas primero."
                maximo={cliente.saldo} metodos={catalogos?.metodos_pago ?? []} isLoading={guardando}
                onClose={() => setAbonando(false)} onConfirm={abonar} />
            <MotivoModal isOpen={!!anulando} titulo={`Anular abono ${anulando?.numero ?? ''}`}
                descripcion="El dinero sale de la caja y las cuentas vuelven a quedar pendientes. Queda en auditoría."
                textoConfirmar="Anular abono" isLoading={guardando} onClose={() => setAnulando(null)} onConfirm={anular} />

            <PageHeader title={cliente.nombre} backTo="/clientes"
                subtitle={[cliente.documento, cliente.telefono, cliente.correo].filter(Boolean).join(' · ') || undefined}
                actions={<>
                    {!cliente.activo && <StatusBadge tone="neutral">Inactivo</StatusBadge>}
                    {hasPermission('clientes.gestionar') && (
                        <button type="button" onClick={() => setEditando(true)}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Editar</button>
                    )}
                    {puedeCuentas && cliente.saldo > 0 && (
                        <button type="button" onClick={() => setAbonando(true)} disabled={!turnoAbierto}
                            title={turnoAbierto ? '' : 'Abre el turno de caja para recibir abonos'}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                            Registrar abono
                        </button>
                    )}
                </>} />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Saldo pendiente</p>
                    <p className="text-2xl font-semibold">{dinero(cliente.saldo)}</p>
                    {resumen.vencido > 0 && <p className="text-sm font-medium text-red-600">{dinero(resumen.vencido)} vencido</p>}
                </div>
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Crédito disponible</p>
                    <p className="text-2xl font-semibold">{cliente.limite_credito > 0 ? dinero(cliente.credito_disponible) : '—'}</p>
                    <p className="text-sm text-gray-500">{cliente.limite_credito > 0 ? `Límite ${dinero(cliente.limite_credito)} · ${cliente.dias_credito} días` : 'Sin crédito'}</p>
                </div>
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Compras</p>
                    <p className="text-2xl font-semibold">{resumen.compras}</p>
                    <p className="text-sm text-gray-500">{dinero(resumen.total_comprado)} en total</p>
                </div>
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Última compra</p>
                    <p className="text-lg font-semibold">{resumen.ultima_compra ? fecha(resumen.ultima_compra) : '—'}</p>
                    {cliente.direccion && <p className="truncate text-sm text-gray-500">{cliente.direccion}</p>}
                </div>
            </div>
            {cliente.notas && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{cliente.notas}</p>}

            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
                {pestanas.filter(p => p.visible).map(p => (
                    <button key={p.clave} type="button" onClick={() => setPestana(p.clave)}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${pestana === p.clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {p.texto}
                    </button>
                ))}
            </div>

            {pestana === 'pendientes' && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Venta</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Vence</th>
                                <th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Estado</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {datos.pendientes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No debe nada</td></tr>}
                            {datos.pendientes.map(c => (
                                <tr key={c.id}>
                                    <td className="px-4 py-3 font-medium">{c.venta}</td>
                                    <td className="px-4 py-3">{fecha(c.fecha)}</td>
                                    <td className="px-4 py-3">{fecha(c.fecha_vencimiento)}</td>
                                    <td className="px-4 py-3 text-right">{dinero(c.monto)}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{dinero(c.saldo)}</td>
                                    <td className="px-4 py-3">{c.vencida
                                        ? <StatusBadge tone="danger">Vencida · {c.dias_vencida} días</StatusBadge>
                                        : <StatusBadge tone="info">Al día</StatusBadge>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pestana === 'abonos' && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Abono</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Forma de pago</th>
                                <th className="px-4 py-3">Recibió</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {datos.abonos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin abonos</td></tr>}
                            {datos.abonos.map(a => (
                                <tr key={a.id} className={a.anulado ? 'text-gray-400' : ''}>
                                    <td className="px-4 py-3 font-medium">{a.numero}</td>
                                    <td className="px-4 py-3">{fechaHora(a.fecha)}</td>
                                    <td className="px-4 py-3">{a.metodo}{a.referencia ? ` (${a.referencia})` : ''}</td>
                                    <td className="px-4 py-3">{a.usuario}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${a.anulado ? 'line-through' : ''}`}>{dinero(a.monto)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {a.anulado
                                            ? <span title={a.motivo_anulacion ?? ''}><StatusBadge tone="danger">Anulado</StatusBadge></span>
                                            : a.turno_id === actual?.turno?.id && (
                                                <button type="button" onClick={() => setAnulando(a)} className="text-sm font-medium text-red-600 hover:underline">Anular</button>
                                            )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pestana === 'compras' && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Venta</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Pago</th>
                                <th className="px-4 py-3 text-right">Productos</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Estado</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!compras && <FilaCargando colSpan={6} />}
                            {compras?.ventas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin compras registradas</td></tr>}
                            {compras?.ventas.map(v => (
                                <tr key={v.id} className={v.estado === 'anulada' ? 'text-gray-400' : ''}>
                                    <td className="px-4 py-3 font-medium">{v.numero}</td>
                                    <td className="px-4 py-3">{fechaHora(v.fecha)}</td>
                                    <td className="px-4 py-3">{v.pagos.join(', ')}</td>
                                    <td className="px-4 py-3 text-right">{v.productos}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{dinero(v.total)}</td>
                                    <td className="px-4 py-3">{v.estado !== 'completada' && <StatusBadge tone={v.estado === 'anulada' ? 'danger' : 'warning'}>{v.estado === 'anulada' ? 'Anulada' : 'Devuelta'}</StatusBadge>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {compras && <Paginacion pagina={compras.pagina} totalPaginas={compras.total_paginas} total={compras.total} onCambiar={setPaginaCompras} />}
                </div>
            )}

            {pestana === 'estado' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
                        <button type="button" onClick={pdf} className="px-4 py-2.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg">Descargar PDF</button>
                    </div>
                    {estado && (
                        <>
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <div className={tarjeta}><p className="text-xs text-gray-500">Saldo anterior</p><p className="text-xl font-semibold">{dinero(estado.saldo_anterior)}</p></div>
                                <div className={tarjeta}><p className="text-xs text-gray-500">Compras al crédito</p><p className="text-xl font-semibold">{dinero(estado.cargos)}</p></div>
                                <div className={tarjeta}><p className="text-xs text-gray-500">Abonos y devoluciones</p><p className="text-xl font-semibold text-green-700">{dinero(estado.abonos)}</p></div>
                                <div className={tarjeta}><p className="text-xs text-gray-500">Saldo al {fecha(estado.hasta)}</p><p className="text-xl font-semibold">{dinero(estado.saldo_final)}</p></div>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                        <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Descripción</th>
                                            <th className="px-4 py-3 text-right">Cargo</th><th className="px-4 py-3 text-right">Abono</th><th className="px-4 py-3 text-right">Saldo</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr className="text-gray-500"><td colSpan={5} className="px-4 py-2">Saldo anterior</td><td className="px-4 py-2 text-right">{dinero(estado.saldo_anterior)}</td></tr>
                                        {estado.movimientos.map((m, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3">{fechaHora(m.fecha)}</td>
                                                <td className="px-4 py-3 font-medium">{m.documento}</td>
                                                <td className="px-4 py-3">{m.descripcion}</td>
                                                <td className="px-4 py-3 text-right">{m.cargo > 0 ? dinero(m.cargo) : ''}</td>
                                                <td className="px-4 py-3 text-right text-green-700">{m.abono > 0 ? dinero(m.abono) : ''}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{dinero(m.saldo)}</td>
                                            </tr>
                                        ))}
                                        {estado.movimientos.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin movimientos en el periodo</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
