import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import PageHeader from "../../components/common/PageHeader";
import Paginacion from "../../components/common/Paginacion";
import { colorTipo } from "../../components/header/NotificacionesBell";
import {
    borrarNotificacion,
    getNotificaciones,
    haceCuanto,
    leerTodas,
    marcarLeida,
    NotificacionInterface,
    vaciarNotificaciones,
} from "../../services/notificaciones";
import { PaginaInterface } from "../../types/interfaces";
import { mensajeError, fechaHora, fechaLocal } from "../../utils/formato";
import Cargando from '../../components/ui/loading/Cargando';

type Estado = "" | "no_leidas" | "leidas";
const FILTROS: [Estado, string][] = [["", "Todas"], ["no_leidas", "Sin ver"], ["leidas", "Vistas"]];

const botonSecundario = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40";

export default function Notificaciones() {
    const navigate = useNavigate();
    const [estado, setEstado] = useState<Estado>("");
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<(PaginaInterface & { notificaciones: NotificacionInterface[]; no_leidas: number }) | null>(null);

    const cargar = useCallback(() => {
        getNotificaciones({ estado, page: pagina })
            .then((res) => {
                // Si se borró lo último de una página, volver a la anterior
                if (res.notificaciones.length === 0 && pagina > 1) setPagina(pagina - 1);
                else setDatos(res);
            })
            .catch((e) => toast.error(mensajeError(e, "Error al cargar las notificaciones")));
    }, [estado, pagina]);

    useEffect(() => { cargar(); }, [cargar]);

    const accion = (promesa: Promise<unknown>, ok?: string) =>
        promesa
            .then(() => { if (ok) toast.success(ok); cargar(); })
            .catch((e) => toast.error(mensajeError(e, "No se pudo completar")));

    const vaciar = (soloLeidas: boolean) => {
        const pregunta = soloLeidas ? "¿Borrar todas las notificaciones ya vistas?" : "¿Borrar TODAS tus notificaciones?";
        if (!window.confirm(pregunta)) return;
        vaciarNotificaciones(soloLeidas)
            .then((r) => { toast.success(r.message); setPagina(1); cargar(); })
            .catch((e) => toast.error(mensajeError(e, "No se pudieron borrar")));
    };

    const abrir = (n: NotificacionInterface) => {
        if (!n.leida) marcarLeida(n.id).catch(() => null);
        if (n.enlace) navigate(n.enlace);
    };

    const noLeidas = datos?.no_leidas ?? 0;

    return (
        <div className="p-6">
            <PageHeader
                title="Notificaciones"
                subtitle="Avisos de productos que llegaron a su mínimo o quedaron en negativo. Solo se avisa una vez: si sigue bajo no se repite hasta que se reponga y vuelva a bajar."
                actions={
                    <>
                        <button type="button" className={botonSecundario} disabled={noLeidas === 0}
                            onClick={() => accion(leerTodas(), "Todas marcadas como vistas")}>
                            Marcar todas como vistas
                        </button>
                        <button type="button" className={botonSecundario} onClick={() => vaciar(true)}>Borrar vistas</button>
                        <button type="button" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            onClick={() => vaciar(false)}>
                            Borrar todas
                        </button>
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap gap-2">
                {FILTROS.map(([valor, texto]) => (
                    <button
                        key={valor}
                        type="button"
                        onClick={() => { setEstado(valor); setPagina(1); }}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium ${estado === valor ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        {texto}
                        {valor === "no_leidas" && noLeidas > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[11px] text-white">{noLeidas}</span>}
                    </button>
                ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <ul className="divide-y divide-gray-100">
                    {!datos && <li><Cargando /></li>}
                    {datos?.notificaciones.length === 0 && (
                        <li className="px-4 py-10 text-center text-gray-500">
                            {estado === "no_leidas" ? "Estás al día, no hay nada sin ver" : "No hay notificaciones"}
                        </li>
                    )}
                    {datos?.notificaciones.map((n) => (
                        <li key={n.id} className={`flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap ${n.leida ? "" : "bg-blue-50/40"}`}>
                            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.leida ? "bg-gray-300" : colorTipo(n)}`} />
                            <button type="button" onClick={() => abrir(n)} className="min-w-0 flex-1 text-left">
                                <span className={`block text-sm ${n.leida ? "text-gray-700" : "font-semibold text-gray-900"}`}>{n.titulo}</span>
                                {n.mensaje && <span className="block text-sm text-gray-500">{n.mensaje}</span>}
                                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                    <span title={fechaHora(fechaLocal(new Date(n.fecha)) + " " + new Date(n.fecha).toTimeString().slice(0, 5))}>{haceCuanto(n.fecha)}</span>
                                    {n.sigue_en_alerta === true && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">sigue bajo</span>}
                                    {n.sigue_en_alerta === false && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">ya repuesto</span>}
                                </span>
                            </button>
                            <div className="flex shrink-0 gap-1">
                                <button type="button" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                                    onClick={() => accion(marcarLeida(n.id, !n.leida))}>
                                    {n.leida ? "Marcar sin ver" : "Marcar vista"}
                                </button>
                                <button type="button" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                    onClick={() => accion(borrarNotificacion(n.id))} aria-label={`Borrar: ${n.titulo}`}>
                                    Borrar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
