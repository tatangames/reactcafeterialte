import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MoneyInput from '../../components/form/MoneyInput';
import MotivoModal from '../../components/modal/MotivoModal';
import ConteoModal from '../../components/caja/ConteoModal';
import MovimientoCajaModal from '../../components/caja/MovimientoCajaModal';
import TurnoReporte from '../../components/caja/TurnoReporte';
import { CanAccess } from '../../components/auth/CanAccess';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { useTurnoCajaHook } from '../../hooks/caja/useTurnoCajaHook';
import { TurnoDetalleInterface } from '../../types/caja';
import { dinero } from '../../utils/formato';
import { abrirCajon, imprimirTurnoServidor, intentarImpresion } from '../../services/impresion';
import { imprimirConRespaldo } from '../../utils/imprimir';
import { ConsumoTurno, PorComprar } from '../../components/caja/PorComprar';

function Tarjeta({ titulo, valor, color = 'text-gray-800', detalle }: { titulo: string; valor: string; color?: string; detalle?: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{titulo}</p>
            <p className={`text-2xl font-semibold ${color}`}>{valor}</p>
            {detalle && <p className="text-xs text-gray-400">{detalle}</p>}
        </div>
    );
}

const botonGrande = 'flex-1 min-w-[140px] rounded-xl px-4 py-4 text-base font-semibold text-white transition disabled:opacity-50';

export default function CajaTurno() {
    const navigate = useNavigate();
    const { cajaId, elegirCaja, catalogos, actual, cargando } = useCaja();
    const { user } = useAuth();
    const {
        turno, guardando,
        modalMovimiento, setModalMovimiento, modalArqueo, setModalArqueo,
        anulando, setAnulando, abrir, registrarMovimiento, arqueo, anular,
    } = useTurnoCajaHook();

    const [fondo, setFondo] = useState('');
    const [obsApertura, setObsApertura] = useState('');
    const [verCorte, setVerCorte] = useState(false);
    const [abriendoCajon, setAbriendoCajon] = useState(false);

    if (!catalogos) {
        return (
            <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );
    }

    // ── Elegir la caja de este dispositivo ───────────────────────
    if (!cajaId) {
        return (
            <div className="p-6">
                <PageHeader title="Caja" subtitle="¿Qué caja se usa en este dispositivo?" />
                {catalogos.cajas.length === 0 && <p className="text-sm text-gray-500">No hay cajas activas. Crea una en Configuración → Cajas y pagos.</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catalogos.cajas.map(c => (
                        <button key={c.id} type="button" onClick={() => elegirCaja(c.id)}
                            className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:border-blue-400 hover:shadow transition">
                            <p className="text-lg font-semibold text-gray-800">{c.nombre}</p>
                            <p className="mt-1 text-sm text-gray-500">
                                {c.turno_abierto ? `Turno abierto por ${c.turno_abierto.usuario} (${c.turno_abierto.abierto_at})` : 'Sin turno abierto'}
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const cambiarCaja = catalogos.cajas.length > 1 && (
        <button type="button" onClick={() => elegirCaja(null)} className="text-sm text-blue-600 hover:underline">
            Cambiar caja
        </button>
    );

    // ── Sin turno: apertura ─────────────────────────────────────
    if (!turno) {
        return (
            <div className="p-6">
                <PageHeader title={actual?.caja.nombre ?? 'Caja'} subtitle="No hay turno abierto" actions={cambiarCaja} />

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <CanAccess permission="caja.abrir" fallback={
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        No hay un turno abierto en esta caja. Pide a un cajero o encargado que lo abra.
                    </p>
                }>
                    <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Abrir turno</h2>
                            <p className="text-sm text-gray-500">Indica el efectivo con el que inicia la gaveta.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fondo inicial</label>
                            <MoneyInput value={fondo} onChange={setFondo} prefix="$" placeholder="0.00" />
                        </div>
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                            El turno queda a nombre de <strong>{user?.nombre}</strong>. Si atiende otra persona, cierra sesión y que entre con su usuario.
                        </p>
                        <textarea value={obsApertura} onChange={e => setObsApertura(e.target.value)} rows={2} maxLength={500}
                            placeholder="Observaciones (opcional)"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                        <div className="flex flex-wrap gap-3">
                            <button type="button" disabled={guardando}
                                onClick={() => abrir(Number(fondo || 0), obsApertura.trim() || undefined)}
                                className={`${botonGrande} bg-green-600 hover:bg-green-700`}>
                                {guardando ? 'Abriendo...' : 'Abrir turno'}
                            </button>
                        </div>
                    </div>
                </CanAccess>

                {/* Quien recibe la caja ve qué dejó por comprar el turno anterior */}
                <div className="w-full lg:max-w-sm">
                    <PorComprar productos={actual?.por_comprar ?? []}
                        titulo={actual?.turno_anterior ? `Por comprar · cerró ${actual.turno_anterior.cerro ?? ''} ${actual.turno_anterior.cerrado_at ?? ''}` : 'Por comprar'} />
                </div>
                </div>
            </div>
        );
    }

    // ── Turno abierto ───────────────────────────────────────────
    const resumen = actual!.resumen!;
    const detalle: TurnoDetalleInterface = {
        turno, resumen, movimientos: actual!.movimientos ?? [], arqueos: actual!.arqueos ?? [], cierre_ciego: !!actual!.cierre_ciego,
    };

    return (
        <div className="p-6">
            <MovimientoCajaModal
                tipo={modalMovimiento}
                metodos={catalogos.metodos_pago}
                isLoading={guardando}
                onClose={() => setModalMovimiento(null)}
                onConfirm={registrarMovimiento}
            />
            <ConteoModal
                isOpen={modalArqueo}
                titulo="Arqueo parcial"
                descripcion="Cuenta la gaveta sin cerrar el turno y escribe el total (incluye el fondo inicial)"
                textoConfirmar="Registrar arqueo"
                isLoading={guardando}
                onClose={() => setModalArqueo(false)}
                onConfirm={({ total, observaciones }) => arqueo(total, observaciones)}
            />
            <MotivoModal
                isOpen={abriendoCajon}
                titulo="Abrir cajón de dinero"
                descripcion="Abre la gaveta sin registrar una venta. Queda en auditoría."
                textoConfirmar="Abrir cajón"
                colorConfirmar="bg-amber-500 hover:bg-amber-600"
                onClose={() => setAbriendoCajon(false)}
                onConfirm={async (motivo) => {
                    setAbriendoCajon(false);
                    const res = await intentarImpresion(() => abrirCajon(cajaId!, motivo));
                    if (res.impreso) toast.success('Cajón abierto');
                    else toast.error(res.mensaje);
                }}
            />
            <MotivoModal
                isOpen={!!anulando}
                titulo="Anular movimiento"
                descripcion={anulando ? `${anulando.tipo_texto} de ${dinero(anulando.monto)}: ${anulando.concepto}` : ''}
                textoConfirmar="Anular"
                isLoading={guardando}
                onClose={() => setAnulando(null)}
                onConfirm={anular}
            />

            {verCorte && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="max-h-[92vh] overflow-y-auto rounded-xl bg-gray-100 p-4 space-y-3">
                        <TurnoReporte detalle={detalle} />
                        <div className="no-imprimir flex justify-end gap-2">
                            <button type="button" onClick={() => setVerCorte(false)} className="px-4 py-2.5 text-sm bg-white hover:bg-gray-50 rounded-lg">Cerrar</button>
                            <button type="button" onClick={() => imprimirConRespaldo(() => imprimirTurnoServidor(turno.id, cajaId))}
                                className="px-4 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title={`${turno.caja} · Turno #${turno.id}`}
                subtitle={`Abierto por ${turno.usuario_apertura} el ${turno.abierto_at}`}
                actions={<>{cambiarCaja}<StatusBadge tone="success">Abierto</StatusBadge></>}
            />

            {actual?.turno_ajeno && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                    <p className="font-semibold">Este turno es de {turno.usuario_apertura} y quedó abierto</p>
                    <p>Cuenta el efectivo y ciérralo (el cierre queda a tu nombre con la diferencia que salga); después abre tu turno.
                        Mientras tanto no se puede vender ni registrar ingresos, egresos o gastos en él.</p>
                </div>
            )}

            {/* Acciones */}
            <div className="mb-6 flex flex-wrap gap-3">
                {!actual?.turno_ajeno && <>
                <CanAccess permission="caja.movimientos">
                    <button type="button" onClick={() => setModalMovimiento('ingreso')} className={`${botonGrande} bg-green-600 hover:bg-green-700`}>+ Ingreso</button>
                    <button type="button" onClick={() => setModalMovimiento('egreso')} className={`${botonGrande} bg-red-600 hover:bg-red-700`}>− Egreso</button>
                </CanAccess>
                <CanAccess permission="gastos.registrar">
                    <button type="button" onClick={() => navigate('/gastos?nuevo=1')} className={`${botonGrande} bg-rose-700 hover:bg-rose-800`}>Gasto</button>
                </CanAccess>
                <CanAccess permission="caja.arqueo">
                    <button type="button" onClick={() => setModalArqueo(true)} className={`${botonGrande} bg-blue-600 hover:bg-blue-700`}>Arqueo</button>
                </CanAccess>
                <CanAccess permission="caja.movimientos">
                    <button type="button" onClick={() => setAbriendoCajon(true)} className={`${botonGrande} bg-amber-500 hover:bg-amber-600`}>Abrir cajón</button>
                </CanAccess>
                </>}
                <button type="button" onClick={() => setVerCorte(true)} className={`${botonGrande} bg-gray-700 hover:bg-gray-800`}>Corte X</button>
                <CanAccess permission="caja.cerrar">
                    <button type="button" onClick={() => navigate('/caja/cierre')} className={`${botonGrande} bg-gray-900 hover:bg-black`}>Cerrar turno</button>
                </CanAccess>
            </div>

            {/* Resumen */}
            <div className={`mb-6 grid grid-cols-2 lg:grid-cols-5 gap-3 ${cargando ? 'opacity-60' : ''}`}>
                <Tarjeta titulo="Fondo inicial" valor={dinero(resumen.fondo_inicial)} />
                <Tarjeta titulo="Ventas" valor={dinero(resumen.totales.ventas)} color="text-blue-700" />
                <Tarjeta titulo="Ingresos" valor={dinero(resumen.totales.ingresos)} color="text-green-700" />
                <Tarjeta titulo="Egresos" valor={dinero(resumen.totales.egresos + resumen.totales.devoluciones)} color="text-red-600" />
                <Tarjeta titulo="Efectivo en caja"
                    valor={resumen.efectivo_esperado === null ? '••••' : dinero(resumen.efectivo_esperado)}
                    detalle={resumen.efectivo_esperado === null ? 'Cierre ciego' : 'Esperado en la gaveta'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Movimientos */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">Movimientos del turno</h2>
                        <span className="text-xs text-gray-500">{detalle.movimientos.length}</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                        {detalle.movimientos.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">Aún no hay movimientos</p>}
                        {detalle.movimientos.map(m => (
                            <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${m.anulado ? 'opacity-50' : ''}`}>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium text-gray-800 ${m.anulado ? 'line-through' : ''}`}>{m.concepto}</p>
                                    <p className="text-xs text-gray-500">
                                        {m.fecha.slice(11)} · {m.tipo_texto} · {m.metodo_pago}{m.referencia ? ` (${m.referencia})` : ''} · {m.usuario}
                                    </p>
                                    {m.anulado && <p className="text-xs text-red-600">Anulado por {m.anulado_por}: {m.motivo_anulacion}</p>}
                                </div>
                                <span className={`whitespace-nowrap text-sm font-semibold ${m.entrada ? 'text-green-700' : 'text-red-600'}`}>
                                    {m.entrada ? '+' : '−'}{dinero(m.monto)}
                                </span>
                                {m.manual && !m.anulado && (
                                    <CanAccess permission="caja.movimientos">
                                        <button type="button" onClick={() => setAnulando(m)}
                                            className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">Anular</button>
                                    </CanAccess>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Por forma de pago y por empleado */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 font-semibold text-gray-800">Por forma de pago</h2>
                        <dl className="space-y-2 text-sm">
                            {resumen.por_metodo.map(m => (
                                <div key={m.metodo_pago_id} className="flex justify-between">
                                    <dt className="text-gray-600">{m.nombre}</dt>
                                    <dd className="font-medium text-gray-800">{dinero(m.neto)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 font-semibold text-gray-800">Ventas por empleado</h2>
                        {resumen.ventas_por_usuario.length === 0
                            ? <p className="text-sm text-gray-500">Sin ventas todavía</p>
                            : (
                                <dl className="space-y-2 text-sm">
                                    {resumen.ventas_por_usuario.map(v => (
                                        <div key={v.usuario_id} className="flex justify-between">
                                            <dt className="text-gray-600">{v.usuario} <span className="text-gray-400">({v.cantidad})</span></dt>
                                            <dd className="font-medium text-gray-800">{dinero(v.total)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                    </div>

                    <PorComprar productos={resumen.por_comprar ?? []} />
                    <ConsumoTurno consumo={resumen.consumo ?? []} />

                    {detalle.arqueos.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-3 font-semibold text-gray-800">Arqueos</h2>
                            <ul className="space-y-2 text-sm">
                                {detalle.arqueos.map(a => (
                                    <li key={a.id} className="flex justify-between gap-2">
                                        <span className="text-gray-600">{a.fecha.slice(11)} · {a.usuario}</span>
                                        <span className="text-right">
                                            <span className="font-medium text-gray-800">{dinero(a.total_contado)}</span>
                                            {a.diferencia !== null && a.diferencia !== 0 && (
                                                <span className={`block text-xs ${a.diferencia < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                                    {a.diferencia < 0 ? 'Faltaban' : 'Sobraban'} {dinero(Math.abs(a.diferencia))}
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
