import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import FormField, { inputClass } from '../../../components/form/FormField';
import { useCaja } from '../../../context/CajaContext';
import { getImpresorasTable } from '../../../services/api';
import { getCajasConfig, getMetodosPagoConfig, guardarCaja, guardarMetodoPago } from '../../../services/caja';
import { getToken } from '../../../utils/auth';
import { mensajeError } from '../../../utils/formato';
import { CajaInterface, MetodoPagoInterface, TipoMetodoPago } from '../../../types/caja';
import Cargando from '../../../components/ui/loading/Cargando';

const TIPOS_METODO: Record<TipoMetodoPago, string> = {
    efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', credito: 'Crédito', otro: 'Otro',
};

type CajaForm = { id?: number; nombre: string; impresora_id: string; activo: boolean };
type MetodoForm = Omit<MetodoPagoInterface, 'id'> & { id?: number };

const metodoVacio: MetodoForm = { nombre: '', tipo: 'otro', afecta_efectivo: false, requiere_referencia: false, orden: 0, activo: true };

function Modal({ titulo, children, onClose, onSave, guardando }: {
    titulo: string; children: React.ReactNode; onClose: () => void; onSave: () => void; guardando: boolean;
}) {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                <h2 className="text-lg font-semibold">{titulo}</h2>
                {children}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button type="button" onClick={onSave} disabled={guardando} className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CajasConfig() {
    const { refrescar } = useCaja();
    const [cajas, setCajas] = useState<CajaInterface[]>([]);
    const [cargado, setCargado] = useState(false);
    const [metodos, setMetodos] = useState<MetodoPagoInterface[]>([]);
    const [impresoras, setImpresoras] = useState<{ id: number; alias: string }[]>([]);
    const [cajaForm, setCajaForm] = useState<CajaForm | null>(null);
    const [metodoForm, setMetodoForm] = useState<MetodoForm | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = () => {
        getCajasConfig().then(setCajas).catch(() => toast.error('Error al cargar cajas'));
        getMetodosPagoConfig().then(setMetodos).catch(() => toast.error('Error al cargar métodos de pago')).finally(() => setCargado(true));
    };

    useEffect(() => {
        cargar();
        getImpresorasTable(getToken() ?? '').then(res => setImpresoras(res.data ?? [])).catch(() => setImpresoras([]));
    }, []);

    const guardar = async (accion: () => Promise<{ message: string }>, cerrar: () => void) => {
        setGuardando(true);
        try {
            const res = await accion();
            toast.success(res.message);
            cerrar();
            cargar();
            refrescar();
        } catch (error) {
            toast.error(mensajeError(error, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            {cajaForm && (
                <Modal titulo={cajaForm.id ? 'Editar caja' : 'Nueva caja'} guardando={guardando} onClose={() => setCajaForm(null)}
                    onSave={() => guardar(() => guardarCaja({
                        nombre: cajaForm.nombre.trim(),
                        impresora_id: cajaForm.impresora_id ? Number(cajaForm.impresora_id) : null,
                        activo: cajaForm.activo,
                    }, cajaForm.id), () => setCajaForm(null))}>
                    <FormField label="Nombre" required>
                        <input type="text" value={cajaForm.nombre} maxLength={100} autoFocus placeholder="Ej. Caja mostrador"
                            onChange={e => setCajaForm({ ...cajaForm, nombre: e.target.value })} className={inputClass} />
                    </FormField>
                    {impresoras.length > 0 && (
                        <FormField label="Impresora de tickets">
                            <select value={cajaForm.impresora_id} onChange={e => setCajaForm({ ...cajaForm, impresora_id: e.target.value })} className={inputClass}>
                                <option value="">Sin impresora</option>
                                {impresoras.map(i => <option key={i.id} value={i.id}>{i.alias}</option>)}
                            </select>
                        </FormField>
                    )}
                    {cajaForm.id && (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={cajaForm.activo} onChange={e => setCajaForm({ ...cajaForm, activo: e.target.checked })} className="h-4 w-4 accent-green-600" />
                            Activa
                        </label>
                    )}
                </Modal>
            )}

            {metodoForm && (
                <Modal titulo={metodoForm.id ? 'Editar método de pago' : 'Nuevo método de pago'} guardando={guardando} onClose={() => setMetodoForm(null)}
                    onSave={() => {
                        const { id, ...datos } = metodoForm;
                        guardar(() => guardarMetodoPago({ ...datos, nombre: datos.nombre.trim() }, id), () => setMetodoForm(null));
                    }}>
                    <FormField label="Nombre" required>
                        <input type="text" value={metodoForm.nombre} maxLength={100} autoFocus placeholder="Ej. Tarjeta crédito/débito"
                            onChange={e => setMetodoForm({ ...metodoForm, nombre: e.target.value })} className={inputClass} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Tipo" required>
                            <select value={metodoForm.tipo} className={inputClass}
                                onChange={e => {
                                    const tipo = e.target.value as TipoMetodoPago;
                                    setMetodoForm({ ...metodoForm, tipo, afecta_efectivo: tipo === 'efectivo' });
                                }}>
                                {Object.entries(TIPOS_METODO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Orden">
                            <input type="number" min={0} value={metodoForm.orden} onChange={e => setMetodoForm({ ...metodoForm, orden: Number(e.target.value) })} className={inputClass} />
                        </FormField>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={metodoForm.afecta_efectivo} onChange={e => setMetodoForm({ ...metodoForm, afecta_efectivo: e.target.checked })} className="h-4 w-4 accent-blue-600" />
                        Entra o sale dinero de la gaveta
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={metodoForm.requiere_referencia} onChange={e => setMetodoForm({ ...metodoForm, requiere_referencia: e.target.checked })} className="h-4 w-4 accent-blue-600" />
                        Pide número de referencia (voucher, transferencia)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={metodoForm.activo} onChange={e => setMetodoForm({ ...metodoForm, activo: e.target.checked })} className="h-4 w-4 accent-green-600" />
                        Activo
                    </label>
                    {metodoForm.tipo === 'credito' && (
                        <p className="text-xs text-amber-700">El crédito a clientes funcionará con el módulo de Clientes y cuentas por cobrar.</p>
                    )}
                </Modal>
            )}

            <PageHeader title="Cajas y formas de pago" subtitle="Cajas físicas de la panadería y métodos de cobro" />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Cajas</h2>
                        <button type="button" onClick={() => setCajaForm({ nombre: '', impresora_id: '', activo: true })}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">+ Nueva caja</button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {!cargado && <Cargando />}
                        {cajas.map(c => (
                            <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{c.nombre}</p>
                                    <p className="text-xs text-gray-500">
                                        {c.turno_abierto ? `Turno abierto por ${c.turno_abierto.usuario}` : 'Sin turno abierto'}
                                        {c.impresora_id ? ` · ${impresoras.find(i => i.id === c.impresora_id)?.alias ?? 'Impresora asignada'}` : ''}
                                    </p>
                                </div>
                                <StatusBadge tone={c.activo ? 'success' : 'danger'}>{c.activo ? 'Activa' : 'Inactiva'}</StatusBadge>
                                <button type="button" onClick={() => setCajaForm({ id: c.id, nombre: c.nombre, impresora_id: c.impresora_id ? String(c.impresora_id) : '', activo: c.activo })}
                                    className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md">Editar</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Formas de pago</h2>
                        <button type="button" onClick={() => setMetodoForm({ ...metodoVacio, orden: metodos.length + 1 })}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">+ Nueva forma</button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {!cargado && <Cargando />}
                        {metodos.map(m => (
                            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{m.nombre}</p>
                                    <p className="text-xs text-gray-500">
                                        {TIPOS_METODO[m.tipo]}
                                        {m.afecta_efectivo ? ' · mueve la gaveta' : ''}
                                        {m.requiere_referencia ? ' · pide referencia' : ''}
                                    </p>
                                </div>
                                <StatusBadge tone={m.activo ? 'success' : 'neutral'}>{m.activo ? 'Activo' : 'Inactivo'}</StatusBadge>
                                <button type="button" onClick={() => setMetodoForm({ ...m })}
                                    className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md">Editar</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
