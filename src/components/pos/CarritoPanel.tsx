import QtyStepper from "../form/QtyStepper";
import { LineaCarritoInterface } from "../../types/pos";
import { claveDe, detalleDe, precioDe, TotalesCarrito } from "../../utils/carrito";
import { cantidad, dinero } from "../../utils/formato";

interface Props {
    lineas: LineaCarritoInterface[];
    totales: TotalesCarrito;
    precuenta: { numero: string; nombre: string; tipo?: "precuenta" | "especial"; anticipo?: number } | null;
    cliente: { nombre: string; saldo: number; limite_credito: number; credito_disponible: number } | null;
    tieneDescuentoGlobal: boolean;
    puedeDescontar: boolean;
    puedePrecuentas: boolean;
    onCantidad: (clave: string, cantidad: number) => void;
    onEditarCantidad: (linea: LineaCarritoInterface) => void;
    onEditarLinea: (linea: LineaCarritoInterface) => void;     // extras, cantidad y nota
    onIngredientes: (linea: LineaCarritoInterface) => void;    // sin huevo, azúcar extra
    // Enviar comanda sin cobrar (queda en «Por cobrar»); agregandoA: se suma a ese pedido
    agregandoA: string | null;
    onEnviarComanda: () => void;
    onNoAgregar: () => void;
    onDescuentoLinea: (linea: LineaCarritoInterface) => void;
    onDescuentoGlobal: () => void;
    onGuardarPrecuenta: () => void;
    onVaciar: () => void;
    onCobrar: () => void;
}

// Panel derecho del POS: líneas del carrito, totales y acciones
export default function CarritoPanel({
    lineas, totales, precuenta, cliente, tieneDescuentoGlobal, puedeDescontar, puedePrecuentas,
    onCantidad, onEditarCantidad, onDescuentoLinea, onDescuentoGlobal, onGuardarPrecuenta, onVaciar, onCobrar,
    onEditarLinea, onIngredientes, agregandoA, onEnviarComanda, onNoAgregar,
}: Props) {
    const vacio = lineas.length === 0;
    const especial = precuenta?.tipo === "especial";
    const anticipo = especial ? precuenta?.anticipo ?? 0 : 0;

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                    <p className="font-semibold text-gray-800">{precuenta ? precuenta.nombre : "Venta actual"}</p>
                    <p className="text-xs text-gray-500">{precuenta ? `${especial ? "Pedido especial" : "Precuenta"} ${precuenta.numero}` : `${lineas.length} producto(s)`}</p>
                </div>
                {!vacio && (
                    <button type="button" onClick={onVaciar} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Vaciar</button>
                )}
            </div>

            {/* Ya no se asigna cliente a mano: solo se muestra el del encargo que se entrega */}
            {cliente && (
                <div className="border-b border-gray-100 bg-blue-50/60 px-4 py-2">
                    <p className="truncate text-sm font-semibold text-blue-800">👤 {cliente.nombre}</p>
                    <p className="text-xs text-blue-700/80">
                        {cliente.limite_credito > 0 ? `Crédito disponible ${dinero(cliente.credito_disponible)}` : "Sin crédito"}
                        {cliente.saldo > 0 ? ` · debe ${dinero(cliente.saldo)}` : ""}
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {vacio && (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400">
                        <span className="text-4xl">🥖</span>
                        <p className="mt-2 text-sm">Toca un producto para agregarlo</p>
                    </div>
                )}
                {lineas.map((l, i) => {
                    const calc = totales.lineas[i];
                    const clave = claveDe(l);
                    const detalle = detalleDe(l);
                    return (
                        <div key={clave} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <button type="button" onClick={() => onEditarLinea(l)} className="text-left font-medium text-gray-800 leading-tight hover:text-blue-700" title="Cambiar extras, cantidad o nota">
                                        {l.producto.nombre} <span className="text-sm text-blue-600">✎</span>
                                    </button>
                                    {detalle && <p className="text-xs font-semibold text-amber-700">{detalle}</p>}
                                    {l.notas && <p className="text-xs italic text-gray-600">“{l.notas}”</p>}
                                    <p className="text-xs text-gray-500">{dinero(precioDe(l))} {l.producto.unidad && l.producto.permite_fraccion ? `/ ${l.producto.unidad}` : "c/u"}</p>
                                    {(l.producto.receta?.length ?? 0) > 0 && (
                                        <button type="button" onClick={() => onIngredientes(l)}
                                            className="mt-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-gray-200">
                                            {l.ajustes?.length ? "Cambiar ingredientes" : "Ingredientes"}
                                        </button>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">{dinero(calc?.subtotal ?? 0)}</p>
                                    {calc?.descuento > 0 && <p className="text-xs text-green-700">−{dinero(calc.descuento)}</p>}
                                </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                {l.producto.permite_fraccion ? (
                                    <button type="button" onClick={() => onEditarCantidad(l)}
                                        className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">
                                        {cantidad(l.cantidad, l.producto.unidad)}
                                    </button>
                                ) : (
                                    <QtyStepper value={l.cantidad} min={0} onChange={(v) => onCantidad(clave, v)} ariaLabel={`Cantidad de ${l.producto.nombre}`} />
                                )}
                                {puedeDescontar && (
                                    <button type="button" onClick={() => onDescuentoLinea(l)}
                                        className={`h-10 rounded-lg px-3 text-sm ${l.descuento ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-100"}`}>
                                        {l.descuento ? (l.descuento.tipo === "porcentaje" ? `−${l.descuento.valor}%` : `−${dinero(l.descuento.valor)}`) : "% Desc."}
                                    </button>
                                )}
                                <button type="button" onClick={() => onCantidad(clave, 0)}
                                    className="ml-auto h-10 w-10 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Quitar ${l.producto.nombre}`}>
                                    ✕
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Totales */}
            <div className="border-t border-gray-200 px-4 py-3 space-y-1 text-sm">
                {totales.descuentoTotal > 0 && (
                    <>
                        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{dinero(totales.bruto)}</span></div>
                        <div className="flex justify-between text-green-700"><span>Descuentos</span><span>−{dinero(totales.descuentoTotal)}</span></div>
                    </>
                )}
                <div className="flex items-end justify-between pt-1">
                    <span className="text-gray-600">Total</span>
                    <span className={`font-bold text-gray-900 ${anticipo > 0 ? "text-xl" : "text-3xl"}`}>{dinero(totales.total)}</span>
                </div>
                {anticipo > 0 && (
                    <>
                        <div className="flex justify-between text-green-700"><span>Anticipo recibido</span><span>−{dinero(anticipo)}</span></div>
                        <div className="flex items-end justify-between">
                            <span className="text-gray-600">Por cobrar</span>
                            <span className="text-3xl font-bold text-gray-900">{dinero(Math.max(totales.total - anticipo, 0))}</span>
                        </div>
                    </>
                )}
            </div>

            {agregandoA ? (
                <div className="space-y-2 px-4 pb-4">
                    <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-amber-800">Agregando al pedido de {agregandoA}</span>
                        <button type="button" onClick={onNoAgregar} className="font-semibold text-red-600 hover:underline">No agregar</button>
                    </div>
                    <button type="button" onClick={onEnviarComanda} disabled={vacio}
                        className="w-full py-5 rounded-xl bg-blue-600 text-xl font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                        Enviar a {agregandoA} {vacio ? "" : dinero(totales.total)}
                    </button>
                </div>
            ) : (
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                {puedeDescontar && (
                    <button type="button" onClick={onDescuentoGlobal} disabled={vacio}
                        className={`py-3 rounded-xl text-sm font-semibold disabled:opacity-40 ${tieneDescuentoGlobal ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                        Descuento general
                    </button>
                )}
                {puedePrecuentas && !especial && (
                    <button type="button" onClick={onGuardarPrecuenta} disabled={vacio}
                        className="py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-40">
                        {precuenta ? "Actualizar precuenta" : "En espera"}
                    </button>
                )}
                {!precuenta && (
                    <button type="button" onClick={onEnviarComanda} disabled={vacio} title="Sale a cocina o barra ahora y se cobra cuando el cliente recoja"
                        className="py-5 rounded-xl border-2 border-blue-600 bg-white text-base font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                        Enviar comanda
                    </button>
                )}
                <button type="button" onClick={onCobrar} disabled={vacio}
                    className={`${precuenta ? "col-span-2" : ""} py-5 rounded-xl bg-blue-600 text-xl font-bold text-white hover:bg-blue-700 active:scale-[0.99] disabled:opacity-40`}>
                    {especial ? "Entregar y cobrar" : "Cobrar"} {vacio ? "" : dinero(Math.max(totales.total - anticipo, 0))}
                </button>
            </div>
            )}
        </div>
    );
}
