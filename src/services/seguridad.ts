// Matriz de permisos por rol y visor de auditoría (Fase 11)

import { api } from "./api";
import { PaginaInterface } from "../types/interfaces";

export interface MatrizRolInterface {
    rol: { id: number; nombre: string; es_admin: boolean; usuarios: number };
    modulos: { modulo: string; permisos: { nombre: string; descripcion: string; ayuda?: string | null; asignado: boolean }[] }[];
}

export interface RegistroAuditoriaInterface {
    id: number;
    fecha: string;
    usuario: string;
    modulo: string;
    accion: string;
    entidad: string | null;
    descripcion: string | null;
    antes: Record<string, unknown> | null;
    despues: Record<string, unknown> | null;
    ip: string | null;
    dispositivo: string | null;
}

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const getMatrizRol = async (rolId: number): Promise<MatrizRolInterface> => {
    const { data } = await api.get(`/admin/roles/${rolId}/matriz`);
    return data;
};

export const guardarMatrizRol = async (rolId: number, permisos: string[]) => {
    const { data } = await api.put(`/admin/roles/${rolId}/permisos`, { permisos });
    return data as { success: number; message: string };
};

export const getFiltrosAuditoria = async () => {
    const { data } = await api.get("/auditoria/filtros");
    return data as { modulos: string[]; acciones: string[]; usuarios: { id: number; nombre: string }[] };
};

export const getAuditoria = async (
    filtros: { desde?: string; hasta?: string; usuario_id?: string; modulo?: string; accion?: string; buscar?: string; page?: number }
): Promise<PaginaInterface & { registros: RegistroAuditoriaInterface[] }> => {
    const { data } = await api.get("/auditoria", { params: limpiar(filtros) });
    return data;
};
