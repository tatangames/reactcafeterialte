import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getUnidadMedidaTable,
    crearUnidadMedida,
    actualizarUnidadMedida,
} from "../../services/api";
import { getToken } from "../../utils/auth";

export interface UnidadMedida {
    id: number;
    nombre: string;
    estado: boolean;
}

export function useUnidadMedida() {
    const [data, setData] = useState<UnidadMedida[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUnidad, setSelectedUnidad] = useState<UnidadMedida | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchUnidades();
    }, []);

    const fetchUnidades = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getUnidadMedidaTable(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar unidades de medida");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (nombre: string) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const response = await crearUnidadMedida(token!, { nombre });

            toast.success(response.message || "Unidad de medida creada correctamente");
            setIsCreateModalOpen(false);
            fetchUnidades();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al crear unidad de medida");
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (id: number, datos: { nombre: string; estado: boolean }) => {
        setIsUpdating(true);
        try {
            const token = getToken();
            const response = await actualizarUnidadMedida(token!, id, datos);

            toast.success(response.message || "Unidad de medida actualizada correctamente");
            setIsEditModalOpen(false);
            setSelectedUnidad(null);
            fetchUnidades();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al actualizar unidad de medida");
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEdit = (row: UnidadMedida) => {
        setSelectedUnidad(row);
        setIsEditModalOpen(true);
    };

    const filteredData = data.filter((item) =>
        item.nombre.toLowerCase().includes(filterText.toLowerCase())
    );

    return {
        // datos
        filteredData,
        loading,
        filterText,
        setFilterText,

        // modales
        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,

        // seleccionado
        selectedUnidad,
        setSelectedUnidad,

        // estados de carga
        isCreating,
        isUpdating,

        // handlers
        handleCreate,
        handleUpdate,
        handleEdit,
    };
}