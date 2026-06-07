import { useState } from "react";
import { EyeCloseIcon, EyeIcon } from "../../icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
  }) => Promise<void>; // ← Cambiado a Promise
  isCreating: boolean;
}

export default function NuevoUsuarioModal({
                                            isOpen,
                                            onClose,
                                            onConfirm,
                                            isCreating,
                                          }: Props) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "",
  });

  const [errors, setErrors] = useState<{
    nombre?: string;
    email?: string;
    password?: string;
    rol?: string;
  }>({});

  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

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

    if (!form.password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (form.password.length < 8) {
      newErrors.password = "Mínimo 8 caracteres";
    }

    if (!form.rol) {
      newErrors.rol = "Debe seleccionar un rol";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateClick = async () => {
    const isValid = validate();
    if (!isValid) return;

    try {
      await onConfirm(form);

      // ✅ Solo limpia si fue exitoso
      setForm({ nombre: "", email: "", password: "", rol: "" });
      setErrors({});
    } catch (error) {
      // ❌ Si hay error, NO limpia el formulario
      console.log("Error al crear usuario, manteniendo datos del formulario");
    }
  };

  const handleClose = () => {
    // Limpiar solo al cerrar manualmente
    setForm({ nombre: "", email: "", password: "", rol: "" });
    setErrors({});
    onClose();
  };

  const baseInput =
    "w-full h-[42px] border rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-5">Crear Usuario</h2>

        <div className="space-y-4">
          {/* NOMBRE */}
          <div>
            <input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => {
                setForm({ ...form, nombre: e.target.value });
                if (errors.nombre) setErrors({ ...errors, nombre: undefined });
              }}
              className={`${baseInput} ${
                errors.nombre ? "border-red-400" : "border-gray-300"
              }`}
              maxLength={50}
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
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              className={`${baseInput} ${
                errors.email ? "border-red-400" : "border-gray-300"
              }`}
              maxLength={100}
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
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (errors.password)
                    setErrors({ ...errors, password: undefined });
                }}
                className={`${baseInput} pr-10 ${
                  errors.password ? "border-red-400" : "border-gray-300"
                }`}
                maxLength={25}
              />

              <span
                onClick={() => setShowPassword(!showPassword)}
                className="
        absolute right-4 top-1/2 -translate-y-1/2
        cursor-pointer text-gray-500 hover:text-gray-700
      "
              >
            {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
          </span>
            </div>

            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>


          {/* ROL */}
          <div>
            <select
              value={form.rol}
              onChange={(e) => {
                setForm({ ...form, rol: e.target.value });
                if (errors.rol) setErrors({ ...errors, rol: undefined });
              }}
              className={`${baseInput} ${
                errors.rol ? "border-red-400" : "border-gray-300"
              }`}
            >
              <option value="">Seleccionar rol</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
            {errors.rol && (
              <p className="text-xs text-red-500 mt-1">{errors.rol}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreateClick}
            disabled={isCreating}
            className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
          >
            {isCreating ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}