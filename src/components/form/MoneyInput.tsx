interface MoneyInputProps {
    value: string;
    onChange: (value: string) => void;
    prefix?: string;      // "$" o "%"
    suffix?: string;
    decimals?: number;    // decimales permitidos al escribir
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

// Campo numérico para montos y porcentajes: acepta solo dígitos y un separador
// decimal (coma o punto), con teclado numérico en tablets
export default function MoneyInput({
    value,
    onChange,
    prefix,
    suffix,
    decimals = 2,
    placeholder = "0.00",
    disabled = false,
    className = "",
}: MoneyInputProps) {
    const patron = decimals === 0 ? /^\d*$/ : new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);

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
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="h-full w-full min-w-0 bg-transparent px-3 text-sm text-gray-800 focus:outline-none"
            />
            {suffix && <span className="pr-4 text-sm text-gray-500">{suffix}</span>}
        </div>
    );
}
