import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getUnidadMedidaTable,
    crearUnidadMedida,
    actualizarUnidadMedida,
    borrarUnidadMedida,
} from "../../services/api";
import { getToken } from "../../utils/auth";
import {UnidadMedidaFormInterface, UnidadMedidaInterface} from "../../types/interfaces.ts";
import { sinTildes } from "../../utils/texto";
import { mensajeError } from "../../utils/formato";



export function useUnidadMedida() {
    const [data, setData] = useState<UnidadMedidaInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUnidad, setSelectedUnidad] = useState<UnidadMedidaInterface | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [borrando, setBorrando] = useState<UnidadMedidaInterface | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleCreate = async (datos: UnidadMedidaFormInterface) => {
        setIsCreating(true);
        try {
            const token = getToken();
            const response = await crearUnidadMedida(token!, {
                nombre: datos.nombre,
                abreviatura: datos.abreviatura,
                tipo: datos.tipo,
                factor_base: datos.factor_base,
            });

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

    const handleUpdate = async (id: number, datos: UnidadMedidaFormInterface) => {
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

    const handleDelete = async () => {
        if (!borrando) return;
        setIsDeleting(true);
        try {
            const response = await borrarUnidadMedida(getToken()!, borrando.id);
            toast.success(response.message || "Unidad de medida borrada");
            setBorrando(null);
            fetchUnidades();
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo borrar la unidad de medida"));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (row: UnidadMedidaInterface) => {
        setSelectedUnidad(row);
        setIsEditModalOpen(true);
    };

    const filteredData = data.filter((item) =>
        sinTildes(item.nombre).includes(sinTildes(filterText)) ||
        sinTildes(item.abreviatura ?? "").includes(sinTildes(filterText))
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
        borrando,
        setBorrando,
        isDeleting,
        handleDelete,
    };
}