import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import {
    getProducto,
    actualizarProducto,
    getUnidadMedidaTable,
    getCategoriasTable,
    STORAGE_URL,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import {
    UnidadMedidaInterface,
    CategoriasInterface,
    ProductoEditInterface,
    ProductoFormInterface,
} from "../../types/interfaces";
import { productoAFormulario, productoFormData, productoFormInicial, validarProducto } from "../../utils/productoForm";
import { mensajeError } from "../../utils/formato";

export function useProductoEditarHook() {
    const navigate = useNavigate();
    const { id } = useParams();
    const productoId = Number(id);

    const [form, setForm] = useState<ProductoFormInterface>(productoFormInicial);
    const [unidades, setUnidades] = useState<UnidadMedidaInterface[]>([]);
    const [categorias, setCategorias] = useState<CategoriasInterface[]>([]);
    const [previewImagen, setPreviewImagen] = useState<string | null>(null);
    const [activo, setActivo] = useState(true);
    const [stockActual, setStockActual] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        cargarTodo();
    }, []);

    const cargarTodo = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const [resUnidades, resCategorias, resProducto] = await Promise.all([
                getUnidadMedidaTable(token),
                getCategoriasTable(token),
                getProducto(token, productoId) as Promise<ProductoEditInterface>,
            ]);

            // Se conserva la unidad actual aunque esté desactivada
            setUnidades(resUnidades.filter((u: UnidadMedidaInterface) => u.estado || u.id === resProducto.unidad_medida_id));
            setCategorias(resCategorias.filter((c: CategoriasInterface) => c.estado));

            // Precargar el formulario con los datos del producto
            setForm(productoAFormulario(resProducto));
            setActivo(resProducto.activo);
            setStockActual(resProducto.stock_actual);

            if (resProducto.imagen) {
                setPreviewImagen(STORAGE_URL + resProducto.imagen);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar el producto");
            navigate("/admin/productos/index");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = <K extends keyof ProductoFormInterface>(field: K, value: ProductoFormInterface[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleImagenChange = (file: File | null) => {
        setForm((prev) => ({ ...prev, imagen: file }));
        if (file) {
            setPreviewImagen(URL.createObjectURL(file));
        }
    };

    const toggleCategoria = (catId: number) => {
        setForm((prev) => ({
            ...prev,
            categorias: prev.categorias.includes(catId)
                ? prev.categorias.filter((c) => c !== catId)
                : [...prev.categorias, catId],
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
            const response = await actualizarProducto(getToken()!, productoId, productoFormData(form, activo));

            toast.success(response.message || "Producto actualizado correctamente");
            navigate("/admin/productos/index");
        } catch (error) {
            toast.error(mensajeError(error, "Error al actualizar producto"));
        } finally {
            setIsSaving(false);
        }
    };

    return {
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
    };
}
