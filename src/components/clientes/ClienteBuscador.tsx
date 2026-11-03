import { useEffect, useState } from "react";

import ClienteFormModal from "./ClienteFormModal";
import { inputClass } from "../form/FormField";
import { useAuth } from "../../context/AuthContext";
import { getClientes } from "../../services/clientes";
import { dinero } from "../../utils/formato";
import { ClienteInterface } from "../../types/clientes";

interface Props {
    onSelect: (cliente: ClienteInterface) => void;
    autoFocus?: boolean;
}

// Búsqueda de clientes por nombre, DUI/NIT o teléfono, con alta rápida
export default function ClienteBuscador({ onSelect, autoFocus }: Props) {
    const { hasPermission } = useAuth();
    const [texto, setTexto] = useState("");
    const [resultados, setResultados] = useState<ClienteInterface[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState(false);
    const [creando, setCreando] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setBuscando(true);
            getClientes({ buscar: texto.trim(), per_page: 8 })
                .then((res) => { setResultados(res.clientes); setError(false); })
                .catch(() => setError(true))
                .finally(() => setBuscando(false));
        }, texto ? 300 : 0);
        return () => clearTimeout(t);
    }, [texto]);

    return (
        <div className="space-y-3">
            <ClienteFormModal isOpen={creando} nombreInicial={texto.trim()} onClose={() => setCreando(false)}
                onSaved={(c) => { setCreando(false); onSelect(c); }} />

            <div className="flex gap-2">
                <input className={inputClass} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus={autoFocus}
                    placeholder="Nombre, DUI/NIT o teléfono" />
                {hasPermission("clientes.gestionar") && (
                    <button type="button" onClick={() => setCreando(true)}
                        className="whitespace-nowrap rounded-lg bg-blue-50 px-4 text-sm font-medium text-blue-700 hover:bg-blue-100">+ Nuevo</button>
                )}
            </div>

            <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                {error && <p className="p-4 text-sm text-red-600">No se pudo buscar: revisa la conexión</p>}
                {!error && !buscando && resultados.length === 0 && <p className="p-4 text-sm text-gray-500">Sin resultados</p>}
                {resultados.map((c) => (
                    <button key={c.id} type="button" onClick={() => onSelect(c)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                        <div className="min-w-0">
                            <p className="truncate font-medium text-gray-800">{c.nombre}</p>
                            <p className="truncate text-xs text-gray-500">{[c.documento, c.telefono].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                        <div className="text-right text-xs">
                            {c.limite_credito > 0
                                ? <p className="text-gray-600">Disponible {dinero(c.credito_disponible)}</p>
                                : <p className="text-gray-400">Sin crédito</p>}
                            {c.saldo > 0 && <p className={c.vencido ? "font-semibold text-red-600" : "text-amber-700"}>Debe {dinero(c.saldo)}</p>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
