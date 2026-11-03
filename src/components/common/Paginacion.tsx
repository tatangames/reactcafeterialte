interface Props {
    pagina: number;
    totalPaginas: number;
    total: number;
    onCambiar: (pagina: number) => void;
}

// Paginación para listados que pagina el servidor
export default function Paginacion({ pagina, totalPaginas, total, onCambiar }: Props) {
    if (total === 0) return null;

    const boton = "h-10 min-w-10 px-3 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-gray-600">
            <span>{total} registro(s) · página {pagina} de {totalPaginas}</span>
            <div className="flex gap-2">
                <button type="button" className={boton} disabled={pagina <= 1} onClick={() => onCambiar(1)} aria-label="Primera página">«</button>
                <button type="button" className={boton} disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
                <button type="button" className={boton} disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
                <button type="button" className={boton} disabled={pagina >= totalPaginas} onClick={() => onCambiar(totalPaginas)} aria-label="Última página">»</button>
            </div>
        </div>
    );
}
