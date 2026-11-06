import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import PageHeader from "../components/common/PageHeader";
import FormField, { inputClass } from "../components/form/FormField";
import { useAuth } from "../context/AuthContext";
import { cambiarMiPin, getMiCuenta } from "../services/api";
import { mensajeError } from "../utils/formato";

// "2026-11-04 14:30" → "04/11/2026 a las 14:30"
const fechaHora = (f: string) => `${f.slice(0, 10).split("-").reverse().join("/")} a las ${f.slice(11, 16)}`;

// Datos del usuario y su PIN: con el PIN autoriza en la tablet del mesero sin dar la contraseña
export default function MiCuenta() {
    const { user } = useAuth();
    const [pinInfo, setPinInfo] = useState<{ tiene_pin: boolean; pin_actualizado_at: string | null } | null>(null);
    const [form, setForm] = useState({ password_actual: "", pin: "", pin_confirmation: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        getMiCuenta().then((d) => setPinInfo({ tiene_pin: d.tiene_pin, pin_actualizado_at: d.pin_actualizado_at })).catch(() => null);
    }, []);

    const soloNumeros = (v: string) => v.replace(/\D/g, "").slice(0, 6);
    const listo = form.password_actual && form.pin.length >= 4 && form.pin === form.pin_confirmation;

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const res = await cambiarMiPin(form);
            setPinInfo({ tiene_pin: true, pin_actualizado_at: res.pin_actualizado_at });
            setForm({ password_actual: "", pin: "", pin_confirmation: "" });
            toast.success(res.message);
        } catch (err) {
            toast.error(mensajeError(err, "No se pudo guardar el PIN"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            <PageHeader title="Mi cuenta" subtitle="Tus datos y tu PIN de autorización" />

            <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
                    <h2 className="font-semibold text-gray-800">Datos</h2>
                    <dl className="space-y-2 text-sm">
                        <div><dt className="text-gray-500">Nombre</dt><dd className="font-medium text-gray-800">{user?.nombre}</dd></div>
                        <div><dt className="text-gray-500">Correo</dt><dd className="font-medium text-gray-800">{user?.email}</dd></div>
                        <div><dt className="text-gray-500">Rol</dt><dd className="font-medium text-gray-800">{user?.roles?.join(", ") || "—"}</dd></div>
                    </dl>
                </section>

                <form onSubmit={guardar} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
                    <div>
                        <h2 className="font-semibold text-gray-800">PIN de autorización</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Lo escribes en la tablet o en la caja cuando el mesero necesita permiso: anular una comanda,
                            cancelar algo ya enviado o dar más descuento del permitido. Así no das tu contraseña.
                        </p>
                        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${pinInfo?.tiene_pin ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                            {pinInfo === null ? "Cargando..." : pinInfo.tiene_pin && pinInfo.pin_actualizado_at
                                ? `PIN establecido el ${fechaHora(pinInfo.pin_actualizado_at)}`
                                : pinInfo.tiene_pin ? "Tienes un PIN" : "Todavía no tienes PIN: mientras tanto se autoriza con tu contraseña"}
                        </p>
                    </div>

                    <FormField label="Tu contraseña actual" required>
                        <input type="password" className={inputClass} autoComplete="current-password" value={form.password_actual}
                            onChange={(e) => setForm({ ...form, password_actual: e.target.value })} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label={pinInfo?.tiene_pin ? "PIN nuevo" : "PIN"} required hint="4 a 6 números">
                            <input type="password" inputMode="numeric" autoComplete="off" className={inputClass} value={form.pin}
                                onChange={(e) => setForm({ ...form, pin: soloNumeros(e.target.value) })} />
                        </FormField>
                        <FormField label="Repite el PIN" required>
                            <input type="password" inputMode="numeric" autoComplete="off" className={inputClass} value={form.pin_confirmation}
                                onChange={(e) => setForm({ ...form, pin_confirmation: soloNumeros(e.target.value) })} />
                        </FormField>
                    </div>
                    {form.pin_confirmation && form.pin !== form.pin_confirmation && <p className="text-sm text-red-600">Los PIN no coinciden</p>}

                    <div className="flex justify-end">
                        <button type="submit" disabled={!listo || guardando}
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {guardando ? "Guardando..." : pinInfo?.tiene_pin ? "Cambiar PIN" : "Guardar PIN"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
