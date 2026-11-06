import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    getImpresorasTable,
    crearImpresora,
    actualizarImpresora,
    eliminarImpresora,
} from "../../services/api";
import { eliminarTrabajo, eliminarTrabajosConError, getTrabajosImpresion, probarImpresora, probarProduccion, reintentarTrabajo } from "../../services/impresion";
import { getToken } from "../../utils/auth";
import { mensajeError } from "../../utils/formato";
import {
    ImpresoraInterface,
    ImpresoraFormInterface,
    TrabajoImpresionInterface,
} from "../../types/interfaces";

const formVacio: ImpresoraFormInterface = {
    alias: "",
    conexion: "red",
    ip_impresora: "",
    puerto: "9100",
    nombre_windows: "",
    tipo_impresion: "escpos",
    ancho_caracteres: 48,
    uso: "ticket",
    predeterminada: false,
    cortar_papel: true,
    cash_drawer: "ninguno",
    activo: true,
};

export function useImpresoras() {
    const [data, setData]                           = useState<ImpresoraInterface[]>([]);
    const [loading, setLoading]                     = useState(true);
    const [isModalOpen, setIsModalOpen]             = useState(false);
    const [isEditing, setIsEditing]                 = useState(false);
    const [selectedId, setSelectedId]               = useState<number | null>(null);
    const [isSaving, setIsSaving]                   = useState(false);
    const [form, setForm]                           = useState<ImpresoraFormInterface>(formVacio);

    // Prueba de impresión: resultado por impresora
    const [probando, setProbando]                   = useState<number | null>(null);
    const [probandoProduccion, setProbandoProduccion] = useState(false);
    const [resultadoPrueba, setResultadoPrueba]     = useState<Record<number, { ok: boolean; mensaje: string }>>({});

    // Trabajos que fallaron
    const [trabajos, setTrabajos]                   = useState<TrabajoImpresionInterface[]>([]);
    const [reintentando, setReintentando]           = useState<number | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchTrabajos = () =>
        getTrabajosImpresion({ estado: "error" })
            .then((res) => setTrabajos(res.trabajos))
            .catch(() => setTrabajos([]));

    const fetchAll = async () => {
        setLoading(true);
        try {
            const token = getToken()!;
            const resImpresoras = await getImpresorasTable(token);
            setData(resImpresoras.data);
            fetchTrabajos();
        } catch {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const abrirModalNuevo = () => {
        // La primera impresora queda como predeterminada
        setForm({ ...formVacio, predeterminada: data.length === 0 });
        setIsEditing(false);
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const abrirModalEditar = (impresora: ImpresoraInterface) => {
        setForm({
            alias:            impresora.alias,
            conexion:         impresora.conexion,
            ip_impresora:     impresora.ip_impresora ?? "",
            puerto:           String(impresora.puerto || 9100),
            nombre_windows:   impresora.nombre_windows ?? "",
            tipo_impresion:   impresora.tipo_impresion ?? "escpos",
            ancho_caracteres: impresora.ancho_caracteres,
            uso:              impresora.uso,
            predeterminada:   impresora.predeterminada,
            cortar_papel:     impresora.cortar_papel,
            cash_drawer:      impresora.cash_drawer,
            activo:           impresora.activo,
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

    const handleGuardar = async () => {
        if (!form.alias.trim()) return toast.error("Ponle un nombre a la impresora");
        if (form.conexion === "red" && !form.ip_impresora.trim()) return toast.error("Indica la IP de la impresora");
        if (form.conexion === "windows" && !form.nombre_windows.trim()) return toast.error("Indica el nombre de la impresora en Windows");

        setIsSaving(true);
        try {
            const token = getToken()!;
            const payload = { ...form, alias: form.alias.trim(), ip_impresora: form.ip_impresora.trim(), nombre_windows: form.nombre_windows.trim() };
            const res = isEditing && selectedId
                ? await actualizarImpresora(token, selectedId, payload)
                : await crearImpresora(token, payload);
            toast.success(res.message || "Impresora guardada");
            cerrarModal();
            fetchAll();
        } catch (error) {
            toast.error(mensajeError(error, "Error al guardar"));
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

    const handleProbar = async (id: number, produccion = false) => {
        setProbando(id);
        setProbandoProduccion(produccion);
        try {
            const res = await (produccion ? probarProduccion(id) : probarImpresora(id));
            setResultadoPrueba((r) => ({ ...r, [id]: { ok: true, mensaje: res.message } }));
            toast.success("Prueba enviada a la impresora");
        } catch (error) {
            const mensaje = mensajeError(error, "No se pudo imprimir");
            setResultadoPrueba((r) => ({ ...r, [id]: { ok: false, mensaje } }));
            toast.error(mensaje);
        } finally {
            setProbando(null);
            fetchTrabajos();
        }
    };

    const handleReintentar = async (trabajo: TrabajoImpresionInterface, impresoraId?: number) => {
        setReintentando(trabajo.id);
        try {
            const res = await reintentarTrabajo(trabajo.id, impresoraId);
            if (res.impreso) toast.success("Impreso");
            else toast.error(res.message);
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo reintentar"));
        } finally {
            setReintentando(null);
            fetchTrabajos();
        }
    };

    const handleEliminarTrabajo = async (trabajo: TrabajoImpresionInterface) => {
        setReintentando(trabajo.id);
        try {
            await eliminarTrabajo(trabajo.id);
            setTrabajos((ts) => ts.filter((t) => t.id !== trabajo.id));
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo eliminar"));
            fetchTrabajos();
        } finally {
            setReintentando(null);
        }
    };

    const handleEliminarTodos = async () => {
        if (!window.confirm(`¿Quitar los ${trabajos.length} errores de impresión de la lista? No se vuelven a imprimir.`)) return;
        try {
            const res = await eliminarTrabajosConError();
            toast.success(res.message);
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo eliminar"));
        } finally {
            fetchTrabajos();
        }
    };

    return {
        data,
        loading,
        isModalOpen,
        isEditing,
        isSaving,
        form,
        setForm,
        abrirModalNuevo,
        abrirModalEditar,
        cerrarModal,
        handleGuardar,
        handleEliminar,
        probando,
        probandoProduccion,
        resultadoPrueba,
        handleProbar,
        trabajos,
        reintentando,
        handleReintentar,
        handleEliminarTrabajo,
        handleEliminarTodos,
    };
}
