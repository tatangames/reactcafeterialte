interface Props {
    value: number;
    onChange: (valor: number) => void;
    min?: number;
    max?: number;
    paso?: number;
    size?: "md" | "lg";
    ariaLabel?: string;
}

// Cantidad con botones − y + grandes para pantallas táctiles; también se puede escribir
export default function QtyStepper({ value, onChange, min = 0, max = 9999, paso = 1, size = "md", ariaLabel }: Props) {
    const alto = size === "lg" ? "h-12" : "h-10";
    const ancho = size === "lg" ? "w-12" : "w-10";

    const cambiar = (nuevo: number) => onChange(Math.min(max, Math.max(min, nuevo)));

    return (
        <div className={`inline-flex items-stretch overflow-hidden rounded-lg border border-gray-300 bg-white ${alto}`}>
            <button type="button" onClick={() => cambiar(value - paso)} disabled={value <= min}
                className={`${ancho} text-xl font-semibold text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30`}
                aria-label="Restar">
                −
            </button>
            <input
                type="text"
                inputMode="numeric"
                value={value === 0 ? "" : String(value)}
                placeholder="0"
                aria-label={ariaLabel}
                onChange={(e) => {
                    const limpio = e.target.value.replace(/\D/g, "");
                    cambiar(limpio === "" ? 0 : Number(limpio));
                }}
                onFocus={(e) => e.target.select()}
                className="w-12 border-x border-gray-200 text-center text-base font-semibold text-gray-800 focus:outline-none"
            />
            <button type="button" onClick={() => cambiar(value + paso)} disabled={value >= max}
                className={`${ancho} text-xl font-semibold text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30`}
                aria-label="Sumar">
                +
            </button>
        </div>
    );
}
