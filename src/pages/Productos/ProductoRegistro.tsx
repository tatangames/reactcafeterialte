import { useNavigate } from "react-router-dom";

import LoadingModal from "../../components/Loading/LoadingModal";
import { useProductoRegistroHook } from "../../hooks/productos/useProductoRegistroHook";

export default function ProductoRegistro() {
    const navigate = useNavigate();
    const {
        form,
        unidades,
        categorias,
        previewImagen,
        loading,
        isSaving,
        handleChange,
        handleImagenChange,
        toggleCategoria,
        handleSubmit,
        resetForm,
    } = useProductoRegistroHook();

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando catálogos..." />

            <div className="p-6">
                {/* Encabezado */}
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => navigate("/admin/productos/index")}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Nuevo Producto</h1>
                        <p className="text-sm text-gray-500">Completa la información del producto</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna izquierda: datos principales */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Información general</h2>

                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={(e) => handleChange("nombre", e.target.value)}
                                    maxLength={300}
                                    placeholder="Nombre del producto"
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                />
                            </div>

                            {/* SKU */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SKU <span className="text-gray-400 text-xs">(opcional, se genera automáticamente)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.sku}
                                    onChange={(e) => handleChange("sku", e.target.value)}
                                    maxLength={100}
                                    placeholder="PRD-001"
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                />
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={(e) => handleChange("descripcion", e.target.value)}
                                    rows={3}
                                    placeholder="Descripción del producto"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition resize-none"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Detalles y costos</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Tipo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.tipo}
                                        onChange={(e) => handleChange("tipo", e.target.value)}
                                        className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition bg-white"
                                    >
                                        <option value="bien">Bien</option>
                                        <option value="servicio">Servicio</option>
                                        <option value="bien_servicio">Bien y Servicio</option>
                                    </select>
                                </div>

                                {/* Unidad de medida */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unidad de medida <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.unidad_medida_id}
                                        onChange={(e) => handleChange("unidad_medida_id", e.target.value)}
                                        className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition bg-white"
                                    >
                                        <option value="">Selecciona...</option>
                                        {unidades.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Costo unitario */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Costo unitario <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.costo_unitario}
                                        onChange={(e) => handleChange("costo_unitario", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Categorías */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Categorías</h2>
                            {categorias.length === 0 ? (
                                <p className="text-sm text-gray-500">No hay categorías activas disponibles</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {categorias.map((c) => {
                                        const selected = form.categorias.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => toggleCategoria(c.id)}
                                                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                                                    selected
                                                        ? "bg-blue-600 text-white border-blue-600"
                                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                {c.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna derecha: imagen */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Imagen</h2>

                            <div className="aspect-square w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                                {previewImagen ? (
                                    <img
                                        src={previewImagen}
                                        alt="Vista previa"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">Sin imagen</span>
                                )}
                            </div>

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) =>
                                    handleImagenChange(e.target.files?.[0] || null)
                                }
                                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition"
                            />
                            {form.imagen && (
                                <button
                                    type="button"
                                    onClick={() => handleImagenChange(null)}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    Quitar imagen
                                </button>
                            )}
                            <p className="text-xs text-gray-400">JPG o PNG, máx. 5MB</p>
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        onClick={resetForm}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                    >
                        {isSaving ? "Guardando..." : "Guardar Producto"}
                    </button>
                </div>
            </div>
        </>
    );
}