import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

import {
    actualizarConfiguracionFel,
    getConfiguracionFel,
    getConfiguracionNegocio,
    probarConexionFel,
} from "../../services/configuracion";
import {
    ConfiguracionFelFormInterface,
    ConfiguracionFelInterface,
    FelActividad,
    FelCatalogos,
} from "../../types/interfaces";

const initialForm: ConfiguracionFelFormInterface = {
    activo: false,
    ambiente: "00",
    proveedor: "hacienda",
    api_url: "",
    api_usuario: "",
    api_password: "",
    firmador_url: "",
    clave_privada: "",
    nit: "",
    nrc: "",
    razon_social: "",
    nombre_comercial: "",
    actividades: [],
    tipo_establecimiento: "",
    cod_establecimiento_mh: "",
    cod_establecimiento: "",
    cod_punto_venta_mh: "",
    cod_punto_venta: "",
    departamento: "",
    municipio: "",
    distrito: "",
    direccion: "",
    telefono: "",
    correo: "",
    tipos_dte: ["01"],
};

// Backend (con null) → formulario (con strings). Las contraseñas nunca vienen: quedan vacías = "no cambiar"
const aFormulario = (c: ConfiguracionFelInterface): ConfiguracionFelFormInterface => ({
    activo: c.activo,
    ambiente: c.ambiente,
    proveedor: c.proveedor,
    api_url: c.api_url ?? "",
    api_usuario: c.api_usuario ?? "",
    api_password: "",
    firmador_url: c.firmador_url ?? "",
    clave_privada: "",
    nit: c.nit ?? "",
    nrc: c.nrc ?? "",
    razon_social: c.razon_social ?? "",
    nombre_comercial: c.nombre_comercial ?? "",
    actividades: c.actividades ?? [],
    tipo_establecimiento: c.tipo_establecimiento ?? "",
    cod_establecimiento_mh: c.cod_establecimiento_mh ?? "",
    cod_establecimiento: c.cod_establecimiento ?? "",
    cod_punto_venta_mh: c.cod_punto_venta_mh ?? "",
    cod_punto_venta: c.cod_punto_venta ?? "",
    departamento: c.departamento ?? "",
    municipio: c.municipio ?? "",
    distrito: c.distrito ?? "",
    direccion: c.direccion ?? "",
    telefono: c.telefono ?? "",
    correo: c.correo ?? "",
    tipos_dte: c.tipos_dte ?? [],
});

const mensajeError = (error: unknown, porDefecto: string) =>
    (axios.isAxiosError(error) ? error.response?.data?.message : null) ?? porDefecto;

export function useFelHook() {
    const [form, setForm] = useState<ConfiguracionFelFormInterface>(initialForm);
    const [config, setConfig] = useState<ConfiguracionFelInterface | null>(null);
    const [catalogos, setCatalogos] = useState<FelCatalogos | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [probando, setProbando] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getConfiguracionFel();
                setCatalogos(res.catalogos);
                aplicar(res.data);
            } catch (error) {
                toast.error(mensajeError(error, "Error al cargar la facturación electrónica"));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const aplicar = (c: ConfiguracionFelInterface) => {
        setConfig(c);
        setForm(aFormulario(c));
    };

    const handleChange = <K extends keyof ConfiguracionFelFormInterface>(field: K, value: ConfiguracionFelFormInterface[K]) => {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            // Al cambiar el departamento o municipio, lo que depende de él se limpia
            if (field === "departamento") { next.municipio = ""; next.distrito = ""; }
            if (field === "municipio") next.distrito = "";
            return next;
        });
    };

    // ── Actividades económicas ─────────────────────────────
    const agregarActividad = () =>
        setForm((p) => ({ ...p, actividades: [...p.actividades, { codigo: "", descripcion: "" }] }));

    const quitarActividad = (i: number) =>
        setForm((p) => ({ ...p, actividades: p.actividades.filter((_, idx) => idx !== i) }));

    const cambiarActividad = (i: number, campo: keyof FelActividad, valor: string) => {
        setForm((p) => {
            const actividades = p.actividades.map((a, idx) => {
                if (idx !== i) return a;
                const nueva = { ...a, [campo]: valor };
                // Si escribe/elige una descripción del catálogo, se llena el código (y al revés)
                const sugerida = catalogos?.actividades.find((s) =>
                    campo === "descripcion" ? s.descripcion === valor : s.codigo === valor);
                if (sugerida) Object.assign(nueva, sugerida);
                return nueva;
            });
            return { ...p, actividades };
        });
    };

    const toggleTipoDte = (codigo: string) =>
        setForm((p) => ({
            ...p,
            tipos_dte: p.tipos_dte.includes(codigo) ? p.tipos_dte.filter((t) => t !== codigo) : [...p.tipos_dte, codigo].sort(),
        }));

    // Trae NIT, NRC, razón social, etc. desde «Datos del negocio» para no escribirlos dos veces
    const copiarDeNegocio = async () => {
        try {
            const n = await getConfiguracionNegocio();
            setForm((p) => ({
                ...p,
                nit: n.nit ?? p.nit,
                nrc: n.nrc ?? p.nrc,
                razon_social: n.razon_social ?? p.razon_social,
                nombre_comercial: n.nombre ?? p.nombre_comercial,
                direccion: n.direccion ?? p.direccion,
                telefono: n.telefono ?? p.telefono,
                correo: n.correo ?? p.correo,
            }));
            toast.success("Datos copiados de «Datos del negocio». Revise y guarde.");
        } catch (error) {
            toast.error(mensajeError(error, "No se pudieron leer los datos del negocio"));
        }
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const res = await actualizarConfiguracionFel({
                ...form,
                actividades: form.actividades.filter((a) => a.codigo.trim() || a.descripcion.trim()),
            });
            aplicar(res.data);
            toast.success(res.message);
        } catch (error) {
            toast.error(mensajeError(error, "Error al guardar la configuración"));
        } finally {
            setIsSaving(false);
        }
    };

    const probarConexion = async () => {
        setProbando(true);
        try {
            const res = await probarConexionFel();
            setConfig(res.data);
            if (res.success) toast.success(res.message); else toast.error(res.message, { duration: 6000 });
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo probar la conexión"));
        } finally {
            setProbando(false);
        }
    };

    return {
        form, config, catalogos, loading, isSaving, probando,
        handleChange, agregarActividad, quitarActividad, cambiarActividad, toggleTipoDte,
        copiarDeNegocio, handleSubmit, probarConexion,
    };
}
