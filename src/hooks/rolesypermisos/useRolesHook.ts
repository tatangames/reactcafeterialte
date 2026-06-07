import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { getRolesTable, borrarRolGlobal, crearNuevoRol } from "../../services/api";
import { getToken } from "../../utils/auth";

interface Role {
    id: number;
    name: string;
}

export function useRoles() {
    const [data, setData] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isNewRolModalOpen, setIsNewRolModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getRolesTable(token);

            const rolesArray: Role[] = Object.entries(response.roles).map(
                ([id, name]) => ({
                    id: Number(id),
                    name: name as string,
                })
            );

            setData(rolesArray);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (row: Role) => {
        navigate(`/admin/roles/${row.id}/permisos`, {
            state: { roleName: row.name },
        });
    };

    const handleDeleteClick = (row: Role) => {
        setSelectedRole(row);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedRole) return;

        setIsDeleting(true);
        try {
            const token = getToken();
            await borrarRolGlobal(token!, selectedRole.id);

            setData((prev) => prev.filter((r) => r.id !== selectedRole.id));
            toast.success("Rol eliminado exitosamente");
            setIsDeleteModalOpen(false);
        } catch {
            toast.error("Error al borrar");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateRol = async (nombre: string) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const response = await crearNuevoRol(token!, nombre);

            if (response.success === 2) {
                toast.success("Rol creado exitosamente");
                setIsNewRolModalOpen(false);
                fetchRoles();
            } else if (response.success === 1) {
                toast.error("El rol ya existe");
            } else {
                toast.error("Error de validación");
            }
        } catch {
            toast.error("Error al crear el rol");
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
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        selectedRole,
        isDeleting,
        handleDeleteClick,
        handleConfirmDelete,

        // agregar
        isNewRolModalOpen,
        setIsNewRolModalOpen,
        isCreating,
        handleCreateRol,

        // navegación
        navigate,
        handleEdit,
    };
}