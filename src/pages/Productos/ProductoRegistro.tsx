import LoadingModal from "../../components/Loading/LoadingModal";
import PageHeader from "../../components/common/PageHeader";
import ProductoFormulario from "../../components/productos/ProductoFormulario";
import { useProductoRegistroHook } from "../../hooks/productos/useProductoRegistroHook";

export default function ProductoRegistro() {
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
                <PageHeader title="Nuevo Producto" subtitle="Completa la información del producto" backTo="/admin/productos/index" />

                {/* Al crear se puede fijar el precio; luego cambiarlo requiere el permiso productos.precios */}
                <ProductoFormulario
                    form={form}
                    unidades={unidades}
                    categorias={categorias}
                    previewImagen={previewImagen}
                    onChange={handleChange}
                    onImagenChange={handleImagenChange}
                    onToggleCategoria={toggleCategoria}
                    puedeEditarPrecios
                />

                {/* Botones */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                        Limpiar
                    </button>
                    <button
                        type="button"
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
