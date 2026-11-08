import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ProveedorFormModal from '../../components/compras/ProveedorFormModal';
import { inputClass } from '../../components/form/FormField';
import { useAuth } from '../../context/AuthContext';
import { getProveedores } from '../../services/compras';
import { dinero, mensajeError } from '../../utils/formato';
import { ProveedorInterface } from '../../types/compras';
import { FilaCargando } from '../../components/ui/loading/Cargando';

export default function Proveedores() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [buscar, setBuscar] = useState('');
    const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos');
    const [proveedores, setProveedores] = useState<ProveedorInterface[] | null>(null);
    const [nuevo, setNuevo] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            getProveedores({ buscar, estado })
                .then(setProveedores)
                .catch(e => toast.error(mensajeError(e, 'Error al cargar los proveedores')));
        }, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [buscar, estado]);

    return (
        <div className="p-6">
            <ProveedorFormModal isOpen={nuevo} onClose={() => setNuevo(false)} onSaved={p => { setNuevo(false); navigate(`/compras/proveedores/${p.id}`); }} />

            <PageHeader title="Proveedores" subtitle="Datos de contacto, plazo de crédito y lo que se les debe"
                actions={hasPermission('proveedores.gestionar') && (
                    <button type="button" onClick={() => setNuevo(true)}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nuevo proveedor</button>
                )} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input className={`${inputClass} max-w-sm`} placeholder="Buscar por nombre, NIT o contacto" value={buscar} onChange={e => setBuscar(e.target.value)} />
                <select className={`${inputClass} !w-auto`} value={estado} onChange={e => setEstado(e.target.value as typeof estado)}>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Inactivos</option>
                    <option value="todos">Todos</option>
                </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Proveedor</th>
                            <th className="px-4 py-3">Contacto</th>
                            <th className="px-4 py-3 text-right">Plazo</th>
                            <th className="px-4 py-3 text-right">Por pagar</th>
                            <th className="px-4 py-3 text-right">Vencido</th>
                            <th className="px-4 py-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!proveedores && <FilaCargando colSpan={6} />}
                        {proveedores?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay proveedores</td></tr>}
                        {proveedores?.map(p => (
                            <tr key={p.id} onClick={() => navigate(`/compras/proveedores/${p.id}`)} className="cursor-pointer hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-gray-800">{p.nombre}</p>
                                    {p.nit && <p className="text-xs text-gray-500">NIT {p.nit}</p>}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{[p.contacto, p.telefono].filter(Boolean).join(' · ') || '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{p.dias_credito > 0 ? `${p.dias_credito} días` : 'Contado'}</td>
                                <td className="px-4 py-3 text-right font-semibold">{p.saldo > 0 ? dinero(p.saldo) : '—'}</td>
                                <td className={`px-4 py-3 text-right ${p.vencido ? 'font-semibold text-red-600' : 'text-gray-400'}`}>{p.vencido ? dinero(p.vencido) : '—'}</td>
                                <td className="px-4 py-3"><StatusBadge tone={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</StatusBadge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
