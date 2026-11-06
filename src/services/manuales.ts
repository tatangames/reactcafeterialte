// Manuales de uso: el contenido vive en la API (resources/manuales/manuales.json), igual para la web y la tablet

import { api } from "./api";
import { sinTildes } from "../utils/texto";

export interface SeccionManual {
    titulo: string;
    texto?: string;
    pasos?: string[];
    puntos?: string[];
}

export interface EjemploManual {
    titulo: string;
    pasos: string[];
}

export interface ManualInterface {
    id: string;
    titulo: string;
    resumen: string;
    permisos: string[];
    donde: { web?: string; tablet?: string };
    secciones: SeccionManual[];
    ejemplos?: EjemploManual[];
    preguntas?: { p: string; r: string }[];
    relacionados?: string[];
}

export interface ModuloManualInterface {
    id: string;
    titulo: string;
    descripcion: string;
    manuales: ManualInterface[];
}

export const getManuales = async (): Promise<{ actualizado: string | null; modulos: ModuloManualInterface[] }> =>
    (await api.get('/manuales')).data;

// Todo el texto de un manual, sin tildes y en minúsculas, para el buscador
export const textoManual = (m: ManualInterface): string => sinTildes([
    m.titulo, m.resumen, m.donde.web, m.donde.tablet,
    ...m.secciones.flatMap(s => [s.titulo, s.texto, ...(s.pasos ?? []), ...(s.puntos ?? [])]),
    ...(m.ejemplos ?? []).flatMap(e => [e.titulo, ...e.pasos]),
    ...(m.preguntas ?? []).flatMap(q => [q.p, q.r]),
].filter(Boolean).join(' '));


// Qué manuales ve cada rol (solo quien gestiona roles)
export interface RolManualesInterface {
    id: number;
    nombre: string;
    usuarios: number;
    ver_seccion: boolean;
    permisos: string[];
    manuales: string[];
}

export interface PermisosManualesInterface {
    roles: RolManualesInterface[];
    modulos: { id: string; titulo: string; manuales: Pick<ManualInterface, 'id' | 'titulo' | 'resumen' | 'permisos'>[] }[];
}

export const getPermisosManuales = async (): Promise<PermisosManualesInterface> => (await api.get('/manuales/permisos')).data;

export const guardarPermisosManuales = async (rolId: number, manuales: string[]): Promise<{ message: string }> =>
    (await api.put(`/manuales/permisos/${rolId}`, { manuales })).data;
