// Bloqueo de pantalla: se guarda en el navegador para que recargar la página no lo quite
const CLAVE = "pantalla_bloqueada";
const EVENTO = "pantalla-bloqueo";

export const usuarioBloqueado = (): number | null => {
    try {
        const v = localStorage.getItem(CLAVE);
        return v ? Number(v) : null;
    } catch {
        return null;
    }
};

const fijar = (usuarioId: number | null) => {
    try {
        if (usuarioId) localStorage.setItem(CLAVE, String(usuarioId));
        else localStorage.removeItem(CLAVE);
    } catch {
        /* sin almacenamiento: el bloqueo dura hasta recargar */
    }
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: usuarioId }));
};

export const bloquearPantalla = (usuarioId: number) => fijar(usuarioId);
export const quitarBloqueo = () => fijar(null);

export const alCambiarBloqueo = (fn: (usuarioId: number | null) => void) => {
    const escuchar = (e: Event) => fn((e as CustomEvent<number | null>).detail);
    window.addEventListener(EVENTO, escuchar);
    return () => window.removeEventListener(EVENTO, escuchar);
};
