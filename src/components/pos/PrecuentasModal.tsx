import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import MotivoModal from "../modal/MotivoModal";
import { cancelarPrecuenta, getPrecuentas } from "../../services/pos";
import { imprimirComandasPedido, intentarImpresion } from "../../services/impresion";
import { PedidoInterface } from "../../types/pos";
import { cantidad, dinero, mensajeError } from "../../utils/formato";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAbrir: (pedido: PedidoInterface) => void;
}

// Ventas en espera: el cliente sigue escogiendo, o una mesa que paga al final
export default function PrecuentasModal({ isOpen, onClose, onAbrir }: Props) {
    const [pedidos, setPedidos] = useState<PedidoInterface[]>([]);
    const [cargando, setCargando] = useState(false);
    const [cancelando, setCancelando] = useState<PedidoInterface | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = () => {
        setCargando(true);
        getPrecuentas()
            .then(setPedidos)
            .catch((e) => toast.error(mensajeError(e, "No se pudieron cargar las precuentas")))
            .finally(() => setCargando(false));
    };

    useEffect(() => {
        if (isOpen) cargar();
    }, [isOpen]);

    if (!isOpen) return null;

    const cancelar = async (motivo: string) => {
        if (!cancelando) return;
        setGuardando(true);
        try {
            const res = await cancelarPrecuenta(cancelando.id, motivo);
            toast.success(res.message);
            setCancelando(null);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo cancelar"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <MotivoModal isOpen={!!cancelando} titulo="Cancelar precuenta" descripcion={cancelando ? `${cancelando.numero} · ${cancelando.nombre}` : ""}
                textoConfirmar="Cancelar precuenta" isLoading={guardando} onClose={() => setCancelando(null)} onConfirm={cancelar} />

            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold">Precuentas abiertas</h2>
                    <button type="button" onClick={onClose} className="h-10 w-10 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">✕</button>
                </div>
                <div className="overflow-y-auto divide-y divide-gray-100">
                    {cargando && <p className="px-6 py-6 text-sm text-gray-500">Cargando...</p>}
                    {!cargando && pedidos.length === 0 && <p className="px-6 py-6 text-sm text-gray-500">No hay precuentas abiertas</p>}
                    {pedidos.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-800">{p.nombre} <span className="text-xs font-normal text-gray-400">{p.numero}</span></p>
                                <p className="truncate text-sm text-gray-500">
                                    {p.items.map((i) => `${cantidad(i.cantidad)} ${i.nombre}`).join(", ")}
                                </p>
                                <p className="text-xs text-gray-400">{p.creado} · {p.usuario}</p>
                            </div>
                            <span className="text-lg font-semibold text-gray-900">{dinero(p.total)}</span>
                            <button type="button" onClick={() => setCancelando(p)}
                                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Cancelar</button>
                            <button type="button" title="Enviar a las impresoras de comandas"
                                onClick={async () => {
                                    const res = await intentarImpresion(() => imprimirComandasPedido(p.id));
                                    if (res.impreso) toast.success("Comanda enviada");
                                    else toast.error(res.mensaje);
                                }}
                                className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Comanda</button>
                            <button type="button" onClick={() => { onAbrir(p); onClose(); }}
                                className="px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Abrir</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
