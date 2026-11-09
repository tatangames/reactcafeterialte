import { TurnoDetalleInterface } from "../../types/caja";
import { cantidad, dinero, fechaHora } from "../../utils/formato";

interface Props {
    detalle: TurnoDetalleInterface;
    negocio?: string;
}

const Fila = ({ etiqueta, valor, fuerte, color }: { etiqueta: string; valor: string; fuerte?: boolean; color?: string }) => (
    <div className={`flex justify-between gap-4 py-0.5 ${fuerte ? "font-semibold" : ""} ${color ?? ""}`}>
        <span>{etiqueta}</span>
        <span className="text-right">{valor}</span>
    </div>
);

// Reporte del turno con formato de ticket (80 mm). Se imprime con window.print()
export default function TurnoReporte({ detalle, negocio = "Panadería Eduardo" }: Props) {
    const { turno, resumen, arqueos } = detalle;
    const cierre = arqueos.find((a) => a.tipo === "cierre");
    const diferencia = turno.diferencia;

    return (
        <div className="area-impresion mx-auto w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 font-mono text-[13px] text-gray-800">
            <div className="text-center">
                <p className="text-base font-bold">{negocio}</p>
                <p>{turno.estado === "cerrado" ? "CIERRE DE CAJA" : "CORTE PARCIAL (TURNO ABIERTO)"}</p>
                <p>{turno.caja} · Turno #{turno.id}</p>
            </div>

            <hr className="my-2 border-dashed border-gray-400" />
            <Fila etiqueta="Apertura" valor={fechaHora(turno.abierto_at)} />
            <Fila etiqueta="Abrió" valor={turno.usuario_apertura ?? "—"} />
            {turno.cerrado_at && <Fila etiqueta="Cierre" valor={fechaHora(turno.cerrado_at)} />}
            {turno.usuario_cierre && <Fila etiqueta="Cerró" valor={turno.usuario_cierre} />}

            <hr className="my-2 border-dashed border-gray-400" />
            <Fila etiqueta="Fondo inicial" valor={dinero(resumen.fondo_inicial)} />
            <Fila etiqueta="Ventas" valor={dinero(resumen.totales.ventas)} />
            {resumen.totales.devoluciones > 0 && <Fila etiqueta="Devoluciones" valor={`-${dinero(resumen.totales.devoluciones)}`} />}
            <Fila etiqueta="Ingresos" valor={dinero(resumen.totales.ingresos)} />
            <Fila etiqueta="Egresos" valor={`-${dinero(resumen.totales.egresos)}`} />

            <hr className="my-2 border-dashed border-gray-400" />
            <p className="font-semibold">Por forma de pago</p>
            {resumen.por_metodo.map((m) => (
                <Fila key={m.metodo_pago_id} etiqueta={m.nombre} valor={dinero(m.neto)} />
            ))}

            {resumen.ventas_por_usuario.length > 0 && (
                <>
                    <hr className="my-2 border-dashed border-gray-400" />
                    <p className="font-semibold">Ventas por empleado</p>
                    {resumen.ventas_por_usuario.map((v) => (
                        <Fila key={v.usuario_id} etiqueta={`${v.usuario ?? "—"} (${v.cantidad})`} valor={dinero(v.total)} />
                    ))}
                </>
            )}

            <hr className="my-2 border-dashed border-gray-400" />
            {resumen.efectivo_esperado !== null && <Fila etiqueta="Efectivo esperado" valor={dinero(resumen.efectivo_esperado)} fuerte />}
            {turno.efectivo_contado !== null && <Fila etiqueta="Efectivo contado" valor={dinero(turno.efectivo_contado)} fuerte />}
            {diferencia !== null && (
                <Fila
                    etiqueta={diferencia < 0 ? "Faltante" : diferencia > 0 ? "Sobrante" : "Diferencia"}
                    valor={dinero(Math.abs(diferencia))}
                    fuerte
                    color={diferencia < 0 ? "text-red-600" : diferencia > 0 ? "text-green-700" : ""}
                />
            )}

            {cierre?.denominaciones && (
                <>
                    <hr className="my-2 border-dashed border-gray-400" />
                    <p className="font-semibold">Conteo</p>
                    {Object.entries(cierre.denominaciones)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([valor, cantidad]) => (
                            <Fila key={valor} etiqueta={`${cantidad} × ${dinero(valor)}`}
                                valor={dinero((Math.round(Number(valor) * 100) * cantidad) / 100)} />
                        ))}
                </>
            )}

            {turno.observaciones_cierre && (
                <>
                    <hr className="my-2 border-dashed border-gray-400" />
                    <p>Obs.: {turno.observaciones_cierre}</p>
                </>
            )}

            {/* Lo que el siguiente turno tiene que comprar (se apaga en Datos del negocio) */}
            {resumen.ticket_por_comprar !== false && (
                <>
                    <hr className="my-2 border-dashed border-gray-400" />
                    <p className="font-semibold">POR COMPRAR</p>
                    {(resumen.por_comprar ?? []).length === 0 && <p>Nada bajo el mínimo</p>}
                    {(resumen.por_comprar ?? []).map((p) => (
                        <Fila key={p.producto_id} etiqueta={p.producto}
                            valor={`hay ${cantidad(p.stock_actual, p.unidad)} / mín ${cantidad(p.stock_minimo)}`} />
                    ))}
                </>
            )}

            <div className="mt-8 grid grid-cols-2 gap-6 text-center text-xs">
                <div className="border-t border-gray-500 pt-1">Cajero</div>
                <div className="border-t border-gray-500 pt-1">Supervisor</div>
            </div>
        </div>
    );
}
