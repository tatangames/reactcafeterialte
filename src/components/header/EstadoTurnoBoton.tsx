import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCaja } from "../../context/CajaContext";

// Indica en el encabezado si la caja de este dispositivo tiene turno abierto
export default function EstadoTurnoBoton() {
    const { hasAnyPermission } = useAuth();
    const { actual } = useCaja();

    if (!hasAnyPermission(["caja.abrir", "caja.movimientos", "caja.arqueo", "caja.cerrar"])) {
        return null;
    }

    const turno = actual?.turno;
    const titulo = turno
        ? `${turno.caja}: turno abierto por ${turno.usuario_apertura}`
        : actual ? `${actual.caja.nombre}: sin turno abierto` : "Caja";

    return (
        <Link to="/caja" title={titulo} aria-label={titulo}
            className="relative flex h-10 items-center gap-2 rounded-lg px-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <img src="/images/logo/tiempo.svg" alt="" className="w-6 h-6" />
            <span className={`h-2.5 w-2.5 rounded-full ${turno ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="hidden sm:inline text-sm text-gray-600">{turno ? <>Turno de <strong className="font-semibold text-gray-800">{turno.usuario_apertura}</strong></> : "Sin turno"}</span>
        </Link>
    );
}
