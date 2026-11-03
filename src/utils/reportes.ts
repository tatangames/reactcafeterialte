import { FormatoColumna } from "../services/reportes";
import { cantidad, dinero, fechaCorta } from "./formato";

// Valor de un reporte según el formato de su columna (igual que en Excel y PDF)
export const formatearValor = (valor: unknown, formato: FormatoColumna): string => {
    if (valor === null || valor === undefined || valor === "") return "";
    switch (formato) {
        case "dinero": return dinero(Number(valor));
        case "costo": return dinero(Number(valor), "$", 4);
        case "numero": return cantidad(Number(valor));
        case "porcentaje": return `${Number(valor).toFixed(1)}%`;
        case "fecha": return fechaCorta(String(valor));
        default: return String(valor);
    }
};
