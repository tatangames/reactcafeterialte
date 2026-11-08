import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import { getMatrizRol, guardarMatrizRol, MatrizRolInterface } from '../../services/seguridad';
import { mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';
import Interruptor from '../../components/form/Interruptor';
import { CargandoPagina } from '../../components/ui/loading/Cargando';

// Permisos de un rol: un interruptor por módulo (enciende o apaga todo) y uno por acción
export default function RolesPermisos() {
    const { id } = useParams();
    const [matriz, setMatriz] = useState<MatrizRolInterface | null>(null);
    const [marcados, setMarcados] = useState<Set<string>>(new Set());
    const [original, setOriginal] = useState<Set<string>>(new Set());
    const [buscar, setBuscar] = useState('');
    // Permisos con la explicación desplegada (botón «?»)
    const [conAyuda, setConAyuda] = useState<Set<string>>(new Set());
    const verAyuda = (nombre: string) => setConAyuda(s => {
        const n = new Set(s);
        if (n.has(nombre)) n.delete(nombre); else n.add(nombre);
        return n;
    });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        getMatrizRol(Number(id)).then(m => {
            const asignados = new Set(m.modulos.flatMap(g => g.permisos.filter(p => p.asignado).map(p => p.nombre)));
            setMatriz(m);
            setMarcados(asignados);
            setOriginal(asignados);
        }).catch(e => toast.error(mensajeError(e, 'No se pudo cargar el rol')));
    }, [id]);

    const cambios = useMemo(() => {
        const agregados = [...marcados].filter(p => !original.has(p));
        const quitados = [...original].filter(p => !marcados.has(p));
        return { agregados, quitados, total: agregados.length + quitados.length };
    }, [marcados, original]);

    const texto = sinTildes(buscar.trim());
    const modulos = (matriz?.modulos ?? [])
        .map(g => ({ ...g, permisos: g.permisos.filter(p => !texto || sinTildes(p.descripcion).includes(texto) || sinTildes(p.ayuda ?? '').includes(texto) || p.nombre.includes(texto) || sinTildes(g.modulo).includes(texto)) }))
        .filter(g => g.permisos.length > 0);

    const alternar = (nombre: string) => setMarcados(m => {
        const nuevo = new Set(m);
        if (nuevo.has(nombre)) nuevo.delete(nombre); else nuevo.add(nombre);
        return nuevo;
    });

    const alternarModulo = (permisos: string[], todos: boolean) => setMarcados(m => {
        const nuevo = new Set(m);
        permisos.forEach(p => (todos ? nuevo.delete(p) : nuevo.add(p)));
        return nuevo;
    });

    const guardar = async () => {
        if (!matriz) return;
        setGuardando(true);
        try {
            const res = await guardarMatrizRol(matriz.rol.id, [...marcados]);
            toast.success(res.message);
            setOriginal(new Set(marcados));
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudieron guardar los permisos'));
        } finally {
            setGuardando(false);
        }
    };

    if (!matriz) return <CargandoPagina />;
    const soloLectura = matriz.rol.es_admin;

    return (
        <div className="p-6">
            <PageHeader title={`Permisos del rol «${matriz.rol.nombre}»`} backTo="/admin/roles"
                subtitle={`${marcados.size} permiso(s) · ${matriz.rol.usuarios} usuario(s) con este rol`}
                actions={!soloLectura && (
                    <>
                        {cambios.total > 0 && (
                            <button type="button" onClick={() => setMarcados(new Set(original))} disabled={guardando}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Descartar</button>
                        )}
                        <button type="button" onClick={guardar} disabled={guardando || cambios.total === 0}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                            {guardando ? 'Guardando...' : cambios.total > 0 ? `Guardar ${cambios.total} cambio(s)` : 'Sin cambios'}
                        </button>
                    </>
                )} />

            {soloLectura && (
                <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">El rol admin tiene acceso total, incluso a los permisos que se agreguen en el futuro. Sus permisos no se editan.</p>
            )}
            {cambios.total > 0 && (
                <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    {cambios.agregados.length > 0 && <>Se agregan: <strong>{cambios.agregados.join(', ')}</strong>. </>}
                    {cambios.quitados.length > 0 && <>Se quitan: <strong>{cambios.quitados.join(', ')}</strong>. </>}
                    Los usuarios con este rol lo verán al recargar la página.
                </p>
            )}

            {!soloLectura && (
                <p className="mb-4 text-sm text-gray-500">
                    Enciende un módulo para darle todas sus acciones, o enciende solo las que necesite. Lo que esté apagado no le aparece en el menú
                    ni en la tablet, y el sistema lo rechaza aunque intente entrar. Los usuarios con este rol lo ven en menos de un minuto, sin volver a entrar.
                </p>
            )}

            <input className="mb-4 h-[42px] w-full max-w-sm rounded-lg border border-gray-300 bg-white px-4 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Buscar permiso o módulo" value={buscar} onChange={e => setBuscar(e.target.value)} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {modulos.map(g => {
                    const nombres = g.permisos.map(p => p.nombre);
                    const activos = nombres.filter(n => marcados.has(n)).length;
                    const todos = activos === nombres.length;
                    return (
                        <section key={g.modulo} className={`rounded-xl border bg-white ${activos > 0 ? 'border-green-200' : 'border-gray-200'}`}>
                            <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                                <div>
                                    <h2 className="font-semibold text-gray-800">{g.modulo}</h2>
                                    <p className="text-xs text-gray-500">{activos === 0 ? 'Sin acceso' : todos ? 'Acceso completo' : `${activos} de ${nombres.length} acciones`}</p>
                                </div>
                                <Interruptor encendido={todos} parcial={activos > 0 && !todos} deshabilitado={soloLectura}
                                    etiqueta={`Todo el módulo ${g.modulo}`} onCambiar={() => alternarModulo(nombres, todos)} />
                            </header>
                            <ul className="divide-y divide-gray-50">
                                {g.permisos.map(p => (
                                    <li key={p.nombre} className="px-4 py-2.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="flex min-w-0 items-start gap-2">
                                                <span className="min-w-0">
                                                    <span className="block text-sm text-gray-800">{p.descripcion}</span>
                                                    <span className="block text-xs text-gray-400">{p.nombre}</span>
                                                </span>
                                                {p.ayuda && (
                                                    <button type="button" onClick={() => verAyuda(p.nombre)}
                                                        aria-expanded={conAyuda.has(p.nombre)} aria-label={`Qué hace: ${p.descripcion}`}
                                                        title="¿Qué hace este permiso?"
                                                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                                                            conAyuda.has(p.nombre) ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600'
                                                        }`}>?</button>
                                                )}
                                            </span>
                                            <Interruptor encendido={marcados.has(p.nombre)} deshabilitado={soloLectura}
                                                etiqueta={p.descripcion} onCambiar={() => alternar(p.nombre)} />
                                        </div>
                                        {p.ayuda && conAyuda.has(p.nombre) && (
                                            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">{p.ayuda}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
