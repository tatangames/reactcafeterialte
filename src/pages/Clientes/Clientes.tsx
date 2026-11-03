import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import ClienteFormModal from '../../components/clientes/ClienteFormModal';
import { inputClass } from '../../components/form/FormField';
import { useAuth } from '../../context/AuthContext';
import { getClientes } from '../../services/clientes';
import { dinero, mensajeError } from '../../utils/formato';
import { ClientesResponseInterface } from '../../types/clientes';

export default function Clientes() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [buscar, setBuscar] = useState('');
    const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos');
    const [conSaldo, setConSaldo] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<ClientesResponseInterface | null>(null);
    const [loading, setLoading] = useState(true);
    const [nuevo, setNuevo] = useState(false);

    useEffect(() => {
        setLoading(true);
        const t = setTimeout(() => {
            getClientes({ buscar, estado, con_saldo: conSaldo, page: pagina })
                .then(setDatos)
                .catch(e => toast.error(mensajeError(e, 'Error al cargar los clientes')))
                .finally(() => setLoading(false));
        }, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [buscar, estado, conSaldo, pagina]);

    return (
        <div className="p-6">
            <ClienteFormModal isOpen={nuevo} onClose={() => setNuevo(false)}
                onSaved={c => { setNuevo(false); navigate(`/clientes/${c.id}`); }} />

            <PageHeader title="Clientes" subtitle="Datos, crédito y saldo de cada cliente"
                actions={<>
                    {hasPermission('cuentas_cobrar.gestionar') && (
                        <button type="button" onClick={() => navigate('/cuentas-cobrar')}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cuentas por cobrar</button>
                    )}
                    {hasPermission('clientes.gestionar') && (
                        <button type="button" onClick={() => setNuevo(true)}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nuevo cliente</button>
                    )}
                </>} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input className={`${inputClass} max-w-sm`} placeholder="Buscar por nombre, DUI/NIT o teléfono" value={buscar}
                    onChange={e => { setBuscar(e.target.value); setPagina(1); }} />
                <select className={`${inputClass} !w-auto`} value={estado} onChange={e => { setEstado(e.target.value as typeof estado); setPagina(1); }}>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Inactivos</option>
                    <option value="todos">Todos</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={conSaldo} onChange={e => { setConSaldo(e.target.checked); setPagina(1); }} className="h-4 w-4" />
                    Solo con saldo pendiente
                </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Teléfono</th>
                            <th className="px-4 py-3 text-right">Límite</th>
                            <th className="px-4 py-3 text-right">Saldo</th>
                            <th className="px-4 py-3 text-right">Vencido</th>
                            <th className="px-4 py-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && !datos && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>}
                        {datos?.clientes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay clientes</td></tr>}
                        {datos?.clientes.map(c => (
                            <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)} className="cursor-pointer hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-gray-800">{c.nombre}</p>
                                    {c.documento && <p className="text-xs text-gray-500">{c.documento}</p>}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{c.telefono ?? '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{c.limite_credito > 0 ? dinero(c.limite_credito) : 'Sin crédito'}</td>
                                <td className="px-4 py-3 text-right font-semibold">{c.saldo > 0 ? dinero(c.saldo) : '—'}</td>
                                <td className={`px-4 py-3 text-right ${c.vencido ? 'font-semibold text-red-600' : 'text-gray-400'}`}>{c.vencido ? dinero(c.vencido) : '—'}</td>
                                <td className="px-4 py-3"><StatusBadge tone={c.activo ? 'success' : 'neutral'}>{c.activo ? 'Activo' : 'Inactivo'}</StatusBadge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
