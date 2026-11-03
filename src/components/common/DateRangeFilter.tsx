import { haceDias, hoyLocal } from "../../utils/formato";

interface Props {
    desde: string;
    hasta: string;
    onChange: (rango: { desde: string; hasta: string }) => void;
}

const inputClass =
    "h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none";

// Rango de fechas con atajos (hoy, 7 días, 30 días, este mes)
export default function DateRangeFilter({ desde, hasta, onChange }: Props) {
    const inicioMes = hoyLocal().slice(0, 8) + "01";

    const atajos = [
        { texto: "Hoy", desde: hoyLocal(), hasta: hoyLocal() },
        { texto: "7 días", desde: haceDias(6), hasta: hoyLocal() },
        { texto: "30 días", desde: haceDias(29), hasta: hoyLocal() },
        { texto: "Este mes", desde: inicioMes, hasta: hoyLocal() },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={desde} max={hasta || undefined} aria-label="Desde"
                onChange={(e) => onChange({ desde: e.target.value, hasta })} className={inputClass} />
            <span className="text-sm text-gray-400">a</span>
            <input type="date" value={hasta} min={desde || undefined} max={hoyLocal()} aria-label="Hasta"
                onChange={(e) => onChange({ desde, hasta: e.target.value })} className={inputClass} />
            <div className="flex gap-1">
                {atajos.map((a) => {
                    const activo = a.desde === desde && a.hasta === hasta;
                    return (
                        <button key={a.texto} type="button" onClick={() => onChange({ desde: a.desde, hasta: a.hasta })}
                            className={`h-[42px] px-3 text-xs font-medium rounded-lg transition ${
                                activo ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}>
                            {a.texto}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
