import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import MoneyInput from '../../components/form/MoneyInput';
import TurnoReporte from '../../components/caja/TurnoReporte';
import { useCaja } from '../../context/CajaContext';
import { useConexion } from '../../context/ConexionContext';
import { cerrarTurno } from '../../services/caja';
import { imprimirTurnoServidor } from '../../services/impresion';
import { imprimirConRespaldo } from '../../utils/imprimir';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/api';
import { clearAuth, getToken } from '../../utils/auth';
import { TurnoDetalleInterface } from '../../types/caja';
import { dinero, mensajeError, fechaHora } from '../../utils/formato';
import { ConsumoTurno, PorComprar } from '../../components/caja/PorComprar';

export default function CajaCierre() {
    const navigate = useNavigate();
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const { cola, enLinea, sincronizar, sincronizando } = useConexion();

    const [contado, setContado] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const { user, setUser } = useAuth();
    const [confirmando, setConfirmando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [resultado, setResultado] = useState<TurnoDetalleInterface | null>(null);
    // Cerró el turno que otro dejó abierto: sigue en su sesión para abrir el suyo
    const [eraAjeno, setEraAjeno] = useState(false);

    // Cerrado el turno se cierra la sesión: el siguiente turno lo abre quien entre con su usuario (otro o el mismo)
    const cerrarSesion = async () => {
        try {
            const token = getToken();
            if (token) await logout(token);
        } catch {
            // aunque falle en el servidor, la sesión se limpia aquí
        } finally {
            clearAuth();
            setUser(null);
            navigate('/', { replace: true });
        }
    };

    if (resultado) {
        const d = resultado.turno.diferencia ?? 0;
        return (
            <div className="p-6">
                <PageHeader title="Turno cerrado" subtitle={`${resultado.turno.caja} · Turno #${resultado.turno.id}`} />
                <div className="no-imprimir mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    {eraAjeno
                        ? <>Cerraste el turno de {resultado.turno.usuario_apertura}. Imprime el cierre y luego <strong>abre tu turno</strong> para empezar a vender.</>
                        : <>Imprime el cierre y termina con <strong>Cerrar sesión</strong>: el siguiente turno lo abre quien entre con su usuario.</>}
                </div>
                <div className={`mb-6 rounded-xl p-5 text-center ${d === 0 ? 'bg-green-50 text-green-800' : d < 0 ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                    <p className="text-sm">{d === 0 ? 'La caja cuadra' : d < 0 ? 'Faltante' : 'Sobrante'}</p>
                    <p className="text-3xl font-bold">{d === 0 ? dinero(0) : dinero(Math.abs(d))}</p>
                </div>
                <TurnoReporte detalle={resultado} />
                <div className="no-imprimir mt-6 flex justify-center gap-3">
                    <button type="button" onClick={() => imprimirConRespaldo(() => imprimirTurnoServidor(resultado.turno.id, cajaId))}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                        Imprimir cierre
                    </button>
                    {eraAjeno ? (
                        <button type="button" onClick={() => navigate('/caja')} className="px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">
                            Abrir mi turno
                        </button>
                    ) : (
                        <button type="button" onClick={cerrarSesion} className="px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">
                            Cerrar sesión
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!catalogos || !actual) {
        return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
    }

    if (!actual.turno) {
        return <Navigate to="/caja" replace />;
    }

    const turno = actual.turno;
    const resumen = actual.resumen!;
    const total = Number(contado || 0);
    const ciego = resumen.efectivo_esperado === null;
    const diferencia = ciego ? null : total - resumen.efectivo_esperado!;

    const cerrar = async () => {
        setGuardando(true);
        try {
            const res = await cerrarTurno(turno.id, {
                efectivo_contado: total,
                observaciones: observaciones.trim() || undefined,
            });
            toast.success(res.message);
            setEraAjeno(!!actual?.turno_ajeno);
            setResultado(res);
            refrescar();
        } catch (error) {
            toast.error(mensajeError(error, 'No se pudo cerrar el turno'));
        } finally {
            setGuardando(false);
            setConfirmando(false);
        }
    };

    return (
        <div className="p-6">
            {confirmando && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
                        <h2 className="text-lg font-semibold">¿Cerrar el turno?</h2>
                        <p className="text-sm text-gray-600">Efectivo contado</p>
                        <p className="text-3xl font-bold text-gray-900">{dinero(total)}</p>
                        <p className="text-xs text-gray-500">Después de cerrar no se pueden registrar más movimientos en este turno.</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmando(false)} disabled={guardando}
                                className="flex-1 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50">Revisar</button>
                            <button type="button" onClick={cerrar} disabled={guardando}
                                className="flex-1 py-3 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg disabled:opacity-50">
                                {guardando ? 'Cerrando...' : 'Cerrar turno'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Cierre de caja"
                subtitle={`${turno.caja} · Turno #${turno.id} · abierto por ${turno.usuario_apertura} el ${fechaHora(turno.abierto_at)}`}
                backTo="/caja"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-1 text-lg font-semibold text-gray-800">Cuenta el efectivo de la gaveta</h2>
                    <p className="mb-4 text-sm text-gray-500">Escribe el total de la gaveta. Incluye el fondo inicial; las ventas con tarjeta o transferencia no se cuentan aquí.</p>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo contado</label>
                    <div className="max-w-xs">
                        <MoneyInput value={contado} onChange={setContado} prefix="$" placeholder="0.00" />
                    </div>
                </div>
                {/* Sale también en el ticket de cierre para que el siguiente turno haga la compra */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <PorComprar productos={resumen.por_comprar ?? []} />
                    <ConsumoTurno consumo={resumen.consumo ?? []} />
                </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 lg:sticky lg:top-24">
                        <h2 className="font-semibold text-gray-800">Resumen del turno</h2>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Fondo inicial</dt><dd>{dinero(resumen.fondo_inicial)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Ventas</dt><dd>{dinero(resumen.totales.ventas)}</dd></div>
                            {resumen.por_metodo.map(m => (
                                <div key={m.metodo_pago_id} className="flex justify-between pl-3 text-xs">
                                    <dt className="text-gray-400">{m.nombre}</dt><dd className="text-gray-500">{dinero(m.neto)}</dd>
                                </div>
                            ))}
                            <div className="flex justify-between"><dt className="text-gray-500">Ingresos</dt><dd>{dinero(resumen.totales.ingresos)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Egresos</dt><dd>-{dinero(resumen.totales.egresos + resumen.totales.devoluciones)}</dd></div>
                            <hr />
                            {!ciego && <div className="flex justify-between font-medium"><dt>Efectivo esperado</dt><dd>{dinero(resumen.efectivo_esperado)}</dd></div>}
                            <div className="flex justify-between font-medium"><dt>Efectivo contado</dt><dd>{dinero(total)}</dd></div>
                            {diferencia !== null && (
                                <div className={`flex justify-between font-semibold ${Math.abs(diferencia) < 0.005 ? 'text-green-700' : diferencia < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                    <dt>{Math.abs(diferencia) < 0.005 ? 'Cuadra' : diferencia < 0 ? 'Faltante' : 'Sobrante'}</dt>
                                    <dd>{dinero(Math.abs(diferencia))}</dd>
                                </div>
                            )}
                            {ciego && <p className="text-xs text-gray-400">Cierre ciego: la diferencia se muestra al cerrar.</p>}
                        </dl>
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Lo cierra <strong>{user?.nombre}</strong>.</p>
                        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} maxLength={500}
                            placeholder="Observaciones (opcional)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                        {/* Las ventas sin conexión deben llegar antes del cierre, o faltarían en el cuadre */}
                        {cola.length > 0 && (
                            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                <p className="font-medium">Hay {cola.length} venta(s) sin sincronizar en este dispositivo</p>
                                <p className="text-xs">Sincronízalas antes de cerrar para que entren en el cuadre.</p>
                                <button type="button" onClick={sincronizar} disabled={!enLinea || sincronizando}
                                    className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50">
                                    {sincronizando ? 'Sincronizando…' : enLinea ? 'Sincronizar ahora' : 'Sin conexión con el servidor'}
                                </button>
                            </div>
                        )}
                        <button type="button" onClick={() => setConfirmando(true)} disabled={cola.length > 0 || !enLinea || contado === ''}
                            className="w-full py-4 text-base font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition disabled:opacity-40">
                            Cerrar turno
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
