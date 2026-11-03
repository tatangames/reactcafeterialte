// Almacenamiento local del POS en IndexedDB (funciona también en http://192.168.x.x).
// - "cola": ventas hechas sin conexión, pendientes de enviar al servidor
// - "cache": última copia del catálogo, la configuración y el turno, para vender sin servidor

const NOMBRE = "pos_panaderia";
const VERSION = 1;

let conexion: Promise<IDBDatabase> | null = null;

const abrir = (): Promise<IDBDatabase> => {
    if (!conexion) {
        conexion = new Promise((resolve, reject) => {
            const req = indexedDB.open(NOMBRE, VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains("cola")) db.createObjectStore("cola", { keyPath: "uuid" });
                if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => {
                conexion = null;
                reject(req.error);
            };
        });
    }
    return conexion;
};

const operar = async <T,>(almacen: string, modo: IDBTransactionMode, accion: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
    const db = await abrir();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(almacen, modo);
        const req = accion(tx.objectStore(almacen));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
};

// ── Caché ────────────────────────────────────────────────────

export const guardarCache = async (clave: string, valor: unknown): Promise<void> => {
    try {
        await operar("cache", "readwrite", (s) => s.put({ valor, guardado: new Date().toISOString() }, clave));
    } catch {
        // sin IndexedDB (modo privado): se sigue sin caché
    }
};

export const leerCache = async <T,>(clave: string): Promise<{ valor: T; guardado: string } | null> => {
    try {
        return (await operar<{ valor: T; guardado: string } | undefined>("cache", "readonly", (s) => s.get(clave))) ?? null;
    } catch {
        return null;
    }
};

// ── Cola de ventas ───────────────────────────────────────────

export const guardarEnCola = <T extends { uuid: string },>(item: T): Promise<unknown> =>
    operar("cola", "readwrite", (s) => s.put(item));

export const leerCola = async <T,>(): Promise<T[]> => {
    try {
        return await operar<T[]>("cola", "readonly", (s) => s.getAll());
    } catch {
        return [];
    }
};

export const quitarDeCola = (uuid: string): Promise<unknown> =>
    operar("cola", "readwrite", (s) => s.delete(uuid));
