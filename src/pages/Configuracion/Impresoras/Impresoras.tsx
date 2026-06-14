import { useState } from "react";
import { useImpresoras } from "../../../hooks/configuracion/useImpresorasHook";
import LoadingModal from "../../../components/Loading/LoadingModal";
import { ImpresoraInterface } from "../../../types/interfaces";
import { testImpresora } from "../../../services/api";
import { getToken } from "../../../utils/auth";
import toast from "react-hot-toast";

// Dropdown estable con estado
function AccionesDropdown({
                              imp,
                              onEditar,
                              onEliminar,
                          }: {
    imp: ImpresoraInterface;
    onEditar: (imp: ImpresoraInterface) => void;
    onEliminar: (imp: ImpresoraInterface) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center justify-center w-8 h-8 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-full transition"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-9 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <button
                            onClick={() => { setOpen(false); onEditar(imp); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition"
                        >
                            Editar
                        </button>
                        <button
                            onClick={() => { setOpen(false); onEliminar(imp); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition"
                        >
                            Eliminar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Modal de confirmación de eliminación
function ModalEliminar({
                           imp,
                           onConfirmar,
                           onCancelar,
                           isDeleting,
                       }: {
    imp: ImpresoraInterface;
    onConfirmar: () => void;
    onCancelar: () => void;
    isDeleting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onCancelar} />
            <div className="relative w-full max-w-sm mx-4 bg-white rounded-xl shadow-2xl">
                <div className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-red-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">¿Eliminar impresora?</h3>
                    <p className="text-sm text-gray-500 mb-1">
                        <span className="font-medium text-gray-700">{imp.alias}</span>
                    </p>
                    <p className="text-xs text-gray-400 mb-6">Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancelar}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirmar}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-60"
                        >
                            {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Impresoras() {
    const {
        data,
        categorias,
        loading,
        isModalOpen,
        isEditing,
        isSaving,
        form,
        setForm,
        toggleCategoria,
        abrirModalNuevo,
        abrirModalEditar,
        cerrarModal,
        handleGuardar,
        handleEliminar,
    } = useImpresoras();

    const [impresoraAEliminar, setImpresoraAEliminar] = useState<ImpresoraInterface | null>(null);
    const [isDeleting, setIsDeleting]                 = useState(false);
    const [testingId, setTestingId]                   = useState<number | null>(null);

    const confirmarEliminar = async () => {
        if (!impresoraAEliminar) return;
        setIsDeleting(true);
        await handleEliminar(impresoraAEliminar.id);
        setIsDeleting(false);
        setImpresoraAEliminar(null);
    };

    const handleTest = async (imp: ImpresoraInterface) => {
        setTestingId(imp.id);
        try {
            const res = await testImpresora(getToken()!, imp.id);
            if (res.success) {
                toast.success(`Impresión de prueba enviada: ${imp.alias}`);
            } else {
                toast.error(res.message || "Error al imprimir");
            }
        } catch {
            toast.error("Error de conexión al imprimir");
        } finally {
            setTestingId(null);
        }
    };

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando impresoras..." />

            {impresoraAEliminar && (
                <ModalEliminar
                    imp={impresoraAEliminar}
                    onConfirmar={confirmarEliminar}
                    onCancelar={() => setImpresoraAEliminar(null)}
                    isDeleting={isDeleting}
                />
            )}

            <div className="p-6">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6">Control de impresoras</h1>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Listado</span>
                        <button
                            onClick={abrirModalNuevo}
                            className="flex items-center justify-center w-9 h-9 bg-[#1e3a5f] hover:bg-[#16304f] text-white rounded-lg transition"
                            title="Agregar impresora"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    {data.length === 0 && !loading ? (
                        <div className="py-10 text-center text-sm text-gray-400">No hay impresoras registradas</div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {data.map((imp: ImpresoraInterface) => (
                                <li key={imp.id} className="flex items-center justify-between px-5 py-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-800">{imp.alias}</p>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                imp.activo
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}>
                                                {imp.activo ? "Activo" : "Inactivo"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-semibold mt-0.5">
                                            esc/pos &nbsp;IP {imp.ip_impresora}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Botón test impresión */}
                                        <button
                                            onClick={() => handleTest(imp)}
                                            disabled={testingId === imp.id}
                                            className="text-gray-700 hover:text-gray-900 transition disabled:opacity-40"
                                            title="Test de impresión"
                                        >
                                            {testingId === imp.id ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                                                </svg>
                                            )}
                                        </button>

                                        <AccionesDropdown
                                            imp={imp}
                                            onEditar={abrirModalEditar}
                                            onEliminar={(i) => setImpresoraAEliminar(i)}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* MODAL AGREGAR / EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={cerrarModal} />

                    <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 bg-[#1e3a5f] rounded-t-xl">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                {isEditing ? "Editar impresora" : "Agregar"}
                            </h2>
                            <button onClick={cerrarModal} className="text-white hover:text-gray-300 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">

                            {/* Categorías */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-2">Categorias</label>
                                <div className="flex flex-wrap gap-2">
                                    {categorias.filter(c => c.estado).map((cat) => {
                                        const seleccionada = form.categorias.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategoria(cat.id)}
                                                className="flex items-center gap-0 rounded border border-red-400 text-sm text-gray-700 transition overflow-hidden"
                                            >
                                                <span className="px-3 py-1.5">{cat.nombre}</span>
                                                <span className={`flex items-center justify-center w-8 h-full py-1.5 text-white text-base font-bold transition ${
                                                    seleccionada ? "bg-green-500" : "bg-red-500"
                                                }`}>
                                                    {seleccionada ? "✓" : "+"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tipo impresión */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Tipo de impresión</label>
                                <select
                                    value={form.tipo_impresion}
                                    onChange={(e) => setForm({ ...form, tipo_impresion: e.target.value as 'escpos' })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                >
                                    <option value="escpos">ESC/POS</option>
                                </select>
                            </div>

                            {/* Alias */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    <span className="text-red-500">*</span> Alias
                                </label>
                                <input
                                    type="text"
                                    value={form.alias}
                                    onChange={(e) => setForm({ ...form, alias: e.target.value })}
                                    maxLength={200}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                            </div>

                            {/* IP Impresora */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    <span className="text-red-500">*</span> Dirección IP de la impresora
                                </label>
                                <input
                                    type="text"
                                    value={form.ip_impresora}
                                    onChange={(e) => setForm({ ...form, ip_impresora: e.target.value })}
                                    placeholder="192.168.0.33"
                                    maxLength={50}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                            </div>

                            {/* IP Servidor */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    <span className="text-red-500">*</span> Dirección IP del servidor principal
                                </label>
                                <input
                                    type="text"
                                    value={form.ip_servidor}
                                    onChange={(e) => setForm({ ...form, ip_servidor: e.target.value })}
                                    placeholder="192.168.0.1"
                                    maxLength={50}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                            </div>

                            {/* Cash Drawer */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Cash Drawer</label>
                                <select
                                    value={form.cash_drawer}
                                    onChange={(e) => setForm({ ...form, cash_drawer: e.target.value as 'ninguno' | 'pin2' | 'pin5' })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                >
                                    <option value="ninguno">Ninguno</option>
                                    <option value="pin2">PIN NO.2</option>
                                    <option value="pin5">PIN NO.5</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    El cajón de efectivo se abrirá cuando se envíe a imprimir una factura
                                </p>
                            </div>

                            {/* Estado — solo visible al editar */}
                            {isEditing && (
                                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Estado</p>
                                        <p className="text-xs text-gray-400">
                                            {form.activo ? "La impresora está activa" : "La impresora está inactiva"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setForm({ ...form, activo: !form.activo })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            form.activo ? "bg-green-500" : "bg-gray-300"
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                            form.activo ? "translate-x-6" : "translate-x-1"
                                        }`} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100">
                            <button
                                onClick={handleGuardar}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#5b7fa6] hover:bg-[#4a6d8f] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                {isSaving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}