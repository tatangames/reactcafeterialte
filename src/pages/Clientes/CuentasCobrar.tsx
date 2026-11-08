import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import { inputClass } from '../../components/form/FormField';
import { getCartera } from '../../services/clientes';
import { dinero, mensajeError, fechaCorta } from '../../utils/formato';
import { CarteraResponseInterface } from '../../types/clientes';
import { FilaCargando } from '../../components/ui/loading/Cargando';

const fecha = (iso: string) => fechaCorta(iso);

const tramos = [
    { clave: 'por_vencer', texto: 'Por vencer' },
    { clave: 'd1_30', texto: '1–30 días' },
    { clave: 'd31_60', texto: '31–60 días' },
    { clave: 'd61_90', texto: '61–90 días' },
    { clave: 'mas_90', texto: 'Más de 90' },
] as const;

// Cartera: todo lo que deben los clientes, con su antigüedad
export default function CuentasCobrar() {
    const navigate = useNavigate();
    const [estado, setEstado] = useState<'pendiente' | 'vencidas' | 'pagada'>('pendiente');
    const [buscar, setBuscar] = useState('');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<CarteraResponseInterface | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            getCartera({ estado, buscar, page: pagina })
                .then(setDatos)
                .catch(e => toast.error(mensajeError(e, 'Error al cargar la cartera')));
        }, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [estado, buscar, pagina]);

    return (
        <div className="p-6">
            <PageHeader title="Cuentas por cobrar" subtitle="Ventas al crédito pendientes de pago" backTo="/clientes" />

            {datos && (
                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs text-gray-500">Total por cobrar</p>
                        <p className="text-2xl font-semibold">{dinero(datos.resumen.total)}</p>
                        <p className="text-sm text-gray-500">{datos.resumen.clientes} cliente(s)</p>
                    </div>
                    {tramos.map(t => (
                        <div key={t.clave} className={`rounded-xl border p-4 ${t.clave !== 'por_vencer' && datos.resumen.antiguedad[t.clave] > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                            <p className="text-xs text-gray-500">{t.texto}</p>
                            <p className="text-xl font-semibold">{dinero(datos.resumen.antiguedad[t.clave])}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input className={`${inputClass} max-w-sm`} placeholder="Buscar cliente" value={buscar}
                    onChange={e => { setBuscar(e.target.value); setPagina(1); }} />
                <div className="flex gap-2">
                    {([['pendiente', 'Pendientes'], ['vencidas', 'Vencidas'], ['pagada', 'Pagadas']] as const).map(([valor, texto]) => (
                        <button key={valor} type="button" onClick={() => { setEstado(valor); setPagina(1); }}
                            className={`h-[42px] rounded-lg px-4 text-sm font-medium ${estado === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {texto}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Venta</th><th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Vence</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!datos && <FilaCargando colSpan={7} />}
                        {datos?.cuentas.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay cuentas</td></tr>}
                        {datos?.cuentas.map(c => (
                            <tr key={c.id} onClick={() => navigate(`/clientes/${c.cliente_id}`)} className="cursor-pointer hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-gray-800">{c.cliente}</p>
                                    {c.telefono && <p className="text-xs text-gray-500">{c.telefono}</p>}
                                </td>
                                <td className="px-4 py-3">{c.venta}</td>
                                <td className="px-4 py-3">{fecha(c.fecha)}</td>
                                <td className="px-4 py-3">{fecha(c.fecha_vencimiento)}</td>
                                <td className="px-4 py-3 text-right">{dinero(c.monto)}</td>
                                <td className="px-4 py-3 text-right font-semibold">{dinero(c.saldo)}</td>
                                <td className="px-4 py-3">
                                    {c.estado === 'pagada' ? <StatusBadge tone="success">Pagada</StatusBadge>
                                        : c.vencida ? <StatusBadge tone="danger">Vencida · {c.dias_vencida} días</StatusBadge>
                                            : <StatusBadge tone="info">Al día</StatusBadge>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
