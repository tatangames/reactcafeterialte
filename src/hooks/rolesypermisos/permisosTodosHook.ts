import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getPermisosTable,
    borrarPermisoGlobal,
    crearNuevoPermiso,
} from "../../services/api";
import { getToken } from "../../utils/auth";

interface Permiso {
    id: number;
    name: string;
}

export function usePermisos() {
    const [data, setData] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    // eliminar
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedPermiso, setSelectedPermiso] = useState<Permiso | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // agregar
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchPermisos();
    }, []);

    const fetchPermisos = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getPermisosTable(token);
            setData(response.permisos);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando permisos");
        } finally {
            setLoading(false);
        }
    };

    /* ================= ELIMINAR ================= */

    const handleDeleteClick = (permiso: Permiso) => {
        setSelectedPermiso(permiso);
        setIsDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedPermiso) return;

        setIsDeleting(true);
        try {
            const token = getToken();
            await borrarPermisoGlobal(token!, selectedPermiso.id);

            setData((prev) => prev.filter((p) => p.id !== selectedPermiso.id));

            toast.success("Permiso eliminado correctamente");
            setIsDeleteOpen(false);
        } catch {
            toast.error("No se pudo eliminar el permiso");
        } finally {
            setIsDeleting(false);
        }
    };

    /* ================= AGREGAR ================= */

    const handleCreatePermiso = async (nombre: string, descripcion?: string) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const res = await crearNuevoPermiso(token!, nombre, descripcion);

            if (res.success === 1) {
                toast.success("Permiso creado correctamente");
                setIsAddOpen(false);
                fetchPermisos();
            } else if (res.success === 2) {
                toast.error(`El permiso "${res.permiso}" ya existe`);
            } else {
                toast.error("Error al crear permiso");
            }
        } catch (error: any) {
            const permiso = error?.response?.data?.permiso;
            if (permiso) {
                toast.error(`El permiso "${permiso}" ya existe`);
            } else {
                toast.error("Error al crear permiso");
            }
        } finally {
            setIsCreating(false);
        }
    };

    const filteredData = data.filter((item) =>
        item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    return {
        // datos
        filteredData,
        loading,
        filterText,
        setFilterText,

        // eliminar
        isDeleteOpen,
        setIsDeleteOpen,
        selectedPermiso,
        isDeleting,
        handleDeleteClick,
        handleConfirmDelete,

        // agregar
        isAddOpen,
        setIsAddOpen,
        isCreating,
        handleCreatePermiso,
    };
}