// Interruptor de encendido/apagado (parcial: el módulo tiene solo algunos permisos)
export default function Interruptor({ encendido, parcial, deshabilitado, onCambiar, etiqueta }: {
    encendido: boolean; parcial?: boolean; deshabilitado?: boolean; onCambiar: () => void; etiqueta: string;
}) {
    return (
        <button type="button" role="switch" aria-checked={parcial ? 'mixed' : encendido} aria-label={etiqueta}
            disabled={deshabilitado} onClick={onCambiar}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60
                ${encendido ? 'bg-green-500' : parcial ? 'bg-amber-400' : 'bg-gray-300'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform
                ${encendido ? 'translate-x-5' : parcial ? 'translate-x-2.5' : 'translate-x-0.5'}`} />
        </button>
    );
}
