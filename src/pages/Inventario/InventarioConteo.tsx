import LoadingModal from '../../components/Loading/LoadingModal';
import PageHeader from '../../components/common/PageHeader';
import MoneyInput from '../../components/form/MoneyInput';
import { useConteoHook } from '../../hooks/inventario/useConteoHook';
import { CLASES_PRODUCTO, cantidad, dinero } from '../../utils/formato';

const selectClass = 'h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none';

const signo = (n: number) => (n > 0 ? '+' : '');

export default function InventarioConteo() {
    const {
        visibles, categorias, clase, setClase, categoriaId, setCategoriaId, buscar, setBuscar,
        conteos, setConteo, motivo, setMotivo, lineas, resumen, copiarSistema,
        loading, isSaving, confirmando, setConfirmando, pedirConfirmacion, guardar,
    } = useConteoHook();

    const conDiferencia = lineas.filter(l => Math.abs(l.diferencia) > 0.00001);

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando productos..." />
            <LoadingModal isOpen={isSaving} text="Registrando ajuste..." />

            {/* Confirmación */}
            {confirmando && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4">
                        <h2 className="text-lg font-semibold">Confirmar ajuste por conteo</h2>
                        <p className="text-sm text-gray-600">
                            Se ajustarán <strong>{conDiferencia.length}</strong> producto(s) a la cantidad contada.
                            Motivo: <em>{motivo}</em>
                        </p>
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Producto</th>
                                        <th className="px-3 py-2 text-right">Sistema</th>
                                        <th className="px-3 py-2 text-right">Contado</th>
                                        <th className="px-3 py-2 text-right">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conDiferencia.map(l => (
                                        <tr key={l.producto.producto_id} className="border-t border-gray-100">
                                            <td className="px-3 py-2">{l.producto.producto}</td>
                                            <td className="px-3 py-2 text-right">{cantidad(l.producto.stock_actual)}</td>
                                            <td className="px-3 py-2 text-right">{cantidad(l.contado)}</td>
                                            <td className={`px-3 py-2 text-right font-medium ${l.diferencia < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                                {signo(l.diferencia)}{cantidad(l.diferencia, l.producto.unidad)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-red-600">Faltante: {dinero(Math.abs(resumen.faltante))}</span>
                            <span className="text-green-700">Sobrante: {dinero(resumen.sobrante)}</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setConfirmando(false)} disabled={isSaving}
                                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                                Revisar
                            </button>
                            <button type="button" onClick={guardar} disabled={isSaving}
                                className="px-4 py-2 text-sm text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition disabled:opacity-50">
                                Ajustar inventario
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                <PageHeader
                    title="Conteo físico"
                    subtitle="Anota lo que contaste; solo se ajustan los productos capturados con diferencia"
                    backTo="/admin/inventario"
                />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Lista de productos */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <select value={clase} onChange={e => setClase(e.target.value)} className={selectClass}>
                                <option value="">Todas las clases</option>
                                {Object.entries(CLASES_PRODUCTO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                            </select>
                            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className={selectClass}>
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <input type="text" placeholder="Buscar..." value={buscar} onChange={e => setBuscar(e.target.value)}
                                className="h-[42px] flex-1 min-w-[180px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none" />
                            <button type="button" onClick={copiarSistema}
                                className="h-[42px] px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                title="Llena lo visible con la existencia del sistema para corregir solo lo distinto">
                                Copiar existencias
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="hidden md:grid grid-cols-12 gap-3 bg-gray-50 px-4 py-2 text-xs font-medium uppercase text-gray-500">
                                <div className="col-span-5">Producto</div>
                                <div className="col-span-2 text-right">Sistema</div>
                                <div className="col-span-3">Contado</div>
                                <div className="col-span-2 text-right">Diferencia</div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {visibles.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-gray-500">No hay productos con ese filtro</p>
                                )}
                                {visibles.map(p => {
                                    const valor = conteos[p.producto_id];
                                    const diferencia = valor !== undefined ? Number(valor) - p.stock_actual : null;
                                    return (
                                        <div key={p.producto_id}
                                            className={`grid grid-cols-12 gap-3 items-center px-4 py-2 ${valor !== undefined ? 'bg-yellow-50/50' : ''}`}>
                                            <div className="col-span-12 md:col-span-5">
                                                <div className="text-sm font-medium text-gray-800">{p.producto}</div>
                                                <div className="text-xs text-gray-500">{CLASES_PRODUCTO[p.clase]}</div>
                                            </div>
                                            <div className="col-span-4 md:col-span-2 text-right text-sm text-gray-600">
                                                {cantidad(p.stock_actual, p.unidad)}
                                            </div>
                                            <div className="col-span-5 md:col-span-3">
                                                <MoneyInput value={valor ?? ''} onChange={v => setConteo(p.producto_id, v)}
                                                    decimals={p.permite_fraccion ? 4 : 0} placeholder="—" suffix={p.unidad ?? undefined} />
                                            </div>
                                            <div className={`col-span-3 md:col-span-2 text-right text-sm font-medium ${
                                                diferencia === null || Math.abs(diferencia) < 0.00001 ? 'text-gray-400'
                                                    : diferencia < 0 ? 'text-red-600' : 'text-green-700'
                                            }`}>
                                                {diferencia === null ? '' : Math.abs(diferencia) < 0.00001 ? 'OK' : `${signo(diferencia)}${cantidad(diferencia)}`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 lg:sticky lg:top-24">
                            <h2 className="text-lg font-semibold text-gray-800">Resumen</h2>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between"><dt className="text-gray-500">Capturados</dt><dd className="font-medium">{resumen.capturados}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Con diferencia</dt><dd className="font-medium">{resumen.conDiferencia}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Faltante</dt><dd className="font-medium text-red-600">{dinero(Math.abs(resumen.faltante))}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Sobrante</dt><dd className="font-medium text-green-700">{dinero(resumen.sobrante)}</dd></div>
                            </dl>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo <span className="text-red-500">*</span></label>
                                <input type="text" value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)}
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-400 focus:outline-none" />
                            </div>
                            <button type="button" onClick={pedirConfirmacion} disabled={isSaving}
                                className="w-full py-3 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition disabled:opacity-50">
                                Revisar y ajustar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
