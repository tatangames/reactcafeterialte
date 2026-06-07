import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getToken } from "../../utils/auth";
import { informacionAdministrador } from "../../services/api.ts";
import { EyeCloseIcon, EyeIcon } from "../../icons";

interface EditarUsuarioForm {
  nombre: string;
  email: string;
  password?: string;
  rol: string;
  estado: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number, form: EditarUsuarioForm) => Promise<void>;
  usuarioId: number | null;
  isUpdating: boolean;
}

export default function EditarUsuarioModal({
                                             isOpen,
                                             onClose,
                                             onConfirm,
                                             usuarioId,
                                             isUpdating,
                                           }: Props) {
  const [form, setForm] = useState<EditarUsuarioForm>({
    nombre: "",
    email: "",
    password: "",
    rol: "",
    estado: true,
  });

  const [roles, setRoles] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    nombre?: string;
    email?: string;
    password?: string;
    rol?: string;
  }>({});

  const baseInput =
    "w-full h-[42px] border rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition";

  const isPrincipal = usuarioId === 1;

  // =========================
  // Cerrar modal
  // =========================
  const handleClose = useCallback(() => {
    setForm({
      nombre: "",
      email: "",
      password: "",
      rol: "",
      estado: true,
    });
    setErrors({});
    setRoles({});
    setLoading(false);
    onClose();
  }, [onClose]);

  // =========================
  // Cargar usuario
  // =========================
  const fetchUsuarioInfo = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) throw new Error("Token no encontrado");

        const data = await informacionAdministrador(token, id);

        const rolId =
          Object.keys(data.roles).find(
            (key) => data.roles[key] === data.rol_actual
          ) || "";

        setForm({
          nombre: data.info.nombre || "",
          email: data.info.email || "",
          password: "",
          rol: rolId,
          // Forzar activo si es el principal
          estado: id === 1 ? true : Boolean(data.info.estado),
        });

        setRoles(data.roles);
      } catch {
        toast.error("Error al cargar usuario");
        handleClose();
      } finally {
        setLoading(false);
      }
    },
    [handleClose]
  );

  // =========================
  // useEffect
  // =========================
  useEffect(() => {
    if (isOpen && usuarioId) {
      fetchUsuarioInfo(usuarioId);
    }
  }, [isOpen, usuarioId, fetchUsuarioInfo]);

  // =========================
  // Validación
  // =========================
  const validate = () => {
    const newErrors: typeof errors = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    } else if (form.nombre.length > 50) {
      newErrors.nombre = "Máximo 50 caracteres";
    }

    if (!form.email.trim()) {
      newErrors.email = "El correo es obligatorio";
    } else if (form.email.length > 100) {
      newErrors.email = "Máximo 100 caracteres";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Correo no válido";
    }

    if (form.password && form.password.length < 8) {
      newErrors.password = "Mínimo 8 caracteres";
    }

    if (!form.rol) {
      newErrors.rol = "Debe seleccionar un rol";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =========================
  // Submit
  // =========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioId) {
      toast.error("Usuario no válido");
      return;
    }

    const isValid = validate();
    if (!isValid) return;

    try {
      const formToSend: EditarUsuarioForm = {
        ...form,
        password: form.password?.trim() ? form.password : undefined,
      };

      await onConfirm(usuarioId, formToSend);
      handleClose();
    } catch {
      // Manejado por el padre
    }
  };

  if (!isOpen) return null;

  // =========================
  // UI
  // =========================
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-5">Editar Usuario</h2>

        {loading ? (
          <div className="py-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* NOMBRE */}
            <div>
              <input
                placeholder="Nombre"
                value={form.nombre}
                maxLength={50}
                onChange={(e) => {
                  setForm({ ...form, nombre: e.target.value });
                  if (errors.nombre)
                    setErrors({ ...errors, nombre: undefined });
                }}
                className={`${baseInput} ${
                  errors.nombre ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <input
                placeholder="Correo"
                value={form.email}
                maxLength={100}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email)
                    setErrors({ ...errors, email: undefined });
                }}
                className={`${baseInput} ${
                  errors.email ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nueva contraseña (opcional)"
                  value={form.password}
                  maxLength={25}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (errors.password)
                      setErrors({ ...errors, password: undefined });
                  }}
                  className={`${baseInput} pr-10 ${
                    errors.password ? "border-red-400" : "border-gray-300"
                  }`}
                />

                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </span>
              </div>

              {errors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            {/* ROL */}
            <div>
              <select
                value={form.rol}
                onChange={(e) => {
                  setForm({ ...form, rol: e.target.value });
                  if (errors.rol)
                    setErrors({ ...errors, rol: undefined });
                }}
                className={`${baseInput} ${
                  errors.rol ? "border-red-400" : "border-gray-300"
                }`}
              >
                <option value="">Seleccionar rol</option>
                {Object.entries(roles).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              {errors.rol && (
                <p className="text-xs text-red-500 mt-1">{errors.rol}</p>
              )}
            </div>

            {/* ESTADO */}
            <div className="pt-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Estado
              </label>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.estado === true}
                    onChange={() => setForm({ ...form, estado: true })}
                    disabled={isUpdating}
                  />
                  Activo
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.estado === false}
                    onChange={() => setForm({ ...form, estado: false })}
                    disabled={isPrincipal || isUpdating}
                  />
                  Inactivo
                </label>
              </div>

              {isPrincipal && (
                <p className="text-xs text-amber-600 mt-1">
                  El administrador principal no puede ser desactivado
                </p>
              )}
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUpdating}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {isUpdating ? "Actualizando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
