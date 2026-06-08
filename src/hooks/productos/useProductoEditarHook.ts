import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import {
    getProducto,
    actualizarProducto,
    getUnidadMedidaTable,
    getCategoriasTable,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import {
    UnidadMedidaInterface,
    CategoriasInterface,
    ProductoFormInterface,
} from "../../types/interfaces";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const STORAGE_URL = API_URL.replace("/api", "") + "/archivos/";

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

export function useProductoEditarHook() {
    const navigate = useNavigate();
    const { id } = useParams();
    const productoId = Number(id);

    const [form, setForm] = useState<ProductoFormInterface>(initialForm);
    const [unidades, setUnidades] = useState<UnidadMedidaInterface[]>([]);
    const [categorias, setCategorias] = useState<CategoriasInterface[]>([]);
    const [previewImagen, setPreviewImagen] = useState<string | null>(null);
    const [activo, setActivo] = useState(true);

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
                getProducto(token, productoId),
            ]);

            setUnidades(resUnidades.filter((u: UnidadMedidaInterface) => u.estado));
            setCategorias(resCategorias.filter((c: CategoriasInterface) => c.estado));

            // Precargar el formulario con los datos del producto
            setForm({
                sku: resProducto.sku ?? "",
                nombre: resProducto.nombre ?? "",
                descripcion: resProducto.descripcion ?? "",
                tipo: resProducto.tipo,
                costo_unitario: String(resProducto.costo_unitario),
                unidad_medida_id: String(resProducto.unidad_medida_id),
                categorias: resProducto.categorias ?? [],
                imagen: null,
            });

            setActivo(resProducto.activo);

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

    const handleChange = (
        field: keyof ProductoFormInterface,
        value: string | number[]
    ) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleImagenChange = (file: File | null) => {
        setForm((prev) => ({ ...prev, imagen: file }));
        if (file) {
            setPreviewImagen(URL.createObjectURL(file));
        } else {
            setPreviewImagen(null);
        }
    };

    const toggleCategoria = (catId: number) => {
        setForm((prev) => {
            const exists = prev.categorias.includes(catId);
            return {
                ...prev,
                categorias: exists
                    ? prev.categorias.filter((c) => c !== catId)
                    : [...prev.categorias, catId],
            };
        });
    };

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
            formData.append("activo", activo ? "1" : "0");

            form.categorias.forEach((catId, index) => {
                formData.append(`categorias[${index}]`, String(catId));
            });

            if (form.imagen) {
                formData.append("imagen", form.imagen);
            }

            const response = await actualizarProducto(token!, productoId, formData);

            toast.success(response.message || "Producto actualizado correctamente");
            navigate("/admin/productos/index");
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al actualizar producto");
            }
        } finally {
            setIsSaving(false);
        }
    };

    return {
        form,
        unidades,
        categorias,
        previewImagen,
        activo,
        setActivo,
        loading,
        isSaving,
        handleChange,
        handleImagenChange,
        toggleCategoria,
        handleSubmit,
    };
}