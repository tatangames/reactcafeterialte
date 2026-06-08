import { useNavigate } from 'react-router-dom';

import LoadingModal from '../../components/Loading/LoadingModal';
import { useRegistrarEntradaHook } from '../../hooks/inventario/useRegistrarEntradaHook';

const tipoColors: Record<string, string> = {
    entrada:    'bg-green-600',
    salida:     'bg-red-600',
    ajuste:     'bg-yellow-500',
    produccion: 'bg-blue-600',
};

export default function InventarioNuevoRegistro() {
    const navigate = useNavigate();
    const {
        form,
        productos,
        loadingProductos,
        isSaving,
        handleChange,
        agregarItem,
        eliminarItem,
        handleItemChange,
        handleSubmit,
    } = useRegistrarEntradaHook();

    return (
        <>
            <LoadingModal isOpen={loadingProductos} text="Cargando productos..." />

            <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/inventario/entradas')}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Nuevo registro de inventario</h1>
                        <p className="text-sm text-gray-500">Registra entrada, salida o ajuste de stock</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cabecera */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Información general</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.fecha}
                                    onChange={e => handleChange('fecha', e.target.value)}
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['entrada', 'salida', 'ajuste', 'produccion'] as const).map(tipo => (
                                        <button
                                            key={tipo}
                                            type="button"
                                            onClick={() => handleChange('tipo', tipo)}
                                            className={`py-2 text-sm font-medium rounded-lg border transition capitalize ${
                                                form.tipo === tipo
                                                    ? `${tipoColors[tipo]} text-white border-transparent`
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {tipo === 'produccion' ? 'Producción' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                {form.tipo === 'ajuste' && (
                                    <p className="text-xs text-yellow-600 mt-2">
                                        En ajuste la cantidad es el nuevo stock absoluto del producto.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={e => handleChange('descripcion', e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="Ej: Compra semanal de insumos, merma por vencimiento..."
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
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                                <div className="col-span-7">Producto</div>
                                <div className="col-span-3">Cantidad</div>
                                <div className="col-span-2"></div>
                            </div>

                            {/* Líneas */}
                            <div className="space-y-2">
                                {form.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-7">
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
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="number"
                                                step="0.0001"
                                                min="0.0001"
                                                value={item.cantidad}
                                                onChange={e => handleItemChange(index, 'cantidad', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full h-[42px] rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                            />
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            {form.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarItem(index)}
                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
                        onClick={() => navigate('/admin/inventario/entradas')}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
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