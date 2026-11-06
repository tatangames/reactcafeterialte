import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { getUsuariosTable, crearUsuario, actualizarAdministrador, resetearPinUsuario } from "../../services/api";
import { mensajeError } from "../../utils/formato";
import { getToken } from "../../utils/auth";
import { sinTildes } from "../../utils/texto";

interface Usuario {
    id: number;
    nombre: string;
    correo: string;
    rol: string;
    estado: boolean;
    ultimo_acceso: string | null;
  pin_actualizado_at?: string | null;
}

interface NuevoUsuarioForm {
    nombre: string;
    email: string;
    password: string;
    rol: string;
}

interface EditarUsuarioForm {
    nombre: string;
    email: string;
    password?: string;
    rol: string;
    estado: boolean;
}

// Helper para extraer el mensaje de error de la respuesta
const extractErrorMessage = (error: any, fallback: string): string => {
    if (typeof error === "string") return error;
    // actualizarAdministrador lanza directamente el objeto "errors" de un 422
    if (error && !error.response && typeof error === "object" && !(error instanceof Error)) {
        const firstError = Object.values(error)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
            return firstError[0] as string;
        }
    }
    if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
            return firstError[0] as string;
        }
        return "Error de validación";
    }
    return error.response?.data?.message || error.message || fallback;
};

export function useUsuarios() {
    const [data, setData] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getUsuariosTable(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar usuarios");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (row: Usuario) => {
        setSelectedUsuarioId(row.id);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedUsuarioId(null);
    };

    const handleCreateUsuario = async (form: NuevoUsuarioForm) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const response = await crearUsuario(token!, form);

            toast.success(response.message || "Usuario creado correctamente");
            setIsNewUserModalOpen(false);
            fetchUsuarios();
        } catch (error: any) {
            console.error("Error completo:", error);
            toast.error(extractErrorMessage(error, "Error al crear usuario"));
            throw error;
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateUsuario = async (id: number, form: EditarUsuarioForm) => {
        setIsUpdating(true);
        try {
            const token = getToken();
            const response = await actualizarAdministrador(token!, id, form);

            toast.success(response.message || "Usuario actualizado correctamente");
            handleCloseEditModal();
            fetchUsuarios();
        } catch (error: any) {
            console.error("Error completo:", error);
            toast.error(extractErrorMessage(error, "Error al actualizar usuario"));
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredData = data.filter(
        (item) =>
            sinTildes(item.nombre).includes(sinTildes(filterText)) ||
            sinTildes(item.correo).includes(sinTildes(filterText)) ||
            sinTildes(item.rol).includes(sinTildes(filterText))
    );

    // Quien olvidó su PIN: se borra, entra con su contraseña y crea uno nuevo en "Mi cuenta"
    const handleResetearPin = async (usuario: { id: number; nombre: string }) => {
        if (!window.confirm(`¿Borrar el PIN de ${usuario.nombre}?

Desbloqueará la pantalla con su contraseña y después podrá crear un PIN nuevo en "Mi cuenta y PIN".`)) return;
        try {
            const res = await resetearPinUsuario(usuario.id);
            toast.success(res.message);
            await fetchUsuarios();
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo borrar el PIN"));
        }
    };

    return {
        handleResetearPin,
        // datos
        filteredData,
        loading,
        filterText,
        setFilterText,

        // nuevo usuario
        isNewUserModalOpen,
        setIsNewUserModalOpen,
        isCreating,
        handleCreateUsuario,

        // editar usuario
        isEditModalOpen,
        selectedUsuarioId,
        isUpdating,
        handleEdit,
        handleCloseEditModal,
        handleUpdateUsuario,
    };
}