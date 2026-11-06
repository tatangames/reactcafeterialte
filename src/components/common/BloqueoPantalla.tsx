import { useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { desbloquearPantalla, getMiCuenta, logout } from "../../services/api";
import { clearAuth, getToken } from "../../utils/auth";
import { alCambiarBloqueo, quitarBloqueo, usuarioBloqueado } from "../../utils/bloqueo";
import { mensajeError } from "../../utils/formato";

/**
 * Pantalla bloqueada: tapa todo hasta que la misma persona escriba su PIN
 * (o su contraseña si todavía no tiene PIN). Si recargan la página sigue bloqueada.
 * Si olvidó el PIN, el administrador se lo borra en Usuarios y entra con su contraseña.
 */
export default function BloqueoPantalla() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const [bloqueadoId, setBloqueadoId] = useState(usuarioBloqueado);
    const [tienePin, setTienePin] = useState<boolean | null>(null);
    const [conContrasena, setConContrasena] = useState(false);
    const [codigo, setCodigo] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [espera, setEspera] = useState(0); // segundos que faltan tras muchos intentos fallidos
    const campo = useRef<HTMLInputElement>(null);

    useEffect(() => alCambiarBloqueo(setBloqueadoId), []);

    // Bloqueo que quedó de otra persona en este navegador: no aplica a quien entró ahora
    const activo = !!user && bloqueadoId === user.id;
    useEffect(() => {
        if (user && bloqueadoId && bloqueadoId !== user.id) quitarBloqueo();
    }, [user, bloqueadoId]);

    // Lo de atrás queda inerte: ni con la tecla Tab se llega a un botón de la página
    useEffect(() => {
        const contenido = document.getElementById("contenido-app");
        if (!contenido) return;
        contenido.inert = activo;
        return () => {
            contenido.inert = false;
        };
    }, [activo]);

    useEffect(() => {
        if (!activo) return;
        setCodigo("");
        setError("");
        getMiCuenta()
            .then((d) => {
                setTienePin(d.tiene_pin);
                setConContrasena(!d.tiene_pin);
            })
            .catch(() => setTienePin(null));
    }, [activo]);

    useEffect(() => {
        if (activo) setTimeout(() => campo.current?.focus(), 50);
    }, [activo, conContrasena]);

    // Cuenta regresiva visible; al llegar a 0 se puede volver a intentar
    useEffect(() => {
        if (espera <= 0) return;
        const t = setTimeout(() => setEspera((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [espera]);

    if (!activo) return null;

    const desbloquear = async (valor = codigo) => {
        if (!valor.trim() || enviando || espera > 0) return;
        setEnviando(true);
        setError("");
        try {
            await desbloquearPantalla(valor.trim());
            quitarBloqueo();
        } catch (e) {
            const segundos = (e as AxiosError<{ segundos?: number }>).response?.data?.segundos;
            if (segundos) {
                setEspera(segundos);
                setError("");
            } else {
                setError(mensajeError(e, "No se pudo verificar. Revisa la conexión."));
            }
            setCodigo("");
        } finally {
            setEnviando(false);
        }
    };

    const tecla = (t: string) => {
        if (t === "⌫") return setCodigo((c) => c.slice(0, -1));
        setCodigo((c) => (c.length < 6 ? c + t : c));
    };

    const cambiarUsuario = async () => {
        try {
            const token = getToken();
            if (token) await logout(token);
        } catch {
            // igual se cierra en este equipo
        }
        quitarBloqueo();
        clearAuth();
        setUser(null);
        navigate("/", { replace: true });
    };

    return (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-gray-900/95 p-4 backdrop-blur">
            <form className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-2xl"
                onSubmit={(e) => { e.preventDefault(); desbloquear(); }}>
                <img src="/images/logo/logoeci.png" alt="Panadería Eduardo" className="mx-auto h-24 w-24 rounded-full object-contain" />
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">🔒 Pantalla bloqueada</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        {user?.nombre}: escribe tu {conContrasena ? "contraseña" : "PIN"} para seguir
                    </p>
                </div>

                <input ref={campo} type="password" inputMode={conContrasena ? "text" : "numeric"} autoComplete="off"
                    value={codigo} onChange={(e) => setCodigo(conContrasena ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={conContrasena ? "Contraseña" : "PIN"}
                    className="h-14 w-full rounded-xl border border-gray-300 px-4 text-center text-2xl tracking-[0.4em] focus:border-blue-400 focus:outline-none" />

                {espera > 0 ? (
                    <p className="text-sm font-medium text-red-600">
                        Demasiados intentos. Espera <span className="tabular-nums">{espera}</span> {espera === 1 ? "segundo" : "segundos"}.
                    </p>
                ) : error && <p className="text-sm font-medium text-red-600">{error}</p>}

                {!conContrasena && (
                    <div className="grid grid-cols-3 gap-2">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((t, i) => t ? (
                            <button key={i} type="button" onClick={() => tecla(t)} disabled={espera > 0}
                                className="h-14 rounded-xl bg-gray-100 text-xl font-semibold text-gray-800 hover:bg-gray-200 active:scale-95 disabled:opacity-40">{t}</button>
                        ) : <span key={i} />)}
                    </div>
                )}

                <button type="submit" disabled={!codigo.trim() || enviando || espera > 0}
                    className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50">
                    {enviando ? "Verificando..." : espera > 0 ? `Espera ${espera} s` : "Desbloquear"}
                </button>

                {tienePin && (
                    <button type="button" onClick={() => { setConContrasena((v) => !v); setCodigo(""); setError(""); }}
                        className="block w-full text-sm text-blue-700 hover:underline">
                        {conContrasena ? "Usar PIN" : "Usar mi contraseña"}
                    </button>
                )}
                {tienePin === false && (
                    <p className="text-xs text-gray-500">Aún no tienes PIN. Créalo en "Mi cuenta y PIN" para desbloquear más rápido.</p>
                )}
                <p className="text-xs text-gray-500">¿Olvidaste tu PIN? Pide al administrador que te lo borre en Usuarios.</p>

                <button type="button" onClick={cambiarUsuario} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    No soy {user?.nombre}: cerrar sesión
                </button>
            </form>
        </div>
    );
}
