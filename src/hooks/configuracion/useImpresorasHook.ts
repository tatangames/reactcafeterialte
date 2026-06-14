import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    getImpresorasTable,
    crearImpresora,
    actualizarImpresora,
    eliminarImpresora,
    getCategoriasTable,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import {
    ImpresoraInterface,
    ImpresoraFormInterface,
    CategoriasInterface,
} from "../../types/interfaces";

const formVacio: ImpresoraFormInterface = {
    alias: "",
    ip_impresora: "",
    ip_servidor: "",
    tipo_impresion: "escpos",
    cash_drawer: "ninguno",
    activo: true,
    categorias: [],
};

export function useImpresoras() {
    const [data, setData]                           = useState<ImpresoraInterface[]>([]);
    const [categorias, setCategorias]               = useState<CategoriasInterface[]>([]);
    const [loading, setLoading]                     = useState(true);
    const [isModalOpen, setIsModalOpen]             = useState(false);
    const [isEditing, setIsEditing]                 = useState(false);
    const [selectedId, setSelectedId]               = useState<number | null>(null);
    const [isSaving, setIsSaving]                   = useState(false);
    const [form, setForm]                           = useState<ImpresoraFormInterface>(formVacio);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const token = getToken()!;
            const [resImpresoras, resCategorias] = await Promise.all([
                getImpresorasTable(token),
                getCategoriasTable(token),
            ]);
            setData(resImpresoras.data);
            setCategorias(resCategorias);
        } catch {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const abrirModalNuevo = () => {
        setForm(formVacio);
        setIsEditing(false);
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const abrirModalEditar = (impresora: ImpresoraInterface) => {
        setForm({
            alias:          impresora.alias,
            ip_impresora:   impresora.ip_impresora,
            ip_servidor:    impresora.ip_servidor,
            tipo_impresion: impresora.tipo_impresion,
            cash_drawer:    impresora.cash_drawer,
            activo:         impresora.activo,
            categorias:     impresora.categorias.map((c) => c.id),
        });
        setIsEditing(true);
        setSelectedId(impresora.id);
        setIsModalOpen(true);
    };

    const cerrarModal = () => {
        setIsModalOpen(false);
        setForm(formVacio);
        setSelectedId(null);
    };

    const toggleCategoria = (id: number) => {
        setForm((prev) => ({
            ...prev,
            categorias: prev.categorias.includes(id)
                ? prev.categorias.filter((c) => c !== id)
                : [...prev.categorias, id],
        }));
    };

    const handleGuardar = async () => {
        if (!form.alias.trim()) return toast.error("El alias es obligatorio");
        if (!form.ip_impresora.trim()) return toast.error("La IP de la impresora es obligatoria");
        if (!form.ip_servidor.trim()) return toast.error("La IP del servidor es obligatoria");
        if (form.categorias.length === 0) return toast.error("Selecciona al menos una categoría");

        setIsSaving(true);
        try {
            const token = getToken()!;
            if (isEditing && selectedId) {
                const res = await actualizarImpresora(token, selectedId, form);
                toast.success(res.message || "Impresora actualizada");
            } else {
                const res = await crearImpresora(token, form);
                toast.success(res.message || "Impresora registrada");
            }
            cerrarModal();
            fetchAll();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const first = Object.values(error.response.data.errors)[0];
                toast.error((first as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al guardar");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEliminar = async (id: number) => {

        try {
            const res = await eliminarImpresora(getToken()!, id);
            toast.success(res.message || "Impresora eliminada");
            fetchAll();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    return {
        data,
        categorias,
        loading,
        isModalOpen,
        isEditing,
        isSaving,
        form,
        setForm,
        toggleCategoria,
        abrirModalNuevo,
        abrirModalEditar,
        cerrarModal,
        handleGuardar,
        handleEliminar,
    };
}