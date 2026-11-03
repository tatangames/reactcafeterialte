import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import { getMatrizRol, guardarMatrizRol, MatrizRolInterface } from '../../services/seguridad';
import { mensajeError } from '../../utils/formato';

// Matriz de permisos de un rol, agrupada por módulo
export default function RolesPermisos() {
    const { id } = useParams();
    const [matriz, setMatriz] = useState<MatrizRolInterface | null>(null);
    const [marcados, setMarcados] = useState<Set<string>>(new Set());
    const [original, setOriginal] = useState<Set<string>>(new Set());
    const [buscar, setBuscar] = useState('');
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

    const texto = buscar.trim().toLowerCase();
    const modulos = (matriz?.modulos ?? [])
        .map(g => ({ ...g, permisos: g.permisos.filter(p => !texto || p.descripcion.toLowerCase().includes(texto) || p.nombre.includes(texto) || g.modulo.toLowerCase().includes(texto)) }))
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

    if (!matriz) return <div className="p-6 text-gray-500">Cargando...</div>;
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

            <input className="mb-4 h-[42px] w-full max-w-sm rounded-lg border border-gray-300 bg-white px-4 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Buscar permiso o módulo" value={buscar} onChange={e => setBuscar(e.target.value)} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {modulos.map(g => {
                    const nombres = g.permisos.map(p => p.nombre);
                    const todos = nombres.every(n => marcados.has(n));
                    return (
                        <section key={g.modulo} className="rounded-xl border border-gray-200 bg-white">
                            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                                <h2 className="font-semibold text-gray-800">{g.modulo}</h2>
                                {!soloLectura && (
                                    <button type="button" onClick={() => alternarModulo(nombres, todos)} className="text-xs font-medium text-blue-600 hover:underline">
                                        {todos ? 'Quitar todos' : 'Marcar todos'}
                                    </button>
                                )}
                            </header>
                            <ul className="divide-y divide-gray-50">
                                {g.permisos.map(p => (
                                    <li key={p.nombre}>
                                        <label className={`flex items-start gap-3 px-4 py-2.5 ${soloLectura ? '' : 'cursor-pointer hover:bg-gray-50'}`}>
                                            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={marcados.has(p.nombre)} disabled={soloLectura}
                                                onChange={() => alternar(p.nombre)} />
                                            <span>
                                                <span className="block text-sm text-gray-800">{p.descripcion}</span>
                                                <span className="block text-xs text-gray-400">{p.nombre}</span>
                                            </span>
                                        </label>
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
