import { useEffect, useMemo, useRef, useState } from "react";

import { inputClass } from "./FormField";
import { sinTildes } from "../../utils/texto";

export interface OpcionBuscador {
    value: number;
    label: string;
    detalle?: string; // texto pequeño debajo, en la lista (ej. la clase del producto)
}

interface SelectBuscadorProps {
    opciones: OpcionBuscador[];
    value: number | null;
    onChange: (value: number | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

/**
 * Select con buscador: se escribe para filtrar (sin importar tildes ni mayúsculas)
 * y se elige con clic o con ↑ ↓ y Enter.
 */
export default function SelectBuscador({ opciones, value, onChange, placeholder = "Buscar o elegir...", disabled }: SelectBuscadorProps) {
    const [abierto, setAbierto] = useState(false);
    const [texto, setTexto] = useState("");
    const [activo, setActivo] = useState(0);
    const caja = useRef<HTMLDivElement>(null);
    const lista = useRef<HTMLUListElement>(null);

    const elegida = opciones.find(o => o.value === value) ?? null;

    const filtradas = useMemo(() => {
        const q = sinTildes(texto.trim());
        return q ? opciones.filter(o => sinTildes(o.label).includes(q)) : opciones;
    }, [opciones, texto]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, [abierto]);

    // Mantener visible la opción marcada con el teclado
    useEffect(() => {
        lista.current?.children[activo]?.scrollIntoView({ block: "nearest" });
    }, [activo]);

    const abrir = () => {
        if (disabled) return;
        setTexto("");
        setActivo(Math.max(0, opciones.findIndex(o => o.value === value)));
        setAbierto(true);
    };

    const elegir = (o: OpcionBuscador) => {
        onChange(o.value);
        setAbierto(false);
    };

    const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!abierto && (e.key === "ArrowDown" || e.key === "Enter")) {
            e.preventDefault();
            abrir();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo(i => Math.min(i + 1, filtradas.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtradas[activo]) elegir(filtradas[activo]);
        } else if (e.key === "Escape") {
            setAbierto(false);
        }
    };

    return (
        <div ref={caja} className="relative">
            <input
                type="text"
                className={`${inputClass} pr-9 ${disabled ? "!bg-gray-100 cursor-not-allowed" : ""}`}
                disabled={disabled}
                placeholder={elegida?.label ?? placeholder}
                value={abierto ? texto : elegida?.label ?? ""}
                onFocus={abrir}
                onClick={() => !abierto && abrir()}
                onChange={e => { setTexto(e.target.value); setActivo(0); setAbierto(true); }}
                onKeyDown={teclas}
                role="combobox"
                aria-expanded={abierto}
                autoComplete="off"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>

            {abierto && (
                <ul ref={lista} role="listbox"
                    className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
                    {filtradas.length === 0 && <li className="px-4 py-2 text-gray-500">Sin resultados</li>}
                    {filtradas.map((o, i) => (
                        <li key={o.value} role="option" aria-selected={o.value === value}
                            onMouseDown={e => { e.preventDefault(); elegir(o); }}
                            onMouseEnter={() => setActivo(i)}
                            className={`cursor-pointer px-4 py-2 ${i === activo ? "bg-blue-50 text-blue-700" : "text-gray-800"} ${o.value === value ? "font-semibold" : ""}`}>
                            {o.label}
                            {o.detalle && <span className="block text-xs font-normal text-gray-500">{o.detalle}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
