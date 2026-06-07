import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getRolePermissionsTable,
    borrarPermisoRol,
    agregarPermisoRol,
} from "../../services/api";
import { getToken } from "../../utils/auth";

export interface Permiso {
    id: number;
    name: string;
}

export function useRolesPermisos() {
    const { id } = useParams();
    const location = useLocation();

    const roleName = location.state?.roleName ?? "";
    const roleId = Number(id);

    const [data, setData] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    // eliminar
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPermiso, setSelectedPermiso] = useState<Permiso | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // agregar
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchPermisos();
    }, []);

    const fetchPermisos = async () => {
        try {
            setLoading(true);
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getRolePermissionsTable(token, roleId);
            setData(response.permisos);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando permisos");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAdd = async (permisoId: number) => {
        setIsAdding(true);
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            await agregarPermisoRol(token, roleId, permisoId);

            toast.success("Permiso agregado correctamente");
            await fetchPermisos();
            setIsAddModalOpen(false);
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 409) {
                toast.error("El rol ya tiene este permiso");
            } else {
                toast.error("No se pudo agregar el permiso");
            }
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = (permiso: Permiso) => {
        setSelectedPermiso(permiso);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedPermiso) return;

        setIsDeleting(true);
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            await borrarPermisoRol(token, roleId, selectedPermiso.id);

            setData((prev) => prev.filter((p) => p.id !== selectedPermiso.id));
            toast.success("Permiso eliminado correctamente");
            setIsDeleteModalOpen(false);
            setSelectedPermiso(null);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar el permiso");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredData = data.filter((item) =>
        item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    return {
        // info del rol
        roleName,

        // datos
        filteredData,
        loading,
        filterText,
        setFilterText,

        // eliminar
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        selectedPermiso,
        isDeleting,
        handleDelete,
        handleConfirmDelete,

        // agregar
        isAddModalOpen,
        setIsAddModalOpen,
        isAdding,
        handleConfirmAdd,

        // ids para evitar duplicados
        permisosAsignados: data.map((p) => p.id),
    };
}