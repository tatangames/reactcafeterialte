import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

import { STORAGE_URL } from "../../services/api";
import { actualizarConfiguracionNegocio, getConfiguracionNegocio } from "../../services/configuracion";
import { ConfiguracionNegocioFormInterface, ConfiguracionNegocioInterface } from "../../types/interfaces";

const initialForm: ConfiguracionNegocioFormInterface = {
    nombre: "",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: "",
    moneda: "USD",
    simbolo_moneda: "$",
    permitir_stock_negativo: true,
    descuento_max_sin_autorizacion: "10",
    cierre_ciego: false,
    mensaje_ticket: "",
    logo: null,
};

// Pasa los datos del backend (con null) al formulario (con strings)
const aFormulario = (c: ConfiguracionNegocioInterface): ConfiguracionNegocioFormInterface => ({
    nombre: c.nombre ?? "",
    razon_social: c.razon_social ?? "",
    direccion: c.direccion ?? "",
    telefono: c.telefono ?? "",
    correo: c.correo ?? "",
    moneda: c.moneda,
    simbolo_moneda: c.simbolo_moneda,
    permitir_stock_negativo: c.permitir_stock_negativo,
    descuento_max_sin_autorizacion: String(Number(c.descuento_max_sin_autorizacion)),
    cierre_ciego: c.cierre_ciego,
    mensaje_ticket: c.mensaje_ticket ?? "",
    logo: null,
});

export function useNegocioHook() {
    const [form, setForm] = useState<ConfiguracionNegocioFormInterface>(initialForm);
    const [previewLogo, setPreviewLogo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        cargar();
    }, []);

    const aplicar = (config: ConfiguracionNegocioInterface) => {
        setForm(aFormulario(config));
        setPreviewLogo(config.logo ? STORAGE_URL + config.logo : null);
    };

    const cargar = async () => {
        try {
            aplicar(await getConfiguracionNegocio());
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = <K extends keyof ConfiguracionNegocioFormInterface>(
        field: K,
        value: ConfiguracionNegocioFormInterface[K]
    ) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleLogoChange = (file: File | null) => {
        if (file && !["image/jpeg", "image/png"].includes(file.type)) {
            toast.error("El logo debe ser JPG o PNG");
            return;
        }
        if (file && file.size > 2 * 1024 * 1024) {
            toast.error("El logo debe pesar menos de 2MB");
            return;
        }
        handleChange("logo", file);
        if (file) setPreviewLogo(URL.createObjectURL(file));
    };

    const validar = (): boolean => {
        if (!form.nombre.trim()) { toast.error("El nombre del negocio es requerido"); return false; }
        if (form.descuento_max_sin_autorizacion === "" || Number(form.descuento_max_sin_autorizacion) > 100) {
            toast.error("Ingresa un descuento máximo válido (0 a 100)");
            return false;
        }
        if (form.moneda.trim().length !== 3) { toast.error("La moneda debe tener 3 letras (ej. USD)"); return false; }
        return true;
    };

    const handleSubmit = async () => {
        if (!validar()) return;

        const fd = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (key === "logo") {
                if (value) fd.append("logo", value as File);
            } else if (typeof value === "boolean") {
                fd.append(key, value ? "1" : "0");
            } else {
                fd.append(key, String(value).trim());
            }
        });

        setIsSaving(true);
        try {
            const res = await actualizarConfiguracionNegocio(fd);
            aplicar(res.data);
            toast.success(res.message);
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message ?? "Error al guardar la configuración");
        } finally {
            setIsSaving(false);
        }
    };

    return {
        form,
        previewLogo,
        loading,
        isSaving,
        handleChange,
        handleLogoChange,
        handleSubmit,
    };
}
