import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getProveedoresTable,
    crearProveedor,
    actualizarProveedor,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import { ProveedorInterface } from "../../types/interfaces";

export function useProveedores() {
    const [data, setData] = useState<ProveedorInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedProveedor, setSelectedProveedor] = useState<ProveedorInterface | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchProveedores();
    }, []);

    const fetchProveedores = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getProveedoresTable(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar proveedores");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (nombre: string, notas?: string) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const response = await crearProveedor(token!, { nombre, notas });

            toast.success(response.message || "Proveedor creado correctamente");
            setIsCreateModalOpen(false);
            fetchProveedores();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al crear proveedor");
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (id: number, datos: { nombre: string; notas?: string; activo: boolean }) => {
        setIsUpdating(true);
        try {
            const token = getToken();
            const response = await actualizarProveedor(token!, id, datos);

            toast.success(response.message || "Proveedor actualizado correctamente");
            setIsEditModalOpen(false);
            setSelectedProveedor(null);
            fetchProveedores();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || "Error al actualizar proveedor");
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEdit = (row: ProveedorInterface) => {
        setSelectedProveedor(row);
        setIsEditModalOpen(true);
    };

    const filteredData = data.filter((item) =>
        item.nombre.toLowerCase().includes(filterText.toLowerCase())
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

        selectedProveedor,
        setSelectedProveedor,

        isCreating,
        isUpdating,

        handleCreate,
        handleUpdate,
        handleEdit,
    };
}