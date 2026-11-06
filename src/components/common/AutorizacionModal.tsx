import { useEffect, useRef, useState } from "react";

import { registrarVentanaAutorizacion, SolicitudAutorizacion } from "../../utils/autorizacion";

/**
 * Ventana global "Autorización del administrador": se abre sola cuando una
 * acción la necesita (anular, cancelar lo enviado, descuento mayor al máximo).
 * El administrador escribe su PIN o su contraseña en el equipo del mesero.
 */
export default function AutorizacionModal() {
    const [solicitud, setSolicitud] = useState<SolicitudAutorizacion | null>(null);
    const [codigo, setCodigo] = useState("");
    const [conContrasena, setConContrasena] = useState(false);
    const resolver = useRef<((v: string | null) => void) | null>(null);
    const campo = useRef<HTMLInputElement>(null);

    useEffect(() => {
        registrarVentanaAutorizacion((s) => new Promise((resolve) => {
            resolver.current?.(null);
            resolver.current = resolve;
            setCodigo("");
            setSolicitud(s);
        }));
        return () => registrarVentanaAutorizacion(null);
    }, []);

    useEffect(() => {
        if (solicitud) setTimeout(() => campo.current?.focus(), 50);
    }, [solicitud, conContrasena]);

    if (!solicitud) return null;

    const cerrar = (valor: string | null) => {
        resolver.current?.(valor);
        resolver.current = null;
        setSolicitud(null);
        setCodigo("");
    };

    const tecla = (t: string) => setCodigo((c) => (t === "⌫" ? c.slice(0, -1) : c.length < 6 ? c + t : c));

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4">
            <form className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
                onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) cerrar(codigo.trim()); }}>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Autorización del administrador</h2>
                    <p className={`mt-1 text-sm ${solicitud.invalido ? "font-medium text-red-600" : "text-gray-600"}`}>{solicitud.mensaje}</p>
                </div>

                <input ref={campo} type="password" inputMode={conContrasena ? "text" : "numeric"} autoComplete="off"
                    value={codigo} onChange={(e) => setCodigo(conContrasena ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={conContrasena ? "Contraseña del administrador" : "PIN"}
                    className="h-14 w-full rounded-xl border border-gray-300 px-4 text-center text-2xl tracking-[0.4em] focus:border-blue-400 focus:outline-none" />

                {!conContrasena && (
                    <div className="grid grid-cols-3 gap-2">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((t, i) => t ? (
                            <button key={i} type="button" onClick={() => tecla(t)}
                                className="h-14 rounded-xl bg-gray-100 text-xl font-semibold text-gray-800 hover:bg-gray-200 active:scale-95">{t}</button>
                        ) : <span key={i} />)}
                    </div>
                )}

                <button type="button" onClick={() => { setConContrasena((v) => !v); setCodigo(""); }} className="text-sm text-blue-700 hover:underline">
                    {conContrasena ? "Usar PIN" : "Usar contraseña en lugar del PIN"}
                </button>

                <div className="flex gap-2">
                    <button type="button" onClick={() => cerrar(null)} className="flex-1 rounded-xl bg-gray-100 py-3 font-medium text-gray-700">Cancelar</button>
                    <button type="submit" disabled={!codigo.trim()} className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50">Autorizar</button>
                </div>
            </form>
        </div>
    );
}
