import { useNavigate } from 'react-router-dom';
import FechaInput from "../../components/form/FechaInput";

import LoadingModal from '../../components/Loading/LoadingModal';
import PageHeader from '../../components/common/PageHeader';
import MoneyInput from '../../components/form/MoneyInput';
import { tipoConCosto, useRegistrarEntradaHook } from '../../hooks/inventario/useRegistrarEntradaHook';
import { cantidad, dinero, hoyLocal, TIPOS_MOVIMIENTO } from '../../utils/formato';

const tipoColors: Record<string, string> = {
    entrada:    'bg-green-600',
    salida:     'bg-red-600',
    ajuste:     'bg-yellow-500',
    produccion: 'bg-blue-600',
};

const tipoAyuda: Record<string, string> = {
    entrada:    'Suma al stock. Si indicas el costo, se recalcula el costo promedio del producto.',
    salida:     'Resta del stock (consumo interno, regalías...). Las mermas tendrán su propio registro.',
    ajuste:     'La cantidad es lo que contaste: el stock queda exactamente en ese valor.',
    produccion: 'Suma producto terminado. El descuento automático de materias primas llega con Recetas.',
};

export default function InventarioNuevoRegistro() {
    const navigate = useNavigate();
    const {
        form,
        productos,
        tiposPermitidos,
        productoDe,
        loadingProductos,
        isSaving,
        handleChange,
        agregarItem,
        eliminarItem,
        handleItemChange,
        handleSubmit,
    } = useRegistrarEntradaHook();

    const conCosto = tipoConCosto(form.tipo);

    return (
        <>
            <LoadingModal isOpen={loadingProductos} text="Cargando productos..." />

            <div className="p-6">
                <PageHeader
                    title="Nuevo registro de inventario"
                    subtitle="Registra entrada, salida, ajuste o producción"
                    backTo="/admin/inventario/entradas"
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cabecera */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Información general</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha <span className="text-red-500">*</span>
                                </label>
                                <FechaInput
                                    value={form.fecha}
                                    max={hoyLocal()}
                                    onChange={v => handleChange('fecha', v)}
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {tiposPermitidos.map(tipo => (
                                        <button
                                            key={tipo}
                                            type="button"
                                            onClick={() => handleChange('tipo', tipo)}
                                            className={`py-2.5 text-sm font-medium rounded-lg border transition ${
                                                form.tipo === tipo
                                                    ? `${tipoColors[tipo]} text-white border-transparent`
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {TIPOS_MOVIMIENTO[tipo]}
                                        </button>
                                    ))}
                                </div>
                                <p className={`text-xs mt-2 ${form.tipo === 'ajuste' ? 'text-yellow-700' : 'text-gray-500'}`}>
                                    {tipoAyuda[form.tipo]}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {form.tipo === 'ajuste' ? 'Motivo del ajuste' : 'Descripción'}
                                    {form.tipo === 'ajuste' && <span className="text-red-500"> *</span>}
                                </label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={e => handleChange('descripcion', e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder={form.tipo === 'ajuste'
                                        ? 'Ej: Conteo físico de fin de mes'
                                        : 'Ej: Compra semanal de insumos'}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Desglose */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-800">Desglose de productos</h2>
                                <button
                                    type="button"
                                    onClick={agregarItem}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                >
                                    + Agregar línea
                                </button>
                            </div>

                            {/* Encabezado tabla */}
                            <div className="hidden xl:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                                <div className={conCosto ? 'col-span-6' : 'col-span-8'}>Producto</div>
                                <div className="col-span-3">{form.tipo === 'ajuste' ? 'Cantidad contada' : 'Cantidad'}</div>
                                {conCosto && <div className="col-span-2">Costo unit.</div>}
                                <div className="col-span-1"></div>
                            </div>

                            {/* Líneas */}
                            <div className="space-y-3">
                                {form.items.map((item, index) => {
                                    const producto = productoDe(item.producto_id);
                                    return (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-start">
                                            <div className={conCosto ? 'col-span-12 xl:col-span-6' : 'col-span-12 xl:col-span-8'}>
                                                <select
                                                    value={item.producto_id}
                                                    onChange={e => handleItemChange(index, 'producto_id', e.target.value)}
                                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition bg-white"
                                                >
                                                    <option value="">Selecciona...</option>
                                                    {productos.map(p => (
                                                        <option key={p.producto_id} value={p.producto_id}>
                                                            {p.producto}{p.sku ? ` (${p.sku})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {producto && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Existencia: {cantidad(producto.stock_actual, producto.unidad)}
                                                        {' · '}Costo promedio: {dinero(producto.costo_unitario, '$', 4)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-span-5 xl:col-span-3">
                                                <MoneyInput
                                                    value={item.cantidad}
                                                    decimals={producto && !producto.permite_fraccion ? 0 : 4}
                                                    suffix={producto?.unidad ?? undefined}
                                                    placeholder="0"
                                                    onChange={v => handleItemChange(index, 'cantidad', v)}
                                                />
                                            </div>
                                            {conCosto && (
                                                <div className="col-span-5 xl:col-span-2">
                                                    <MoneyInput
                                                        value={item.costo_unitario}
                                                        decimals={4}
                                                        prefix="$"
                                                        placeholder="Opcional"
                                                        onChange={v => handleItemChange(index, 'costo_unitario', v)}
                                                    />
                                                </div>
                                            )}
                                            <div className="col-span-2 xl:col-span-1 flex justify-center">
                                                {form.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminarItem(index)}
                                                        className="h-[42px] w-[42px] text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                        aria-label="Quitar línea"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-xs text-gray-400">
                                {form.items.length} producto(s) en el desglose
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/inventario/entradas')}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${tipoColors[form.tipo]}`}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar registro'}
                    </button>
                </div>
            </div>
        </>
    );
}
