import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getCategoriasTable,
    crearCategoria,
    actualizarCategoria,
    borrarCategoria,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import { CategoriasInterface } from "../../types/interfaces";
import { sinTildes } from "../../utils/texto";
import { mensajeError } from "../../utils/formato";

export function useCategorias() {
    const [data, setData] = useState<CategoriasInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCategoria, setSelectedCategoria] = useState<CategoriasInterface | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [borrando, setBorrando] = useState<CategoriasInterface | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getCategoriasTable(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar categorías");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (nombre: string) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const response = await crearCategoria(token!, { nombre });

            toast.success(response.message || "Categoría creada correctamente");
            setIsCreateModalOpen(false);
            fetchCategorias();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al crear categoría");
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (id: number, datos: { nombre: string; estado: boolean }) => {
        setIsUpdating(true);
        try {
            const token = getToken();
            const response = await actualizarCategoria(token!, id, datos);

            toast.success(response.message || "Categoría actualizada correctamente");
            setIsEditModalOpen(false);
            setSelectedCategoria(null);
            fetchCategorias();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al actualizar categoría");
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!borrando) return;
        setIsDeleting(true);
        try {
            const response = await borrarCategoria(getToken()!, borrando.id);
            toast.success(response.message || "Categoría borrada");
            setBorrando(null);
            fetchCategorias();
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo borrar la categoría"));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (row: CategoriasInterface) => {
        setSelectedCategoria(row);
        setIsEditModalOpen(true);
    };

    const filteredData = data.filter((item) =>
        sinTildes(item.nombre).includes(sinTildes(filterText))
    );

    return {
        filteredData,
        loading,
        filterText,
        setFilterText,

        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,

        selectedCategoria,
        setSelectedCategoria,

        isCreating,
        isUpdating,

        handleCreate,
        handleUpdate,
        handleEdit,

        borrando,
        setBorrando,
        isDeleting,
        handleDelete,
    };
}