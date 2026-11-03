import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MotivoModal from '../../components/modal/MotivoModal';
import TurnoReporte from '../../components/caja/TurnoReporte';
import { CanAccess } from '../../components/auth/CanAccess';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { getTurno, reabrirTurno } from '../../services/caja';
import { imprimirTurnoServidor } from '../../services/impresion';
import { imprimirConRespaldo } from '../../utils/imprimir';
import { TurnoDetalleInterface } from '../../types/caja';
import { dinero, mensajeError } from '../../utils/formato';

export default function CajaTurnoDetalle() {
    const { id } = useParams();
    const { hasPermission } = useAuth();
    const { cajaId, refrescar } = useCaja();
    const [detalle, setDetalle] = useState<TurnoDetalleInterface | null>(null);
    const [reabriendo, setReabriendo] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        getTurno(Number(id))
            .then(setDetalle)
            .catch(error => toast.error(mensajeError(error, 'Error al cargar el turno')));
    }, [id]);

    const reabrir = async (motivo: string) => {
        setGuardando(true);
        try {
            const res = await reabrirTurno(Number(id), motivo);
            setDetalle(res);
            setReabriendo(false);
            toast.success(res.message);
            refrescar();
        } catch (error) {
            toast.error(mensajeError(error, 'No se pudo reabrir el turno'));
        } finally {
            setGuardando(false);
        }
    };

    if (!detalle) {
        return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
    }

    const { turno, movimientos, registros = [] } = detalle;

    return (
        <div className="p-6">
            <MotivoModal
                isOpen={reabriendo}
                titulo="Reabrir turno"
                descripcion="El turno vuelve a quedar abierto para registrar movimientos. Queda en auditoría."
                textoConfirmar="Reabrir"
                colorConfirmar="bg-amber-500 hover:bg-amber-600"
                isLoading={guardando}
                onClose={() => setReabriendo(false)}
                onConfirm={reabrir}
            />

            <PageHeader
                title={`Turno #${turno.id} · ${turno.caja}`}
                subtitle={`Abrió ${turno.usuario_apertura} el ${turno.abierto_at}` + (turno.cerrado_at ? ` · Cerró ${turno.usuario_cierre} el ${turno.cerrado_at}` : ' · en curso')}
                backTo={hasPermission('caja.historial') ? '/caja/historial' : '/caja'}
                actions={
                    <>
                        <StatusBadge tone={turno.estado === 'abierto' ? 'success' : 'neutral'}>{turno.estado === 'abierto' ? 'Abierto' : 'Cerrado'}</StatusBadge>
                        {turno.estado === 'cerrado' && (
                            <CanAccess permission="caja.reabrir">
                                <button type="button" onClick={() => setReabriendo(true)}
                                    className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg">Reabrir</button>
                            </CanAccess>
                        )}
                        <button type="button" onClick={() => imprimirConRespaldo(() => imprimirTurnoServidor(turno.id, cajaId))}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Imprimir</button>
                    </>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2">
                    <TurnoReporte detalle={detalle} />
                </div>

                <div className="lg:col-span-3 no-imprimir rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800">Movimientos ({movimientos.length})</div>
                    <div className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
                        {movimientos.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">Sin movimientos</p>}
                        {movimientos.map(m => (
                            <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${m.anulado ? 'opacity-50' : ''}`}>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium text-gray-800 ${m.anulado ? 'line-through' : ''}`}>{m.concepto}</p>
                                    <p className="text-xs text-gray-500">{m.fecha} · {m.tipo_texto} · {m.metodo_pago} · {m.usuario}</p>
                                    {m.anulado && <p className="text-xs text-red-600">Anulado por {m.anulado_por}: {m.motivo_anulacion}</p>}
                                </div>
                                <span className={`whitespace-nowrap text-sm font-semibold ${m.entrada ? 'text-green-700' : 'text-red-600'}`}>
                                    {m.entrada ? '+' : '−'}{dinero(m.monto)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-6 no-imprimir rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-800">Registrado en este turno ({registros.length})</p>
                    <p className="text-xs text-gray-500">Compras, gastos, entradas de inventario, producción y mermas hechas mientras estuvo abierto.</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {registros.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">Nada registrado fuera de la caja</p>}
                    {registros.map(r => (
                        <div key={`${r.tipo}-${r.id}`} className={`flex items-center gap-3 px-5 py-3 ${r.anulado ? 'opacity-50' : ''}`}>
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium text-gray-800 ${r.anulado ? 'line-through' : ''}`}>
                                    {r.tipo}{r.numero ? ` ${r.numero}` : ''}{r.descripcion ? ` · ${r.descripcion}` : ''}
                                </p>
                                <p className="text-xs text-gray-500">{r.fecha} · {r.usuario}{r.anulado ? ' · anulado' : ''}</p>
                            </div>
                            {r.monto !== null && <span className="whitespace-nowrap text-sm font-semibold text-gray-700">{dinero(r.monto)}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
