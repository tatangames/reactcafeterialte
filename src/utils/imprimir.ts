import toast from "react-hot-toast";

import { intentarImpresion } from "../services/impresion";
import { ResultadoImpresionInterface } from "../types/interfaces";

/**
 * Imprime en la térmica; si no hay impresora o falla, avisa el motivo y abre
 * la impresión del navegador con el documento que ya está en pantalla
 * (el que tiene la clase .area-impresion).
 */
export const imprimirConRespaldo = async (accion: () => Promise<ResultadoImpresionInterface>): Promise<boolean> => {
    const res = await intentarImpresion(accion);

    if (res.impreso) {
        toast.success("Enviado a la impresora");
        return true;
    }

    toast.error(`${res.mensaje}. Se abre la impresión del navegador.`, { duration: 5000 });
    window.print();
    return false;
};
