interface Props {
    onTecla: (tecla: string) => void; // "0"-"9", ".", "borrar", "limpiar"
    conPunto?: boolean;
    size?: "md" | "lg";
}

// Teclado numérico táctil (cobro y cantidades por peso)
export default function NumericKeypad({ onTecla, conPunto = true, size = "lg" }: Props) {
    const alto = size === "lg" ? "h-14" : "h-12";
    const teclas = ["7", "8", "9", "4", "5", "6", "1", "2", "3", conPunto ? "." : "limpiar", "0", "borrar"];

    return (
        <div className="grid grid-cols-3 gap-2 select-none">
            {teclas.map((t) => (
                <button
                    key={t}
                    type="button"
                    onClick={() => onTecla(t)}
                    className={`${alto} rounded-xl text-xl font-semibold transition active:scale-95 ${
                        t === "borrar" || t === "limpiar"
                            ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50"
                    }`}
                    aria-label={t === "borrar" ? "Borrar" : t === "limpiar" ? "Limpiar" : t}
                >
                    {t === "borrar" ? "⌫" : t === "limpiar" ? "C" : t}
                </button>
            ))}
        </div>
    );
}

// Aplica una tecla a un texto numérico respetando los decimales permitidos
export const aplicarTecla = (actual: string, tecla: string, decimales = 2): string => {
    if (tecla === "borrar") return actual.slice(0, -1);
    if (tecla === "limpiar") return "";
    if (tecla === ".") {
        if (decimales === 0 || actual.includes(".")) return actual;
        return actual === "" ? "0." : actual + ".";
    }
    const nuevo = actual === "0" ? tecla : actual + tecla;
    const [, dec] = nuevo.split(".");
    if (dec !== undefined && dec.length > decimales) return actual;
    if (nuevo.replace(".", "").length > 9) return actual;
    return nuevo;
};
