import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import IconoMesa from '../../components/mesas/IconoMesa';
import EstadoConexion from '../../components/pos/EstadoConexion';
import { useAuth } from '../../context/AuthContext';
import { getMapa } from '../../services/mesas';
import { dinero, mensajeError } from '../../utils/formato';
import { TerminalMapaInterface, transcurrido } from '../../types/mesas';

const fechaHora = (f: string) => {
    const [d, h] = f.split(' ');
    return `${d.split('-').reverse().join('/')} ${h.slice(0, 5)}`;
};

function TarjetaTerminal({ t, ahora, onAbrir, onEditar }: {
    t: TerminalMapaInterface; ahora: number; onAbrir: () => void; onEditar?: () => void;
}) {
    const o = t.orden;
    const ocupada = !!o;
    const colorIcono = t.tipo === 'caja' ? 'bg-slate-600' : ocupada ? 'bg-pink-600' : 'bg-cyan-600';
    const borde = t.tipo === 'caja' ? 'border-slate-500' : ocupada ? 'border-pink-500' : 'border-cyan-600';

    return (
        <div className={`relative flex min-h-[112px] overflow-hidden rounded-xl border-2 bg-white shadow-sm transition hover:shadow-md ${borde}`}>
            <button type="button" onClick={onAbrir} className="flex flex-1 text-left active:scale-[0.99]" aria-label={`Abrir ${t.nombre}`}>
                <div className={`flex w-24 shrink-0 items-center justify-center text-white ${colorIcono}`}>
                    <IconoMesa className="h-14 w-16" />
                </div>
                <div className="min-w-0 flex-1 px-3 py-2">
                    <p className="truncate pr-8 font-semibold text-gray-900">{t.nombre}</p>
                    {t.tipo === 'caja' && <p className="text-sm text-gray-500">Venta rápida de mostrador</p>}
                    {!o && t.tipo !== 'caja' && <p className="text-sm text-gray-400">{t.tipo === 'llevar' ? 'Para llevar' : `Libre · ${t.capacidad} personas`}</p>}
                    {o && (
                        <>
                            <p className="truncate text-sm italic text-gray-500">{o.tickets.join(', ') || 'Sin cuentas abiertas'}</p>
                            <p className="text-sm text-gray-700">Ingreso: {fechaHora(o.abierta_at)}</p>
                            <p className="text-sm text-gray-700">Transcurrido: <span className="font-mono">{transcurrido(o.abierta_at, ahora)}</span></p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-semibold text-gray-900">{dinero(o.por_cobrar)}</span>
                                {o.listos > 0 && <span className="rounded-full bg-green-600 px-2 py-0.5 font-semibold text-white">{o.listos} listo(s) para servir</span>}
                                {o.por_enviar > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{o.por_enviar} por enviar</span>}
                            </div>
                        </>
                    )}
                </div>
            </button>
            {onEditar && (
                <button type="button" onClick={onEditar} className="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label={`Configurar ${t.nombre}`}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
            )}
        </div>
    );
}

// Mapa del punto de venta: mesas, caja de mostrador y para llevar
export default function MapaMesas() {
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const [terminales, setTerminales] = useState<TerminalMapaInterface[] | null>(null);
    const [zona, setZona] = useState<string | null>(null);
    const [buscar, setBuscar] = useState('');
    const [ahora, setAhora] = useState(Date.now());
    const [menu, setMenu] = useState(false);

    const cargar = useCallback(() => {
        getMapa().then(setTerminales).catch(e => toast.error(mensajeError(e, 'No se pudo cargar el mapa')));
    }, []);

    useEffect(() => {
        cargar();
        const datos = setInterval(cargar, 15000);
        const reloj = setInterval(() => setAhora(Date.now()), 1000);
        return () => { clearInterval(datos); clearInterval(reloj); };
    }, [cargar]);

    const zonas = useMemo(() => [...new Set((terminales ?? []).map(t => t.zona).filter(Boolean))] as string[], [terminales]);

    const visibles = (terminales ?? []).filter(t => {
        if (zona && t.zona !== zona) return false;
        const q = buscar.trim().toLowerCase();
        if (!q) return true;
        return [t.nombre, t.zona, t.orden?.usuario, ...(t.orden?.tickets ?? [])].some(v => v?.toLowerCase().includes(q));
    });

    const mesas = (terminales ?? []).filter(t => t.tipo === 'mesa');
    const ocupadas = mesas.filter(t => t.orden).length;
    const personas = mesas.reduce((s, t) => s + (t.orden?.comensales ?? 0), 0);

    const abrir = (t: TerminalMapaInterface) => navigate(t.tipo === 'caja' ? '/pos/mostrador' : `/pos/terminal/${t.id}`);

    return (
        <div className="flex min-h-screen flex-col bg-gray-100">
            <header className="flex items-center gap-3 bg-white px-4 py-2 shadow-sm">
                <button type="button" onClick={() => navigate('/dashboard')} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100" title="Volver al panel">
                    <img src="/images/logo/logoeci.png" alt="" className="h-9 w-9" />
                    <span className="hidden font-semibold text-gray-800 md:inline">Mapa del punto de venta</span>
                </button>
                <span className="hidden text-xs text-gray-500 sm:inline">{user?.nombre}</span>
                <div className="ml-auto flex items-center gap-2">
                    <EstadoConexion />
                    <Link to="/pos/mostrador" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Venta rápida</Link>
                </div>
            </header>

            <main className="flex-1 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {[null, ...zonas].map(z => (
                        <button key={z ?? 'todas'} type="button" onClick={() => setZona(z)}
                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${zona === z ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                            {z ?? 'Todas'}
                        </button>
                    ))}
                    <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Mesa, cuenta o mesero"
                        className="ml-auto h-11 w-full max-w-xs rounded-xl border border-gray-300 bg-white px-4 text-sm focus:border-blue-400 focus:outline-none sm:w-64" />
                </div>

                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-pink-600">
                    Mesas ocupadas {ocupadas}/{mesas.length}{personas > 0 ? ` · ${personas} persona(s)` : ''}
                </p>

                {!terminales && <p className="text-gray-500">Cargando...</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {visibles.map(t => (
                        <TarjetaTerminal key={t.id} t={t} ahora={ahora} onAbrir={() => abrir(t)}
                            onEditar={hasPermission('mesas.configurar') ? () => navigate('/admin/mesas') : undefined} />
                    ))}
                </div>
            </main>

            {/* Menú flotante */}
            <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2">
                {menu && (
                    <div className="mb-2 flex flex-col gap-2">
                        <Link to="/pos/mostrador" className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg hover:bg-gray-50">Venta rápida de mostrador</Link>
                        {hasPermission('pos.historial') && <Link to="/ventas" className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg hover:bg-gray-50">Historial de ventas</Link>}
                        {hasPermission('mesas.configurar') && <Link to="/admin/mesas" className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg hover:bg-gray-50">Configurar mesas</Link>}
                        <Link to="/caja" className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg hover:bg-gray-50">Caja</Link>
                    </div>
                )}
                <button type="button" onClick={() => setMenu(m => !m)} aria-label="Más opciones"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-600 text-3xl font-bold text-white shadow-xl hover:bg-cyan-700">
                    {menu ? '×' : '⋮'}
                </button>
            </div>
        </div>
    );
}
