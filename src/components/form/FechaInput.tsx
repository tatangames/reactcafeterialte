import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es";
import type { Instance } from "flatpickr/dist/types/instance";

import { CalenderIcon } from "../../icons";

interface Props {
    /** Fecha en formato AAAA-MM-DD ("" si no hay) */
    value: string;
    onChange: (fecha: string) => void;
    min?: string;
    max?: string;
    className?: string;
    "aria-label"?: string;
    placeholder?: string;
}

/**
 * Campo de fecha con calendario en español. Se ve "04-11-2026" pero entrega "2026-11-04",
 * igual que un input type="date", así que se cambia uno por otro sin tocar nada más.
 */
export default function FechaInput({ value, onChange, min, max, className = "", placeholder = "dd-mm-aaaa", ...rest }: Props) {
    const ref = useRef<HTMLInputElement>(null);
    const fp = useRef<Instance | null>(null);
    const alCambiar = useRef(onChange);
    useEffect(() => {
        alCambiar.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!ref.current) return;
        const inst = flatpickr(ref.current, {
            locale: Spanish,
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d-m-Y",
            altInputClass: "",
            allowInput: true,
            disableMobile: true,
            onChange: (_fechas, texto) => alCambiar.current(texto),
        });
        fp.current = Array.isArray(inst) ? inst[0] : inst;
        if (rest["aria-label"]) fp.current?.altInput?.setAttribute("aria-label", rest["aria-label"]);
        return () => {
            fp.current?.destroy();
            fp.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Mantiene el calendario al día con lo que manda la pantalla
    useEffect(() => {
        const inst = fp.current;
        if (!inst) return;
        inst.set("minDate", min || undefined);
        inst.set("maxDate", max || undefined);
        if (value !== inst.input.value) inst.setDate(value || [], false);
    }, [value, min, max]);

    const ancho = className.includes("w-full") && !className.includes("!w-auto") ? "w-full" : "inline-block";

    return (
        <div className={`relative ${ancho}`}>
            {/* El que se ve es el campo "dd/mm/aaaa" que crea flatpickr; este guarda AAAA-MM-DD */}
            <input ref={ref} type="hidden" defaultValue={value} placeholder={placeholder} aria-label={rest["aria-label"]}
                className={`${className} pr-10`} />
            <CalenderIcon className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
        </div>
    );
}
