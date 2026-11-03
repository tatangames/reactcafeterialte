import { useState } from 'react';
import toast from 'react-hot-toast';

import { useCaja } from '../../context/CajaContext';
import { abrirTurno, anularMovimientoCaja, registrarArqueo, registrarMovimientoCaja } from '../../services/caja';
import { dinero, mensajeError } from '../../utils/formato';
import { MovimientoCajaForm } from '../../components/caja/MovimientoCajaModal';
import { MovimientoCajaInterface } from '../../types/caja';

// Acciones de la pantalla de caja sobre el turno abierto del dispositivo
export function useTurnoCajaHook() {
    const { cajaId, actual, refrescar } = useCaja();
    const turno = actual?.turno ?? null;

    const [guardando, setGuardando] = useState(false);
    const [modalMovimiento, setModalMovimiento] = useState<'ingreso' | 'egreso' | null>(null);
    const [modalArqueo, setModalArqueo] = useState(false);
    const [anulando, setAnulando] = useState<MovimientoCajaInterface | null>(null);

    const ejecutar = async (accion: () => Promise<string | void>, porDefecto: string) => {
        setGuardando(true);
        try {
            const mensaje = await accion();
            if (mensaje) toast.success(mensaje);
            await refrescar();
            return true;
        } catch (error) {
            toast.error(mensajeError(error, porDefecto));
            return false;
        } finally {
            setGuardando(false);
        }
    };

    // El turno queda a nombre de quien inició sesión
    const abrir = (fondo: number, observaciones?: string) =>
        cajaId && ejecutar(async () => {
            const res = await abrirTurno({ caja_id: cajaId, fondo_inicial: fondo, observaciones });
            return `${res.message} a nombre de ${res.turno.usuario_apertura} con ${dinero(res.turno.fondo_inicial)} de fondo`;
        }, 'No se pudo abrir el turno');

    const registrarMovimiento = (datos: MovimientoCajaForm) =>
        turno && ejecutar(async () => {
            const res = await registrarMovimientoCaja(turno.id, datos);
            setModalMovimiento(null);
            return res.message;
        }, 'No se pudo registrar el movimiento');

    const arqueo = (efectivoContado: number, observaciones: string) =>
        turno && ejecutar(async () => {
            const res = await registrarArqueo(turno.id, { efectivo_contado: efectivoContado, observaciones: observaciones || undefined });
            setModalArqueo(false);
            if (res.diferencia === null) return `Arqueo registrado: ${dinero(res.total_contado)}`;
            const d = res.diferencia;
            return `Arqueo: ${dinero(res.total_contado)} · ${d === 0 ? 'cuadra exacto' : d < 0 ? `faltan ${dinero(-d)}` : `sobran ${dinero(d)}`}`;
        }, 'No se pudo registrar el arqueo');

    const anular = (motivo: string) =>
        anulando && ejecutar(async () => {
            const res = await anularMovimientoCaja(anulando.id, motivo);
            setAnulando(null);
            return res.message;
        }, 'No se pudo anular el movimiento');

    return {
        turno, guardando,
        modalMovimiento, setModalMovimiento,
        modalArqueo, setModalArqueo,
        anulando, setAnulando,
        abrir, registrarMovimiento, arqueo, anular,
    };
}
