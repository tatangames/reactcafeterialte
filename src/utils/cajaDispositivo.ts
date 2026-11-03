// Caja asignada a este dispositivo (tablet o computadora). Se guarda localmente:
// cada equipo trabaja siempre con la misma caja.

const CLAVE = "caja_id";

export const getCajaDispositivo = (): number | null => {
    try {
        const valor = localStorage.getItem(CLAVE);
        return valor ? Number(valor) : null;
    } catch {
        return null;
    }
};

export const setCajaDispositivo = (cajaId: number | null): void => {
    try {
        if (cajaId) localStorage.setItem(CLAVE, String(cajaId));
        else localStorage.removeItem(CLAVE);
    } catch {
        // almacenamiento no disponible: se volverá a pedir la caja
    }
};

// Identificador para que un reintento no duplique el movimiento
export const nuevoUuid = (): string => {
    const c: Crypto = globalThis.crypto;
    // randomUUID solo existe en contextos seguros (https o localhost)
    if (typeof c.randomUUID === "function") {
        return c.randomUUID();
    }
    // Sitios http en la red local (ej. http://192.168.1.4): getRandomValues sí está disponible
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
