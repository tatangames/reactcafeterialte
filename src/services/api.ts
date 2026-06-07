// CODIGO

import axios from "axios";
import {InformacionAdministradorResponse} from "../types/interfaces.ts";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});



// ************************  SECCION - LOGIN ************************************************
// ==========================================================================================




// INICIO DE SESION
export const loginApi = async (email: string, password: string) => {
  const { data } = await api.post("/login", {
    email,
    password,
    device_name: "Web Application",
  });
  return data;
};


// CERRAR SESION
export const logout = async (token: string) => {
  const { data } = await api.post(
      "/logout",
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
  );
  return data;
};

// SOLICITAR RESET CONTRASEÑA
export const sendResetPasswordEmail = async (email: string) => {
  const { data } = await api.post("/admin/enviar/correo/password", {
    email,
  });

  return data;
};


// VALIDAR TOKEN DE RESET
export const validateResetToken = async (
    token: string,
    email: string
) => {
    const { data } = await api.post(
        "/validate-reset-token",
        {
            token,
            email,
        }
    );

    return data;
};

// CONFIRMAR / ACTUALIZAR CONTRASEÑA
export const confirmResetPassword = async (
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string
) => {
    const { data } = await api.post(
        "/reset-password-confirm",
        {
            token,
            email,
            password,
            password_confirmation: passwordConfirmation,
        }
    );

    return data;
};


export const getMe = async (token: string) => {
  const { data } = await api.get("/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};




// ************************  SECCION - ROLES Y PERMISOS ***************************************************************************
// ================================================================================================================================


// ROLES - SOLO LISTADO
export const getRolesTable = async (token: string) => {
  const { data } = await api.get("/admin/roles/tabla", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data;
};

// BORRAR UN ROL COMPLETO
export const borrarRolGlobal = async (token: string, idrol: number) => {
    const { data } = await api.post(
        "/admin/roles/borrar-global",
        { idrol },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return data;
};


// OBTENER TODOS LOS ROLES
export const getRolePermissionsTable = async (
    token: string,
    idrol: number
) => {
    const { data } = await api.get(
        `/admin/roles/permisos/tabla/${idrol}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return data;
};

// BORRAR UN PERMISO DEL ROL
export const borrarPermisoRol = async (
    token: string,
    idrol: number,
    idpermiso: number
) => {
    const { data } = await api.post(
        "/admin/roles/permiso/borrar",
        {
            idrol,
            idpermiso,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return data;
};

// CREAR UN ROL
export const crearNuevoRol = async (
  token: string,
  nombre: string
) => {
  const { data } = await api.post(
    `/admin/roles/nuevo-rol`,
    { nombre },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return data;
};


// AGREGAR UN PERMISO AL ROL
export const agregarPermisoRol = async (
  token: string,
  idrol: number,
  idpermiso: number
) => {
  const { data } = await api.post(
    "/admin/roles/permiso/agregar",
    {
      idrol,
      idpermiso,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return data;
};

// LISTADO DE PERMISOS
export const getPermisosTable = async (token: string) => {
  const { data } = await api.get(
    `/admin/roles/permisos-todos/tabla`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return data;
};


// BORRAR UN PERMISO GLOBAL
export const borrarPermisoGlobal = async (token: string, idpermiso: number) => {
  const { data } = await api.post(
    "/admin/permisos/extra-borrar",
    { idpermiso },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return data;
};

// CREAR UN NUEVO PERMISO
export const crearNuevoPermiso = async (token: string, nombre: string, descripcion?: string) => {
  const { data } = await api.post(
    "/admin/permisos/extra-nuevo",
    { nombre , descripcion },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return data;
};

// OBTENER USUARIOS
export const getUsuariosTable = async (token: string) => {
  const { data } = await api.get(
    `/admin/usuarios/tabla`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return data;
};


// CREAR UN USUARIO - ROLES
export const crearUsuario = async (
  token: string,
  datos: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
  }
) => {
  const { data } = await api.post(
    "/admin/permisos/nuevo-usuario",
    datos,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return data;
};



// ************************  SECCION - UNIDAD DE MEDIDA ***************************************************************************
// ================================================================================================================================


// LISTADO DE UNIDAD DE MEDIDA
export const getUnidadMedidaTable = async (token: string) => {
    const { data } = await api.get(
        `/admin/unidadmedida/tabla`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );

    return data;
};

// CREAR UNIDAD DE MEDIDA
export const crearUnidadMedida = async (
    token: string,
    payload: { nombre: string }
) => {
    const { data } = await api.post(
        `/admin/unidadmedida/nuevo`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );

    return data;
};

// ACTUALIZAR UNIDAD DE MEDIDA
export const actualizarUnidadMedida = async (
    token: string,
    id: number,
    payload: {
        nombre: string;
        estado: boolean;
    }
) => {
    const { data } = await api.put(
        `/admin/unidadmedida/actualizar/${id}`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );

    return data;
};

























// INFORMACION DE ADMINISTRADOR
export const informacionAdministrador = async (
  token: string,
  id: number
): Promise<InformacionAdministradorResponse> => {
  try {
    const { data } = await api.post(
      "/admin/informacion/administrador",
      { id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Validación del backend
    if (data.success !== 1) {
      throw new Error("No se pudo obtener la información del administrador");
    }

    return data;
  } catch (error: any) {
    console.error("Error informacionAdministrador:", error);
    throw error.response?.data?.message || "Error al obtener la información";
  }
};


// ACTUALIZAR ADMINISTRADOR
export const actualizarAdministrador = async (
  token: string,
  id: number,
  datos: {
    nombre: string;
    email: string;
    password?: string;
    rol: string;
    estado: boolean;
  }
) => {
  try {
    const { data } = await api.put(
      `/admin/actualizar/administrador/${id}`,
      datos,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (data.success !== 1) {
      throw new Error(data.message || "Error al actualizar");
    }

    return data;
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw error.response.data.errors; // para mostrar en inputs
    }
    throw error.response?.data?.message || "Error del servidor";
  }
};


// LISTADO DE CATEGORIAS
export const getCategoriasTable = async (token: string) => {
  const { data } = await api.get(
    `/admin/categorias/tabla`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return data;
};

// CREAR CATEGORIA
export const crearCategoria = async (
  token: string,
  payload: { nombre: string }
) => {
  const { data } = await api.post(
    `/admin/categorias/nuevo`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return data;
};

// ACTUALIZAR CATEGORIA
export const actualizarCategoria = async (
  token: string,
  id: number,
  payload: {
    nombre: string;
    estado: boolean;
  }
) => {
  const { data } = await api.put(
    `/admin/categorias/actualizar/${id}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return data;
};













export default api;