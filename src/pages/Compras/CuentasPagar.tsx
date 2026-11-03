import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import { getCuentasPagar, getPagosProveedor } from '../../services/compras';
import { dinero, fechaCorta, mensajeError } from '../../utils/formato';
import { CuentasPagarResponseInterface, PagoProveedorInterface } from '../../types/compras';
import { PaginaInterface } from '../../types/interfaces';

type Vista = 'pendiente' | 'vencidas' | 'pagada' | 'pagos';

// Lo que se les debe a los proveedores y los pagos realizados
export default function CuentasPagar() {
    const navigate = useNavigate();
    const [vista, setVista] = useState<Vista>('pendiente');
    const [pagina, setPagina] = useState(1);
    const [cuentas, setCuentas] = useState<CuentasPagarResponseInterface | null>(null);
    const [pagos, setPagos] = useState<(PaginaInterface & { pagos: PagoProveedorInterface[] }) | null>(null);

    useEffect(() => {
        if (vista === 'pagos') {
            getPagosProveedor({ page: pagina }).then(setPagos).catch(e => toast.error(mensajeError(e, 'Error al cargar los pagos')));
        } else {
            getCuentasPagar({ estado: vista, page: pagina }).then(setCuentas).catch(e => toast.error(mensajeError(e, 'Error al cargar las cuentas')));
        }
    }, [vista, pagina]);

    const resumen = cuentas?.resumen;

    return (
        <div className="p-6">
            <PageHeader title="Cuentas por pagar" subtitle="Compras al crédito pendientes de pago" backTo="/compras/proveedores" />

            {resumen && (
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Total por pagar</p><p className="text-2xl font-semibold">{dinero(resumen.total)}</p><p className="text-sm text-gray-500">{resumen.proveedores} proveedor(es)</p></div>
                    <div className={`rounded-xl border p-4 ${resumen.vencido > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}><p className="text-xs text-gray-500">Vencido</p><p className="text-2xl font-semibold">{dinero(resumen.vencido)}</p></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Vence en 7 días</p><p className="text-2xl font-semibold">{dinero(resumen.proxima_semana)}</p></div>
                </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
                {([['pendiente', 'Pendientes'], ['vencidas', 'Vencidas'], ['pagada', 'Pagadas'], ['pagos', 'Pagos realizados']] as const).map(([v, t]) => (
                    <button key={v} type="button" onClick={() => { setVista(v); setPagina(1); }}
                        className={`h-[42px] rounded-lg px-4 text-sm font-medium ${vista === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t}</button>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                {vista === 'pagos' ? (
                    <>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="px-4 py-3">Pago</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Forma</th>
                                    <th className="px-4 py-3">Compras</th><th className="px-4 py-3 text-right">Monto</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pagos?.pagos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin pagos</td></tr>}
                                {pagos?.pagos.map(p => (
                                    <tr key={p.id} onClick={() => navigate(`/compras/proveedores/${p.proveedor_id}`)} className={`cursor-pointer hover:bg-gray-50 ${p.anulado ? 'text-gray-400' : ''}`}>
                                        <td className="px-4 py-3 font-medium">{p.numero}{p.anulado && <span className="ml-2"><StatusBadge tone="danger">Anulado</StatusBadge></span>}</td>
                                        <td className="px-4 py-3">{fechaCorta(p.fecha)}</td>
                                        <td className="px-4 py-3">{p.proveedor}</td>
                                        <td className="px-4 py-3">{p.metodo} · {p.origen === 'caja' ? 'caja' : 'fuera de caja'}</td>
                                        <td className="px-4 py-3">{p.compras.join(', ')}</td>
                                        <td className={`px-4 py-3 text-right font-semibold ${p.anulado ? 'line-through' : ''}`}>{dinero(p.monto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {pagos && <Paginacion pagina={pagos.pagina} totalPaginas={pagos.total_paginas} total={pagos.total} onCambiar={setPagina} />}
                    </>
                ) : (
                    <>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Compra</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Vence</th>
                                    <th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Estado</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cuentas?.cuentas.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay cuentas</td></tr>}
                                {cuentas?.cuentas.map(c => (
                                    <tr key={c.id} onClick={() => navigate(`/compras/proveedores/${c.proveedor_id}`)} className="cursor-pointer hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{c.proveedor}</td>
                                        <td className="px-4 py-3">{c.compra}</td>
                                        <td className="px-4 py-3">{c.documento ?? '—'}</td>
                                        <td className="px-4 py-3">{fechaCorta(c.fecha_vencimiento)}</td>
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
                        {cuentas && <Paginacion pagina={cuentas.pagina} totalPaginas={cuentas.total_paginas} total={cuentas.total} onCambiar={setPagina} />}
                    </>
                )}
            </div>
        </div>
    );
}
