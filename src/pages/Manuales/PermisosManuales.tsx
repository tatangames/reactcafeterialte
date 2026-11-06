import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import Interruptor from '../../components/form/Interruptor';
import { getPermisosManuales, guardarPermisosManuales, PermisosManualesInterface } from '../../services/manuales';
import { mensajeError } from '../../utils/formato';

// Qué manuales ve cada rol. El administrador los ve todos; aquí se elige para el mesero (y cualquier otro rol)
export default function PermisosManuales() {
    const [datos, setDatos] = useState<PermisosManualesInterface | null>(null);
    const [rolId, setRolId] = useState<number | null>(null);
    const [marcados, setMarcados] = useState<Set<string>>(new Set());
    const [guardando, setGuardando] = useState(false);

    const cargar = (elegir?: number) => getPermisosManuales().then(d => {
        setDatos(d);
        const rol = d.roles.find(r => r.id === elegir) ?? d.roles.find(r => r.nombre === 'mesero') ?? d.roles[0];
        if (rol) {
            setRolId(rol.id);
            setMarcados(new Set(rol.manuales));
        }
    }).catch(e => toast.error(mensajeError(e, 'No se pudieron cargar los permisos de los manuales')));
    useEffect(() => { cargar(); }, []);

    const rol = datos?.roles.find(r => r.id === rolId) ?? null;
    const todos = useMemo(() => (datos?.modulos ?? []).flatMap(mo => mo.manuales), [datos]);
    const usaModulo = (permisos: string[]) => !permisos.length || permisos.some(p => rol?.permisos.includes(p));

    const original = useMemo(() => new Set(rol?.manuales ?? []), [rol]);
    const agregados = [...marcados].filter(m => !original.has(m)).length;
    const quitados = [...original].filter(m => !marcados.has(m)).length;
    const hayCambios = agregados + quitados > 0;

    const elegirRol = (id: number) => {
        if (hayCambios && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
        const r = datos?.roles.find(x => x.id === id);
        setRolId(id);
        setMarcados(new Set(r?.manuales ?? []));
    };
    const alternar = (id: string) => setMarcados(m => {
        const nuevo = new Set(m);
        if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
        return nuevo;
    });
    const ponerModulo = (ids: string[], encender: boolean) => setMarcados(m => {
        const nuevo = new Set(m);
        ids.forEach(id => (encender ? nuevo.add(id) : nuevo.delete(id)));
        return nuevo;
    });

    const guardar = async () => {
        if (!rol) return;
        setGuardando(true);
        try {
            const r = await guardarPermisosManuales(rol.id, [...marcados]);
            toast.success(r.message);
            await cargar(rol.id);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    if (!datos) return <div className="p-6 text-gray-500">Cargando…</div>;

    return (
        <div className="p-4 sm:p-6 pb-28">
            <PageHeader title="Manuales por rol" backTo="/manuales"
                subtitle="Elige qué manuales ve cada rol en la web y en la tablet. El administrador los ve todos." />

            {datos.roles.length === 0 ? (
                <p className="text-gray-500">No hay roles aparte del administrador.</p>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {datos.roles.map(r => (
                            <button key={r.id} type="button" onClick={() => elegirRol(r.id)}
                                className={`h-[42px] rounded-lg px-5 text-sm font-semibold capitalize ${r.id === rolId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                {r.nombre} <span className="font-normal opacity-80">({r.usuarios} usuario{r.usuarios === 1 ? '' : 's'})</span>
                            </button>
                        ))}
                    </div>

                    {rol && !rol.ver_seccion && (
                        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                            Este rol tiene apagado «Ver los manuales de uso del sistema», así que no ve la sección aunque marques manuales aquí.
                            Actívalo en <Link to={`/admin/roles/${rol.id}/permisos`} className="font-semibold underline">Roles y permisos</Link>.
                        </div>
                    )}

                    <div className="mb-6 flex flex-wrap items-center gap-2">
                        <span className="mr-2 text-sm text-gray-600">{marcados.size} de {todos.length} manuales</span>
                        <button type="button" onClick={() => setMarcados(new Set(todos.filter(m => usaModulo(m.permisos)).map(m => m.id)))}
                            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                            title="Marca los manuales de los módulos que el rol tiene permitidos">
                            Según sus permisos
                        </button>
                        <button type="button" onClick={() => setMarcados(new Set(todos.map(m => m.id)))} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Todos</button>
                        <button type="button" onClick={() => setMarcados(new Set())} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Ninguno</button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {datos.modulos.map(mo => {
                            const ids = mo.manuales.map(m => m.id);
                            const encendidos = ids.filter(id => marcados.has(id)).length;
                            const todosMod = encendidos === ids.length;
                            return (
                                <div key={mo.id} className={`rounded-xl border bg-white dark:bg-white/[0.03] ${encendidos ? 'border-green-200' : 'border-gray-200 dark:border-gray-800'}`}>
                                    <div className="flex items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800 dark:text-white/90">{mo.titulo}</p>
                                            <p className="text-xs text-gray-500">{todosMod ? 'Todos' : encendidos ? `${encendidos} de ${ids.length}` : 'Ninguno'}</p>
                                        </div>
                                        <Interruptor etiqueta={`Todo ${mo.titulo}`} encendido={todosMod} parcial={!todosMod && encendidos > 0}
                                            onCambiar={() => ponerModulo(ids, !todosMod)} />
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {mo.manuales.map(m => (
                                            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                                                <div className="min-w-0 flex-1">
                                                    <Link to={`/manuales/${m.id}`} className="text-sm text-gray-800 hover:text-blue-600 dark:text-white/90">{m.titulo}</Link>
                                                    {!usaModulo(m.permisos) && <p className="text-xs text-amber-700">Su rol no tiene permiso para usar este módulo</p>}
                                                </div>
                                                <Interruptor etiqueta={m.titulo} encendido={marcados.has(m.id)} onCambiar={() => alternar(m.id)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hayCambios && (
                        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
                                <p className="flex-1 text-sm text-gray-700">
                                    <b className="capitalize">{rol?.nombre}</b>: {agregados > 0 && <span className="text-green-700">+{agregados} </span>}{quitados > 0 && <span className="text-red-700">−{quitados}</span>} manual(es)
                                </p>
                                <button type="button" onClick={() => setMarcados(new Set(rol?.manuales ?? []))} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Descartar</button>
                                <button type="button" onClick={guardar} disabled={guardando}
                                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                    {guardando ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
