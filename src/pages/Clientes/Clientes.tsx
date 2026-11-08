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
import { FilaCargando } from '../../components/ui/loading/Cargando';

// «¿Para qué sirven?»: cuándo conviene registrar a un cliente (y cuándo no)
const USOS_CLIENTE: { titulo: string; texto: string; ejemplos: string[] }[] = [
    {
        titulo: '1. Vender fiado (a crédito)',
        texto: 'Al revés que con los proveedores: aquí el cliente te debe a ti. Con límite y días de crédito se cobra con la forma de pago Crédito, el ticket sale para la firma, la deuda queda en Cuentas por cobrar y el sistema no le deja pasar su límite.',
        ejemplos: ['Un restaurante que se lleva 200 panes diarios y paga cada viernes', 'Una oficina o escuela que pide pan y café para reuniones y paga a fin de mes', 'Un vecino de confianza que paga cada quincena'],
    },
    {
        titulo: '2. Pedidos especiales (encargos)',
        texto: 'En Pedidos especiales queda su teléfono para avisarle o confirmar, el anticipo y la fecha de entrega. En su ficha se ven todos los encargos que ha hecho.',
        ejemplos: ['Pastel de cumpleaños para el sábado con $10 de anticipo', '500 panes para una boda o un velorio'],
    },
    {
        titulo: '3. Ticket a su nombre',
        texto: 'Si una empresa pide el comprobante a su nombre, se elige al cobrar y en «Datos del receptor» sale su nombre en lugar de «Consumidor Final».',
        ejemplos: ['Refrigerio de una empresa que justifica el gasto'],
    },
    {
        titulo: '4. Saber quién compra y cuánto',
        texto: 'Su ficha muestra todas sus compras, abonos y encargos, y se puede sacar su estado de cuenta en PDF para cobrarle.',
        ejemplos: ['Cuánto compró este mes el restaurante', 'A quién darle crédito o un descuento por ser cliente fiel'],
    },
];

function AyudaClientes() {
    return (
        <div className="mb-4 space-y-3 rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
            <p>Los clientes son <b>opcionales</b>. Al que entra, compra 5 panes y se va, se le vende normal en Venta rápida sin elegir a nadie (el ticket sale como «Consumidor Final»). Registra solo a quien te sirve tenerlo guardado:</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {USOS_CLIENTE.map(u => (
                    <div key={u.titulo} className="rounded-lg border border-blue-100 bg-white px-3 py-2.5">
                        <p className="font-semibold text-gray-900">{u.titulo}</p>
                        <p className="mt-1 text-xs text-gray-700">{u.texto}</p>
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-gray-500">
                            {u.ejemplos.map(e => <li key={e}>{e}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
            <p className="text-xs"><b>En resumen:</b> registra a quien compra fiado, a quien hace encargos y a quien pide el ticket a su nombre. A los demás no hace falta.</p>
        </div>
    );
}

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
    const [verAyuda, setVerAyuda] = useState(false);

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
                    <button type="button" onClick={() => setVerAyuda(v => !v)} aria-expanded={verAyuda}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${verAyuda ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'}`}>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">?</span>
                        ¿Para qué sirven?
                    </button>
                    {hasPermission('cuentas_cobrar.gestionar') && (
                        <button type="button" onClick={() => navigate('/cuentas-cobrar')}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cuentas por cobrar</button>
                    )}
                    {hasPermission('clientes.gestionar') && (
                        <button type="button" onClick={() => setNuevo(true)}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nuevo cliente</button>
                    )}
                </>} />

            {verAyuda && <AyudaClientes />}

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
                        {loading && !datos && <FilaCargando colSpan={6} />}
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
