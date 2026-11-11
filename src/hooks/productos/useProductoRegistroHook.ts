import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import {
    registrarProducto,
    getUnidadMedidaTable,
    getCategoriasTable,
} from "../../services/api";
import { BloqueGuardar, guardarModificadoresProducto } from "../../services/mesas";
import { getToken } from "../../utils/auth";
import {
    UnidadMedidaInterface,
    CategoriasInterface,
    ProductoFormInterface,
} from "../../types/interfaces";
import { llevaModificadores, productoFormData, productoFormInicial, validarProducto } from "../../utils/productoForm";
import { mensajeError } from "../../utils/formato";

export function useProductoRegistroHook() {
    const navigate = useNavigate();

    const [form, setForm] = useState<ProductoFormInterface>(productoFormInicial);
    const [unidades, setUnidades] = useState<UnidadMedidaInterface[]>([]);
    const [categorias, setCategorias] = useState<CategoriasInterface[]>([]);
    const [previewImagen, setPreviewImagen] = useState<string | null>(null);
    // Bloques de modificadores armados antes de guardar: se guardan en cuanto el producto existe
    const [modificadores, setModificadores] = useState<BloqueGuardar[] | null>(null);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        cargarCatalogos();
    }, []);

    const cargarCatalogos = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const [resUnidades, resCategorias] = await Promise.all([
                getUnidadMedidaTable(token),
                getCategoriasTable(token),
            ]);

            // Solo activos para los selects
            const activas = resUnidades.filter((u: UnidadMedidaInterface) => u.estado);
            setUnidades(activas);
            setCategorias(resCategorias.filter((c: CategoriasInterface) => c.estado));

            // Lo más común en una panadería es contar por unidad
            const porUnidad = activas.find((u: UnidadMedidaInterface) => u.nombre.toLowerCase() === "unidad");
            if (porUnidad) setForm((prev) => ({ ...prev, unidad_medida_id: String(porUnidad.id) }));
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar catálogos");
        } finally {
            setLoading(false);
        }
    };

    // Cambios genéricos de inputs
    const handleChange = <K extends keyof ProductoFormInterface>(field: K, value: ProductoFormInterface[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // Imagen
    const handleImagenChange = (file: File | null) => {
        setForm((prev) => ({ ...prev, imagen: file }));
        setPreviewImagen(file ? URL.createObjectURL(file) : null);
    };

    // Toggle de categorías
    const toggleCategoria = (id: number) => {
        setForm((prev) => ({
            ...prev,
            categorias: prev.categorias.includes(id)
                ? prev.categorias.filter((c) => c !== id)
                : [...prev.categorias, id],
        }));
    };

    const handleSubmit = async () => {
        const error = validarProducto(form);
        if (error) {
            toast.error(error);
            return;
        }

        setIsSaving(true);
        try {
            const response = await registrarProducto(getToken()!, productoFormData(form));
            toast.success(response.message || "Producto registrado correctamente");

            if (modificadores?.length && llevaModificadores(form) && response.id) {
                try {
                    await guardarModificadoresProducto(response.id, modificadores);
                } catch (e) {
                    // El producto ya existe: se abre para corregir sus modificadores
                    toast.error(mensajeError(e, "El producto se guardó, pero sus modificadores no"));
                    navigate(`/admin/productos/editar/${response.id}`);
                    return;
                }
            }
            navigate("/admin/productos/index");
        } catch (error) {
            toast.error(mensajeError(error, "Error al registrar producto"));
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setForm((prev) => ({ ...productoFormInicial, unidad_medida_id: prev.unidad_medida_id }));
        setPreviewImagen(null);
        setModificadores(null);
    };

    return {
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
        modificadores,
        setModificadores,
    };
}
