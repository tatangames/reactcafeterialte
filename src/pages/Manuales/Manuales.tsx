import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import { inputClass } from '../../components/form/FormField';
import { useAuth } from '../../context/AuthContext';
import { getManuales, ManualInterface, ModuloManualInterface, textoManual } from '../../services/manuales';
import { mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';

// Un color por módulo, para que las tarjetas se reconozcan de un vistazo
const COLORES: Record<string, string> = {
    inicio: 'from-slate-600 to-slate-800',
    ventas: 'from-fuchsia-700 to-purple-900',
    caja: 'from-emerald-600 to-emerald-800',
    clientes: 'from-sky-600 to-blue-800',
    'compras-gastos': 'from-amber-600 to-orange-800',
    inventario: 'from-cyan-600 to-teal-800',
    produccion: 'from-orange-600 to-red-800',
    reportes: 'from-indigo-600 to-indigo-900',
    configuracion: 'from-gray-600 to-gray-800',
    seguridad: 'from-rose-600 to-rose-900',
};
const color = (modulo: string) => COLORES[modulo] ?? 'from-gray-600 to-gray-800';

export default function Manuales() {
    const { id } = useParams();
    const { hasAnyPermission } = useAuth();
    const [modulos, setModulos] = useState<ModuloManualInterface[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getManuales().then(r => setModulos(r.modulos)).catch(e => setError(mensajeError(e, 'No se pudieron cargar los manuales')));
    }, []);

    // Sin permisos en el manual = lo puede leer cualquiera (Primeros pasos)
    const puedeUsar = (m: ManualInterface) => !m.permisos.length || hasAnyPermission(m.permisos);

    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!modulos) return <div className="p-6 text-gray-500">Cargando manuales…</div>;

    const todos = modulos.flatMap(mo => mo.manuales.map(m => ({ ...m, modulo: mo.id })));
    const manual = id ? todos.find(m => m.id === id) : undefined;
    if (id) {
        return manual
            ? <DetalleManual manual={manual} modulo={modulos.find(mo => mo.id === manual.modulo)!} todos={todos} puedeUsar={puedeUsar} />
            : <div className="p-6">No existe ese manual. <Link to="/manuales" className="text-blue-600 hover:underline">Ver todos</Link></div>;
    }
    return <ListaManuales modulos={modulos} puedeUsar={puedeUsar} />;
}

function ListaManuales({ modulos, puedeUsar }: { modulos: ModuloManualInterface[]; puedeUsar: (m: ManualInterface) => boolean }) {
    const { hasPermission } = useAuth();
    const puedeRoles = hasPermission('roles.gestionar');
    const [buscar, setBuscar] = useState('');
    const [soloMios, setSoloMios] = useState(true);
    const [modulo, setModulo] = useState('');

    // El buscador revisa todo el contenido (pasos, ejemplos y preguntas), no solo el título
    const indice = useMemo(() => new Map(modulos.flatMap(mo => mo.manuales).map(m => [m.id, textoManual(m)])), [modulos]);
    const palabras = sinTildes(buscar.trim()).split(/\s+/).filter(Boolean);
    const coincide = (m: ManualInterface) => palabras.every(p => indice.get(m.id)!.includes(p));

    const visibles = modulos
        .filter(mo => !modulo || mo.id === modulo)
        .map(mo => ({ ...mo, manuales: mo.manuales.filter(m => (!soloMios || puedeUsar(m)) && coincide(m)) }))
        .filter(mo => mo.manuales.length);
    const ocultos = modulos.flatMap(mo => mo.manuales).filter(m => !puedeUsar(m)).length;

    return (
        <div className="p-4 sm:p-6">
            <PageHeader title="Manuales" subtitle="Cómo usar cada parte del sistema: paso a paso, casos de uso y preguntas frecuentes"
                actions={puedeRoles ? <Link to="/manuales/permisos" className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Qué manuales ve cada rol</Link> : undefined} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input className={`${inputClass} min-w-[260px] flex-1`} value={buscar} onChange={e => setBuscar(e.target.value)}
                    placeholder="Buscar: cerrar turno, crédito, merma, sin azúcar, impresora…" autoFocus />
                {ocultos > 0 && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={soloMios} onChange={e => setSoloMios(e.target.checked)} className="h-4 w-4" />
                        Solo lo que puedo usar
                    </label>
                )}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                <button type="button" onClick={() => setModulo('')}
                    className={`h-[38px] rounded-lg px-4 text-sm font-medium ${!modulo ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Todos
                </button>
                {modulos.map(mo => (
                    <button key={mo.id} type="button" onClick={() => setModulo(mo.id)}
                        className={`h-[38px] rounded-lg px-4 text-sm font-medium ${modulo === mo.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {mo.titulo.replace(/^Módulo /, '').replace(/^./, c => c.toUpperCase())}
                    </button>
                ))}
            </div>

            {visibles.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    Ningún manual habla de «{buscar}».{soloMios && ocultos > 0 ? ' Prueba quitando «Solo lo que puedo usar».' : ''}
                </div>
            )}

            <div className="space-y-8">
                {visibles.map(mo => (
                    <section key={mo.id}>
                        <h2 className="text-lg font-semibold uppercase tracking-wide text-gray-800 dark:text-white/90">{mo.titulo}</h2>
                        <p className="mb-3 text-sm text-gray-500">{mo.descripcion}</p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {mo.manuales.map(m => <TarjetaManual key={m.id} manual={m} modulo={mo.id} disponible={puedeUsar(m)} />)}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

function TarjetaManual({ manual: m, modulo, disponible }: { manual: ManualInterface; modulo: string; disponible: boolean }) {
    const pasos = m.secciones.reduce((t, s) => t + (s.pasos?.length ?? 0), 0);
    return (
        <Link to={`/manuales/${m.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03]">
            <div className={`flex h-24 items-end bg-gradient-to-br p-4 ${color(modulo)}`}>
                <h3 className="text-lg font-semibold leading-tight text-white">{m.titulo}</h3>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
                <p className="flex-1 text-sm text-gray-600 dark:text-gray-400">{m.resumen}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                    {m.donde.web && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">Web</span>}
                    {m.donde.tablet && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Tablet</span>}
                    {pasos > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{pasos} pasos</span>}
                    {(m.ejemplos?.length ?? 0) > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{m.ejemplos!.length} caso(s) de uso</span>}
                    {!disponible && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">Tu rol no lo tiene</span>}
                </div>
                <span className="rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white group-hover:bg-blue-700">Ver manual</span>
            </div>
        </Link>
    );
}

function DetalleManual({ manual: m, modulo, todos, puedeUsar }: {
    manual: ManualInterface;
    modulo: ModuloManualInterface;
    todos: (ManualInterface & { modulo: string })[];
    puedeUsar: (m: ManualInterface) => boolean;
}) {
    const navigate = useNavigate();
    const relacionados = (m.relacionados ?? []).map(r => todos.find(t => t.id === r)).filter(Boolean) as (ManualInterface & { modulo: string })[];
    const indice = [
        ...m.secciones.map((s, i) => ({ ancla: `s${i}`, titulo: s.titulo })),
        ...(m.ejemplos?.length ? [{ ancla: 'casos', titulo: 'Casos de uso' }] : []),
        ...(m.preguntas?.length ? [{ ancla: 'preguntas', titulo: 'Preguntas frecuentes' }] : []),
    ];
    const ir = (ancla: string) => document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Anterior y siguiente dentro del mismo módulo
    const posicion = modulo.manuales.findIndex(x => x.id === m.id);
    const anterior = modulo.manuales[posicion - 1];
    const siguiente = modulo.manuales[posicion + 1];

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
                <button type="button" onClick={() => navigate('/manuales')} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">← Manuales</button>
                <span className="text-sm text-gray-500">{modulo.titulo}</span>
                <button type="button" onClick={() => window.print()} className="ml-auto rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Imprimir</button>
            </div>

            <div className={`mb-6 rounded-2xl bg-gradient-to-br p-6 text-white ${color(modulo.id)}`}>
                <h1 className="text-2xl font-semibold sm:text-3xl">{m.titulo}</h1>
                <p className="mt-2 max-w-3xl text-white/90">{m.resumen}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    {m.donde.web && <span className="rounded-lg bg-white/15 px-3 py-1.5"><b>Web:</b> {m.donde.web}</span>}
                    {m.donde.tablet && <span className="rounded-lg bg-white/15 px-3 py-1.5"><b>Tablet:</b> {m.donde.tablet}</span>}
                    {!puedeUsar(m) && <span className="rounded-lg bg-red-500/80 px-3 py-1.5">Tu rol no tiene acceso: pídeselo al administrador</span>}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <nav className="hidden lg:block print:hidden">
                    <div className="sticky top-24 space-y-1">
                        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">En este manual</p>
                        {indice.map(x => (
                            <button key={x.ancla} type="button" onClick={() => ir(x.ancla)}
                                className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100">{x.titulo}</button>
                        ))}
                    </div>
                </nav>

                <article className="min-w-0 max-w-4xl space-y-6">
                    {m.secciones.map((s, i) => (
                        <section key={i} id={`s${i}`} className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">{s.titulo}</h2>
                            {s.texto && <p className="mb-3 text-gray-700 dark:text-gray-300">{s.texto}</p>}
                            {s.pasos && <Pasos pasos={s.pasos} />}
                            {s.puntos && (
                                <ul className="space-y-2">
                                    {s.puntos.map((p, j) => (
                                        <li key={j} className="flex gap-2 text-gray-700 dark:text-gray-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{p}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}

                    {(m.ejemplos?.length ?? 0) > 0 && (
                        <section id="casos" className="scroll-mt-24 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Casos de uso</h2>
                            {m.ejemplos!.map((e, i) => (
                                <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
                                    <p className="mb-3 font-semibold text-amber-900 dark:text-amber-200">Ejemplo: {e.titulo}</p>
                                    <Pasos pasos={e.pasos} tono="amber" />
                                </div>
                            ))}
                        </section>
                    )}

                    {(m.preguntas?.length ?? 0) > 0 && (
                        <section id="preguntas" className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Preguntas frecuentes</h2>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {m.preguntas!.map((q, i) => (
                                    <details key={i} className="group py-3" open>
                                        <summary className="cursor-pointer list-none font-medium text-gray-800 dark:text-white/90">
                                            <span className="mr-2 text-blue-600 group-open:hidden">+</span><span className="mr-2 hidden text-blue-600 group-open:inline">−</span>{q.p}
                                        </summary>
                                        <p className="mt-2 pl-5 text-gray-600 dark:text-gray-400">{q.r}</p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    )}

                    {relacionados.length > 0 && (
                        <section className="print:hidden">
                            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">También te puede servir</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {relacionados.map(r => (
                                    <Link key={r.id} to={`/manuales/${r.id}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                                        <p className="font-medium text-gray-800 dark:text-white/90">{r.titulo}</p>
                                        <p className="text-sm text-gray-500">{r.resumen}</p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="flex justify-between gap-3 print:hidden">
                        {anterior ? <Link to={`/manuales/${anterior.id}`} className="text-sm text-blue-600 hover:underline">← {anterior.titulo}</Link> : <span />}
                        {siguiente && <Link to={`/manuales/${siguiente.id}`} className="text-sm text-blue-600 hover:underline">{siguiente.titulo} →</Link>}
                    </div>
                </article>
            </div>
        </div>
    );
}

function Pasos({ pasos, tono = 'blue' }: { pasos: string[]; tono?: 'blue' | 'amber' }) {
    return (
        <ol className="space-y-3">
            {pasos.map((p, i) => (
                <li key={i} className="flex gap-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${tono === 'amber' ? 'bg-amber-600' : 'bg-blue-600'}`}>{i + 1}</span>
                    <span className="pt-0.5 text-gray-700 dark:text-gray-300">{p}</span>
                </li>
            ))}
        </ol>
    );
}
