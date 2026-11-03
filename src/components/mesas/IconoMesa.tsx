// Dibujo de mesa con sillas para las tarjetas del mapa
export default function IconoMesa({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {/* mesa */}
            <path d="M16 20h32" />
            <path d="M32 20v20" />
            <path d="M24 40h16" />
            {/* jarrón */}
            <path d="M29 20v-5h6v5" />
            <path d="M32 15V9" />
            <path d="M29 10c1-2 5-2 6 0" />
            {/* silla izquierda */}
            <path d="M5 12v18h11" />
            <path d="M8 30l-3 12" />
            <path d="M14 30l2 12" />
            {/* silla derecha */}
            <path d="M59 12v18H48" />
            <path d="M56 30l3 12" />
            <path d="M50 30l-2 12" />
        </svg>
    );
}
