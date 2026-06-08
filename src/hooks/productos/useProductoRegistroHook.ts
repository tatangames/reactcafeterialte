import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import {
    registrarProducto,
    getUnidadMedidaTable,
    getCategoriasTable,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import {
    UnidadMedidaInterface,
    CategoriasInterface,
    ProductoFormInterface,
} from "../../types/interfaces";

const initialForm: ProductoFormInterface = {
    sku: "",
    nombre: "",
    descripcion: "",
    tipo: "bien",
    costo_unitario: "",
    unidad_medida_id: "",
    categorias: [],
    imagen: null,
};

export function useProductoRegistroHook() {
    const navigate = useNavigate();

    const [form, setForm] = useState<ProductoFormInterface>(initialForm);
    const [unidades, setUnidades] = useState<UnidadMedidaInterface[]>([]);
    const [categorias, setCategorias] = useState<CategoriasInterface[]>([]);
    const [previewImagen, setPreviewImagen] = useState<string | null>(null);

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
            setUnidades(resUnidades.filter((u: UnidadMedidaInterface) => u.estado));
            setCategorias(resCategorias.filter((c: CategoriasInterface) => c.estado));
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar catálogos");
        } finally {
            setLoading(false);
        }
    };

    // Cambios genéricos de inputs
    const handleChange = (
        field: keyof ProductoFormInterface,
        value: string | number[]
    ) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // Imagen
    const handleImagenChange = (file: File | null) => {
        setForm((prev) => ({ ...prev, imagen: file }));

        if (file) {
            setPreviewImagen(URL.createObjectURL(file));
        } else {
            setPreviewImagen(null);
        }
    };

    // Toggle de categorías
    const toggleCategoria = (id: number) => {
        setForm((prev) => {
            const exists = prev.categorias.includes(id);
            return {
                ...prev,
                categorias: exists
                    ? prev.categorias.filter((c) => c !== id)
                    : [...prev.categorias, id],
            };
        });
    };

    // Validación rápida en cliente
    const validar = (): boolean => {
        if (!form.nombre.trim()) {
            toast.error("El nombre es requerido");
            return false;
        }
        if (!form.costo_unitario || Number(form.costo_unitario) < 0) {
            toast.error("El costo unitario es requerido y debe ser válido");
            return false;
        }
        if (!form.unidad_medida_id) {
            toast.error("La unidad de medida es requerida");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validar()) return;

        setIsSaving(true);
        try {
            const token = getToken();

            const formData = new FormData();
            if (form.sku.trim()) formData.append("sku", form.sku.trim());
            formData.append("nombre", form.nombre.trim());
            if (form.descripcion.trim()) formData.append("descripcion", form.descripcion.trim());
            formData.append("tipo", form.tipo);
            formData.append("costo_unitario", form.costo_unitario);
            formData.append("unidad_medida_id", form.unidad_medida_id);

            form.categorias.forEach((id, index) => {
                formData.append(`categorias[${index}]`, String(id));
            });

            if (form.imagen) {
                formData.append("imagen", form.imagen);
            }

            const response = await registrarProducto(token!, formData);

            toast.success(response.message || "Producto registrado correctamente");
            navigate("/admin/productos/index");
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al registrar producto");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setForm(initialForm);
        setPreviewImagen(null);
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
    };
}