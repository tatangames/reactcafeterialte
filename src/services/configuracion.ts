// Servicios nuevos: el token lo agrega el interceptor de api.ts

import { api } from "./api";
import { ConfiguracionNegocioInterface } from "../types/interfaces";

// ************************  SECCION - CONFIGURACIÓN DEL NEGOCIO  ******************

export const getConfiguracionNegocio = async (): Promise<ConfiguracionNegocioInterface> => {
    const { data } = await api.get("/configuracion/negocio");
    return data.data;
};

export const actualizarConfiguracionNegocio = async (formData: FormData) => {
    const { data } = await api.post("/configuracion/negocio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { success: number; message: string; data: ConfiguracionNegocioInterface };
};
