import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MotivoModal from '../../components/modal/MotivoModal';
import PagoProveedorModal from '../../components/compras/PagoProveedorModal';
import ProveedorFormModal from '../../components/compras/ProveedorFormModal';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { anularPagoProveedor, getProveedor } from '../../services/compras';
import { dinero, fechaCorta, mensajeError } from '../../utils/formato';
import { PagoProveedorInterface, ProveedorDetalleInterface } from '../../types/compras';

type Pestana = 'pendientes' | 'pagos' | 'productos';
const tarjeta = 'rounded-xl border border-gray-200 bg-white p-4';

export default function ProveedorDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { actual, refrescar } = useCaja();
    const puedePagar = hasPermission('cuentas_pagar.gestionar');

    const [datos, setDatos] = useState<ProveedorDetalleInterface | null>(null);
    const [pestana, setPestana] = useState<Pestana>('pendientes');
    const [editando, setEditando] = useState(false);
    const [pagando, setPagando] = useState<{ cuenta: number | null } | null>(null);
    const [anulando, setAnulando] = useState<PagoProveedorInterface | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        getProveedor(Number(id)).then(setDatos).catch(e => toast.error(mensajeError(e, 'No se pudo cargar el proveedor')));
    }, [id]);
    useEffect(() => { cargar(); }, [cargar]);

    const anular = async (motivo: string) => {
        if (!anulando) return;
        setGuardando(true);
        try {
            const res = await anularPagoProveedor(anulando.id, motivo);
            toast.success(res.message);
            setAnulando(null);
            cargar();
            refrescar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular el pago'));
        } finally {
            setGuardando(false);
        }
    };

    if (!datos) return <div className="p-6 text-gray-500">Cargando...</div>;
    const { proveedor, resumen } = datos;

    return (
        <div className="p-6">
            <ProveedorFormModal isOpen={editando} proveedor={proveedor} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); cargar(); }} />
            <PagoProveedorModal proveedor={pagando ? proveedor : null} pendientes={datos.pendientes} cuentaInicial={pagando?.cuenta}
                onClose={() => setPagando(null)} onSaved={() => { setPagando(null); cargar(); }} />
            <MotivoModal isOpen={!!anulando} titulo={`Anular pago ${anulando?.numero ?? ''}`}
                descripcion={anulando?.origen === 'caja' ? 'El dinero vuelve a la caja del turno y las compras quedan otra vez pendientes.' : 'Las compras quedan otra vez pendientes.'}
                textoConfirmar="Anular pago" isLoading={guardando} onClose={() => setAnulando(null)} onConfirm={anular} />

            <PageHeader title={proveedor.nombre} backTo="/compras/proveedores"
                subtitle={[proveedor.nit && `NIT ${proveedor.nit}`, proveedor.contacto, proveedor.telefono, proveedor.correo].filter(Boolean).join(' · ') || undefined}
                actions={<>
                    {!proveedor.activo && <StatusBadge tone="neutral">Inactivo</StatusBadge>}
                    {hasPermission('proveedores.gestionar') && (
                        <button type="button" onClick={() => setEditando(true)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Editar</button>
                    )}
                    {hasPermission('compras.gestionar') && (
                        <button type="button" onClick={() => navigate(`/compras/nueva?proveedor=${proveedor.id}`)}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Registrar compra</button>
                    )}
                    {puedePagar && proveedor.saldo > 0 && (
                        <button type="button" onClick={() => setPagando({ cuenta: null })}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">Registrar pago</button>
                    )}
                </>} />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Por pagar</p>
                    <p className="text-2xl font-semibold">{dinero(proveedor.saldo)}</p>
                    {resumen.vencido > 0 && <p className="text-sm font-medium text-red-600">{dinero(resumen.vencido)} vencido</p>}
                </div>
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Plazo</p>
                    <p className="text-2xl font-semibold">{proveedor.dias_credito > 0 ? `${proveedor.dias_credito} días` : 'Contado'}</p>
                </div>
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Compras</p>
                    <p className="text-2xl font-semibold">{resumen.compras}</p>
                    <p className="text-sm text-gray-500">{dinero(resumen.total_comprado)} en total</p>
                </div>
                <div className={tarjeta}>
                    <p className="text-xs text-gray-500">Última compra</p>
                    <p className="text-lg font-semibold">{fechaCorta(resumen.ultima_compra)}</p>
                    <button type="button" onClick={() => navigate(`/compras?proveedor=${proveedor.id}`)} className="text-sm text-blue-600 hover:underline">Ver compras</button>
                </div>
            </div>
            {proveedor.notas && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{proveedor.notas}</p>}

            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
                {([['pendientes', `Por pagar (${datos.pendientes.length})`], ['pagos', 'Pagos'], ['productos', 'Productos que vende']] as const).map(([clave, texto]) => (
                    <button key={clave} type="button" onClick={() => setPestana(clave)}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${pestana === clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {texto}
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                {pestana === 'pendientes' && (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Compra</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Vence</th>
                                <th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Estado</th><th></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {datos.pendientes.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No se le debe nada</td></tr>}
                            {datos.pendientes.map(c => (
                                <tr key={c.id}>
                                    <td className="px-4 py-3 font-medium">{c.compra}</td>
                                    <td className="px-4 py-3">{c.documento ?? '—'}</td>
                                    <td className="px-4 py-3">{fechaCorta(c.fecha)}</td>
                                    <td className="px-4 py-3">{fechaCorta(c.fecha_vencimiento)}</td>
                                    <td className="px-4 py-3 text-right">{dinero(c.monto)}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{dinero(c.saldo)}</td>
                                    <td className="px-4 py-3">{c.vencida ? <StatusBadge tone="danger">Vencida · {c.dias_vencida} días</StatusBadge> : <StatusBadge tone="info">Al día</StatusBadge>}</td>
                                    <td className="px-4 py-3 text-right">
                                        {puedePagar && <button type="button" onClick={() => setPagando({ cuenta: c.id })} className="text-sm font-medium text-green-700 hover:underline">Pagar</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {pestana === 'pagos' && (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Pago</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Forma</th><th className="px-4 py-3">Compras</th>
                                <th className="px-4 py-3 text-right">Monto</th><th></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {datos.pagos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin pagos</td></tr>}
                            {datos.pagos.map(p => (
                                <tr key={p.id} className={p.anulado ? 'text-gray-400' : ''}>
                                    <td className="px-4 py-3 font-medium">{p.numero}</td>
                                    <td className="px-4 py-3">{fechaCorta(p.fecha)}</td>
                                    <td className="px-4 py-3">{p.metodo} · {p.origen === 'caja' ? `caja (turno #${p.turno_id})` : 'fuera de caja'}{p.referencia ? ` · ${p.referencia}` : ''}</td>
                                    <td className="px-4 py-3">{p.compras.join(', ')}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${p.anulado ? 'line-through' : ''}`}>{dinero(p.monto)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {p.anulado
                                            ? <span title={p.motivo_anulacion ?? ''}><StatusBadge tone="danger">Anulado</StatusBadge></span>
                                            : puedePagar && (p.origen === 'externo' || p.turno_id === actual?.turno?.id) && (
                                                <button type="button" onClick={() => setAnulando(p)} className="text-sm font-medium text-red-600 hover:underline">Anular</button>
                                            )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {pestana === 'productos' && (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Última compra</th><th className="px-4 py-3 text-right">Total comprado</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {datos.productos.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Aún no hay compras</td></tr>}
                            {datos.productos.map(p => (
                                <tr key={p.producto_id}>
                                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                                    <td className="px-4 py-3">{fechaCorta(p.ultima)}</td>
                                    <td className="px-4 py-3 text-right">{dinero(p.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
