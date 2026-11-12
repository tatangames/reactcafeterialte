// «¿Cómo funciona el crédito?» de la ficha del cliente (la misma explicación que la tablet)
const PASOS_CREDITO: { titulo: string; puntos: string[] }[] = [
    {
        titulo: "1. Darle crédito",
        puntos: [
            "Edita el cliente y ponle un límite de crédito (ej. $50) y los días para pagar (ej. 15).",
            "Con límite $0 no se le puede vender al crédito: solo de contado.",
            "Solo asigna crédito quien tiene permiso de cuentas por cobrar (el administrador).",
        ],
    },
    {
        titulo: "2. Venderle al crédito",
        puntos: [
            "Al cobrar la venta o la mesa, elige al cliente y la forma de pago Crédito.",
            "Esa venta no entra a la caja: queda como cuenta por cobrar, con vencimiento según sus días de crédito.",
            "Su saldo sube y el sistema no deja pasar su límite: avisa cuánto crédito le queda.",
        ],
    },
    {
        titulo: "3. Recibir el abono",
        puntos: [
            "Cuando viene a pagar, toca «Recibir abono». Solo se habilita si debe algo.",
            "Escribe cuánto paga (todo o una parte) y con qué: efectivo, tarjeta, transferencia.",
            "El dinero entra a la caja del turno abierto (sin turno abierto no se puede) y se aplica primero a las cuentas más viejas.",
            "Si te equivocas, el abono se anula: el dinero sale de la caja y la deuda vuelve.",
        ],
    },
];

const NOTAS_CREDITO = [
    "Debe: lo que tiene pendiente. Vencido: lo que pasó de su fecha de pago.",
    "Crédito disponible: el límite menos lo que debe.",
    "El estado de cuenta en PDF sirve para cobrarle: muestra sus ventas al crédito y sus abonos.",
];

export default function AyudaCredito() {
    return (
        <div className="mb-4 space-y-3 rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
            <p>
                «Recibir abono» es para cobrarle a un cliente <b>lo que te debe por ventas al crédito</b> (fiado). Si nunca le vendiste al crédito, debe $0.00 y el botón no se activa.
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {PASOS_CREDITO.map((p) => (
                    <div key={p.titulo} className="rounded-lg border border-blue-100 bg-white p-3">
                        <p className="mb-1 font-semibold text-gray-800">{p.titulo}</p>
                        <ul className="list-disc space-y-1 pl-4 text-gray-700">
                            {p.puntos.map((x) => <li key={x}>{x}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
            <ul className="list-disc space-y-1 pl-4">
                {NOTAS_CREDITO.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p><b>Si solo le vendes de contado</b>, déjalo con límite $0: sirve igual para su nombre en el ticket y su historial de compras.</p>
        </div>
    );
}
