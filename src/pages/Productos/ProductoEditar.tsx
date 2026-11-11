import { useNavigate } from "react-router-dom";

import LoadingModal from "../../components/Loading/LoadingModal";
import PageHeader from "../../components/common/PageHeader";
import ProductoFormulario from "../../components/productos/ProductoFormulario";
import ProductoModificadores from "../../components/productos/ProductoModificadores";
import { useAuth } from "../../context/AuthContext";
import { useProductoEditarHook } from "../../hooks/productos/useProductoEditarHook";

export default function ProductoEditar() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const {
        productoId,
        form,
        unidades,
        categorias,
        previewImagen,
        activo,
        setActivo,
        stockActual,
        loading,
        isSaving,
        handleChange,
        handleImagenChange,
        toggleCategoria,
        handleSubmit,
    } = useProductoEditarHook();

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando producto..." />

            <div className="p-6">
                <PageHeader title="Editar Producto" subtitle="Modifica la información del producto" backTo="/admin/productos/index" />

                <ProductoFormulario
                    form={form}
                    unidades={unidades}
                    categorias={categorias}
                    previewImagen={previewImagen}
                    onChange={handleChange}
                    onImagenChange={handleImagenChange}
                    onToggleCategoria={toggleCategoria}
                    puedeEditarPrecios={hasPermission("productos.precios")}
                    productoId={productoId}
                    stockActual={stockActual}
                    ayudaImagen="JPG o PNG, máx. 5MB. Deja vacío para conservar la imagen actual."
                    extraGeneral={
                        <label className="flex items-center gap-2 pt-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                                className="h-4 w-4 accent-green-600"
                            />
                            Producto activo
                        </label>
                    }
                />

                {/* Bloques de modificadores (Tipo de leche, Salsa...): se guardan al momento, aparte del producto */}
                {productoId && hasPermission("mesas.configurar") && (
                    <div className="mt-6">
                        <ProductoModificadores productoId={Number(productoId)} nombre={form.nombre} />
                    </div>
                )}

                {/* Botones */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/productos/index")}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                    >
                        {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </>
    );
}
