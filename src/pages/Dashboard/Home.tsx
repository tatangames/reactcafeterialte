import { ReactNode, useEffect, useState } from "react";
import FechaInput from "../../components/form/FechaInput";
import { Link, useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import toast from "react-hot-toast";

import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { getConfiguracionNegocio } from "../../services/configuracion";
import { STORAGE_URL } from "../../services/api";
import { getPanel, PanelInterface } from "../../services/reportes";
import { cantidad, dinero, fechaCorta, fechaLocal, haceDias, hoyLocal, mensajeError } from "../../utils/formato";
import Cargando from '../../components/ui/loading/Cargando';

const tarjeta = "rounded-xl border border-gray-200 bg-white";
const campo = "h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none";

type Periodo = "hoy" | "ayer" | "semana" | "mes" | "mes_pasado" | "30" | "personalizado";

// Rango de cada atajo, como el selector «o» de KOLO
function rangoDe(periodo: Periodo): { desde: string; hasta: string } | null {
    const hoy = new Date();
    switch (periodo) {
        case "hoy": return { desde: hoyLocal(), hasta: hoyLocal() };
        case "ayer": return { desde: haceDias(1), hasta: haceDias(1) };
        case "semana": return { desde: haceDias((hoy.getDay() + 6) % 7), hasta: hoyLocal() }; // desde el lunes
        case "mes": return { desde: hoyLocal().slice(0, 8) + "01", hasta: hoyLocal() };
        case "mes_pasado": {
            const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
            return { desde: fechaLocal(new Date(fin.getFullYear(), fin.getMonth(), 1)), hasta: fechaLocal(fin) };
        }
        case "30": return { desde: haceDias(29), hasta: hoyLocal() };
        default: return null;
    }
}

const PERIODOS: { valor: Periodo; texto: string }[] = [
    { valor: "hoy", texto: "Hoy" },
    { valor: "ayer", texto: "Ayer" },
    { valor: "semana", texto: "Esta semana" },
    { valor: "mes", texto: "Este mes" },
    { valor: "mes_pasado", texto: "Mes pasado" },
    { valor: "30", texto: "Últimos 30 días" },
    { valor: "personalizado", texto: "Personalizado" },
];

const ESTADOS: Record<string, { texto: string; clase: string }> = {
    completada: { texto: "Confirmada", clase: "text-gray-700" },
    devuelta: { texto: "Con devolución", clase: "text-amber-700" },
    anulada: { texto: "Anulada", clase: "text-red-600" },
};

function Icono({ fondo, children }: { fondo: string; children: ReactNode }) {
    return (
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${fondo}`}>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
        </div>
    );
}

function Total({ titulo, valor, detalle, icono, destacado }: { titulo: string; valor: string; detalle?: string; icono?: ReactNode; destacado?: boolean }) {
    return (
        <div className={`flex items-start justify-between gap-3 rounded-xl p-5 ${destacado ? "bg-blue-800 text-white" : "border border-gray-200 bg-white"}`}>
            <div className="min-w-0">
                <p className={`text-sm font-semibold uppercase tracking-wide ${destacado ? "text-blue-100" : "text-gray-600"}`}>{titulo}</p>
                <p className={`mt-1 text-3xl font-bold ${destacado ? "text-white" : "text-gray-900"}`}>{valor}</p>
                {detalle && <p className={`mt-1 text-sm ${destacado ? "text-blue-100" : "text-gray-500"}`}>{detalle}</p>}
            </div>
            {icono}
        </div>
    );
}

function Indicador({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: "rojo" | "verde" }) {
    return (
        <div className={`${tarjeta} p-4`}>
            <p className="text-xs text-gray-500">{titulo}</p>
            <p className="text-2xl font-semibold text-gray-900">{valor}</p>
            {detalle && <p className={`text-sm ${tono === "rojo" ? "text-red-600" : tono === "verde" ? "text-green-700" : "text-gray-500"}`}>{detalle}</p>}
        </div>
    );
}

// Panel de inicio al estilo KOLO: totales del periodo, últimos pedidos y más vendidos; abajo, cómo va el día
export default function Home() {
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [panel, setPanel] = useState<PanelInterface | null>(null);
    const [negocio, setNegocio] = useState("");
    const [periodo, setPeriodo] = useState<Periodo>("mes");
    const [rango, setRango] = useState(rangoDe("mes")!);

    // Sin permiso de panel solo se muestran el saludo y los accesos
    const verPanel = hasPermission("dashboard.ver") || hasPermission("reportes.ver");

    useEffect(() => { getConfiguracionNegocio().then((n) => setNegocio(n.nombre)).catch(() => null); }, []);

    useEffect(() => {
        if (!verPanel || !rango.desde || !rango.hasta || rango.desde > rango.hasta) return;
        const cargar = () => getPanel(rango).then(setPanel).catch((e) => toast.error(mensajeError(e, "No se pudo cargar el panel")));
        cargar();
        const intervalo = setInterval(cargar, 120000); // se refresca solo cada 2 minutos
        return () => clearInterval(intervalo);
    }, [verPanel, rango]);

    const elegirPeriodo = (p: Periodo) => {
        setPeriodo(p);
        const r = rangoDe(p);
        if (r) setRango(r);
    };
    const cambiarFecha = (cambio: Partial<typeof rango>) => {
        setPeriodo("personalizado");
        setRango({ ...rango, ...cambio });
    };

    const horas: ApexOptions = {
        chart: { toolbar: { show: false }, fontFamily: "inherit" },
        colors: ["#2563eb"],
        plotOptions: { bar: { borderRadius: 3, columnWidth: "55%" } },
        dataLabels: { enabled: false },
        xaxis: { categories: panel?.por_hora.map((h) => `${h.hora}:00`) ?? [] },
        yaxis: { labels: { formatter: (v: number) => dinero(v, "$", 0) } },
        tooltip: { y: { formatter: (v: number) => dinero(v) } },
        grid: { borderColor: "#f1f5f9" },
    };

    const mensual: ApexOptions = {
        chart: { toolbar: { show: false }, fontFamily: "inherit" },
        colors: ["#2563eb", "#16a34a"],
        stroke: { width: 3, curve: "smooth" },
        dataLabels: { enabled: false },
        xaxis: { categories: panel?.ultimos_30?.map((d) => fechaCorta(d.fecha).slice(0, 5)) ?? [], tickAmount: 10 },
        yaxis: { labels: { formatter: (v: number) => dinero(v, "$", 0) } },
        tooltip: { y: { formatter: (v: number) => dinero(v) } },
        legend: { position: "top" },
        grid: { borderColor: "#f1f5f9" },
    };

    const v = panel?.ventas;
    const a = panel?.alertas;
    const r = panel?.rango;
    const financiero = r?.utilidad_bruta !== undefined;
    const filtro = `desde=${rango.desde}&hasta=${rango.hasta}`;

    return (
        <>
            <PageMeta title="Inicio | Panadería Eduardo" description="Panel de inicio" />
            <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{negocio || "Inicio"}</h1>
                        <p className="text-sm text-gray-500">Hola, {user?.nombre?.split(" ")[0]}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {hasPermission("pos.vender") && <Link to="/pos" className="px-5 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">Abrir punto de venta</Link>}
                        {hasPermission("caja.abrir") && <Link to="/caja" className="px-5 py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">Caja</Link>}
                        {hasPermission("reportes.ver") && <Link to="/reportes" className="px-5 py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">Reportes</Link>}
                    </div>
                </div>

                {verPanel && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-4xl">
                        <label className="text-sm text-gray-600">Desde
                            <FechaInput value={rango.desde} max={rango.hasta || undefined} onChange={(v) => cambiarFecha({ desde: v })} className={`${campo} mt-1`} />
                        </label>
                        <label className="text-sm text-gray-600">Hasta
                            <FechaInput value={rango.hasta} min={rango.desde || undefined} max={hoyLocal()} onChange={(v) => cambiarFecha({ hasta: v })} className={`${campo} mt-1`} />
                        </label>
                        <label className="text-sm text-gray-600">o
                            <select value={periodo} onChange={(e) => elegirPeriodo(e.target.value as Periodo)} className={`${campo} mt-1`}>
                                {PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.texto}</option>)}
                            </select>
                        </label>
                    </div>
                )}

                {verPanel && !panel && <Cargando texto="Cargando panel..." />}

                {panel && v && a && r && (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Total titulo="Total de ventas" valor={dinero(r.total_ventas)} detalle={`${r.tickets} ticket(s)`}
                                icono={<Icono fondo="bg-amber-100 text-amber-600"><path d="M9 3h6l-1.5 3h-3L9 3Z" /><path d="M10.5 6C6 8 4 12 4 15.5 4 19 7 21 12 21s8-2 8-5.5C20 12 18 8 13.5 6" /><path d="M12 11v6M10 12.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-.9 1.2-2 1.5-2 .7-2 1.5.9 1.5 2 1.5 2-.7 2-1.5" /></Icono>} />
                            {financiero ? (
                                <>
                                    <Total titulo="Total de gastos" valor={dinero(r.total_gastos)}
                                        icono={<Icono fondo="bg-blue-100 text-blue-600"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15v2M8 18h2M12 18h2" /></Icono>} />
                                    <Total destacado titulo="Utilidad bruta" valor={dinero(r.utilidad_bruta)}
                                        detalle={`Después de gastos: ${dinero(r.utilidad_neta)}`} />
                                </>
                            ) : (
                                <>
                                    <Total titulo="Ticket promedio" valor={dinero(r.tickets > 0 ? r.total_ventas / r.tickets : 0)} />
                                    <Total destacado titulo="Ventas de hoy" valor={dinero(v.hoy)} detalle={`${v.tickets} ticket(s)`} />
                                </>
                            )}
                        </div>

                        {(a.stock_bajo > 0 || a.pedidos_hoy > 0 || a.pedidos_atrasados > 0) && (
                            <div className="flex flex-wrap gap-2">
                                {a.stock_bajo > 0 && <Link to="/admin/inventario" className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">⚠ {a.stock_bajo} producto(s) bajo el mínimo</Link>}
                                {a.pedidos_hoy > 0 && <Link to="/pedidos-especiales" className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100">🎂 {a.pedidos_hoy} pedido(s) para entregar hoy</Link>}
                                {a.pedidos_atrasados > 0 && <Link to="/pedidos-especiales" className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">{a.pedidos_atrasados} pedido(s) atrasado(s)</Link>}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                            <div className={`${tarjeta} flex flex-col`}>
                                <div className="px-5 pt-5 pb-3">
                                    <h2 className="text-2xl font-bold text-blue-800">Últimos pedidos</h2>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{r.total_pedidos} pedido(s) en total</p>
                                </div>
                                <div className="flex-1 overflow-x-auto px-5">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-y border-gray-200 text-left text-xs font-semibold uppercase text-gray-700">
                                                <th className="px-3 py-3">Código</th>
                                                <th className="px-3 py-3">Cliente</th>
                                                <th className="px-3 py-3">Fecha</th>
                                                <th className="px-3 py-3">Pago</th>
                                                <th className="px-3 py-3">Estado</th>
                                                <th className="px-3 py-3 text-right">Total</th>
                                                <th className="w-12" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {r.ultimos_pedidos.length === 0 && (
                                                <tr><td colSpan={7} className="py-10 text-center text-gray-500">No hay pedidos en este periodo</td></tr>
                                            )}
                                            {r.ultimos_pedidos.map((p) => (
                                                <tr key={p.id} className="border-b border-gray-100 text-gray-700 odd:bg-slate-50">
                                                    <td className="px-3 py-3 font-medium">{p.numero}</td>
                                                    <td className="px-3 py-3">{p.cliente}</td>
                                                    <td className="px-3 py-3 whitespace-nowrap">{fechaCorta(p.fecha)} {p.fecha.slice(11, 16)}</td>
                                                    <td className="px-3 py-3">{p.pago || "—"}</td>
                                                    <td className={`px-3 py-3 ${ESTADOS[p.estado]?.clase ?? ""}`}>{ESTADOS[p.estado]?.texto ?? p.estado}</td>
                                                    <td className="px-3 py-3 text-right whitespace-nowrap">{dinero(p.total)}</td>
                                                    <td className="px-2 py-2 text-right">
                                                        <button type="button" onClick={() => navigate(`/ventas?${filtro}&venta=${p.id}`)} title="Ver detalle"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-800 text-white hover:bg-blue-900">
                                                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path d="M5.5 8l4.5 4.5L14.5 8z" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 rounded-b-xl border-t border-gray-200 bg-gray-50 px-5 py-3 text-right">
                                    <Link to={`/ventas?${filtro}`} className="text-sm text-blue-700 underline hover:text-blue-900">Ver todas las órdenes</Link>
                                </div>
                            </div>

                            <div className={`${tarjeta} flex flex-col`}>
                                <div className="px-5 pt-5 pb-3">
                                    <h2 className="text-2xl font-bold text-blue-800">Productos más vendidos</h2>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{r.total_productos} producto(s) en total</p>
                                </div>
                                <div className="flex-1 px-5">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-y border-gray-200 text-left text-xs font-semibold uppercase text-gray-700">
                                                <th className="w-14 py-3" />
                                                <th className="px-3 py-3">Nombre</th>
                                                <th className="px-3 py-3 text-right">U. vendida</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {r.mas_vendidos.length === 0 && (
                                                <tr><td colSpan={3} className="py-10 text-center text-gray-500">Sin ventas</td></tr>
                                            )}
                                            {r.mas_vendidos.map((p) => (
                                                <tr key={p.producto} className="border-b border-gray-100 text-gray-700 odd:bg-slate-50">
                                                    <td className="py-2 pl-2">
                                                        {p.imagen
                                                            ? <img src={STORAGE_URL + p.imagen} alt="" className="h-9 w-9 rounded-lg object-cover" loading="lazy" />
                                                            : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-lg">📦</span>}
                                                    </td>
                                                    <td className="px-3 py-2">{p.producto}</td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap">{cantidad(p.cantidad, p.unidad && p.unidad !== "u" ? p.unidad : "U.")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {hasPermission("reportes.ver") && (
                                    <div className="mt-4 rounded-b-xl border-t border-gray-200 bg-gray-50 px-5 py-3 text-right">
                                        <Link to={`/reportes?tipo=productos_vendidos&${filtro}`} className="text-sm text-blue-700 underline hover:text-blue-900">Ver todos los productos</Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cómo va el día */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Indicador titulo="Ventas de hoy" valor={dinero(v.hoy)}
                                detalle={v.variacion === null ? `Ayer ${dinero(v.ayer)}` : `${v.variacion >= 0 ? "+" : ""}${v.variacion}% frente a ayer`}
                                tono={v.variacion === null ? undefined : v.variacion >= 0 ? "verde" : "rojo"} />
                            <Indicador titulo="Tickets de hoy" valor={String(v.tickets)} />
                            <Indicador titulo="Ticket promedio de hoy" valor={dinero(v.ticket_promedio)} />
                            <Indicador titulo="Turnos abiertos" valor={String(a.turnos_abiertos)} />
                        </div>

                        <div className={`grid grid-cols-1 gap-4 ${panel.ultimos_30 ? "xl:grid-cols-2" : ""}`}>
                            <div className={`${tarjeta} p-4`}>
                                <p className="mb-2 font-semibold text-gray-800">Ventas por hora (hoy)</p>
                                {panel.por_hora.length === 0
                                    ? <p className="py-10 text-center text-sm text-gray-500">Aún no hay ventas hoy</p>
                                    : <Chart type="bar" height={260} options={horas} series={[{ name: "Ventas", data: panel.por_hora.map((h) => h.total) }]} />}
                            </div>
                            {panel.ultimos_30 && (
                                <div className={`${tarjeta} p-4`}>
                                    <p className="mb-2 font-semibold text-gray-800">Últimos 30 días</p>
                                    <Chart type="line" height={260} options={mensual} series={[
                                        { name: "Venta neta", data: panel.ultimos_30.map((d) => d.neto) },
                                        { name: "Utilidad estimada", data: panel.ultimos_30.map((d) => d.utilidad) },
                                    ]} />
                                </div>
                            )}
                        </div>

                        {panel.mes && panel.cartera && (
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
                                <Indicador titulo="Ventas del mes" valor={dinero(panel.mes.ventas)} />
                                <Indicador titulo="Compras del mes" valor={dinero(panel.mes.compras)} />
                                <Indicador titulo="Gastos del mes" valor={dinero(panel.mes.gastos)} />
                                <Indicador titulo="Mermas del mes" valor={dinero(panel.mes.mermas)} />
                                <Indicador titulo="Por cobrar a clientes" valor={dinero(panel.cartera.por_cobrar)}
                                    detalle={panel.cartera.por_cobrar_vencido > 0 ? `${dinero(panel.cartera.por_cobrar_vencido)} vencido` : undefined} tono="rojo" />
                                <Indicador titulo="Por pagar a proveedores" valor={dinero(panel.cartera.por_pagar)}
                                    detalle={panel.cartera.por_pagar_semana > 0 ? `${dinero(panel.cartera.por_pagar_semana)} vence esta semana` : undefined} tono="rojo" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
