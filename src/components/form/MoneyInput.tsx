import { useState } from "react";

interface MoneyInputProps {
    value: string;
    onChange: (value: string) => void;
    prefix?: string;      // "$" o "%"
    suffix?: string;
    decimals?: number;    // decimales permitidos al escribir
    minDecimals?: number; // decimales que se muestran siempre (0.1 → 0.10); por defecto 2 en montos con "$"
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    autoFocus?: boolean;
}

// Campo numérico para montos y porcentajes: acepta solo dígitos y un separador
// decimal (coma o punto), con teclado numérico en tablets
export default function MoneyInput({
    value,
    onChange,
    prefix,
    suffix,
    decimals = 2,
    minDecimals,
    placeholder = "0.00",
    disabled = false,
    className = "",
    autoFocus = false,
}: MoneyInputProps) {
    const patron = decimals === 0 ? /^\d*$/ : new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);

    const [enFoco, setEnFoco] = useState(false);
    const minimo = Math.min(minDecimals ?? (prefix === "$" ? 2 : 0), decimals);

    // Mientras escribe se ve tal cual; al salir del campo, completo: 0.1 → 0.10, 5 → 5.00 (0.0125 queda igual)
    const formatear = (v: string) => {
        if (!minimo || v === "" || isNaN(Number(v))) return v;
        const [entero, dec = ""] = v.split(".");
        return dec.length >= minimo ? v : `${entero || "0"}.${dec.padEnd(minimo, "0")}`;
    };

    const handleChange = (texto: string) => {
        const normalizado = texto.replace(",", ".");
        if (normalizado === "" || patron.test(normalizado)) {
            onChange(normalizado);
        }
    };

    return (
        <div className={`flex h-[42px] items-center rounded-lg border border-gray-300 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition ${disabled ? "opacity-50" : ""} ${className}`}>
            {prefix && <span className="pl-4 text-sm text-gray-500">{prefix}</span>}
            <input
                type="text"
                inputMode="decimal"
                value={enFoco ? value : formatear(value)}
                onFocus={() => setEnFoco(true)}
                onBlur={() => setEnFoco(false)}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className="h-full w-full min-w-0 bg-transparent px-3 text-sm text-gray-800 focus:outline-none"
            />
            {suffix && <span className="pr-4 text-sm text-gray-500">{suffix}</span>}
        </div>
    );
}
