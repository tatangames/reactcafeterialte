// USADO PARA INICIAR SESION, OBTENER TOKEN

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { getMe, loginApi } from "../../services/api.ts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { setAuth } from "../../utils/auth.ts";

export enum AuthStatus {
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    USER_INACTIVE = "USER_INACTIVE",
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
}

interface User {
    id: number;
    nombre: string;
    email: string;
    created_at: string;
    updated_at: string;
}

interface LoginResponse {
    success: boolean;
    message: string;
    status?: AuthStatus; // Solo viene cuando hay error
    user?: User; // Solo viene cuando es exitoso
    token?: string;
    token_type?: string;
}

export function useSignIn() {
    const navigate = useNavigate();
    const { setUser } = useAuth(); // 👈 Mover aquí, al nivel del custom hook

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);

    // validacion del correo
    const validateEmail = (value: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!value) {
            setEmailError("El correo es obligatorio");
            return false;
        }

        if (!emailRegex.test(value)) {
            setEmailError("Ingresa un correo válido");
            return false;
        }

        setEmailError("");
        return true;
    };

    // Aviso que deja el interceptor de la API al cerrar una sesión vencida.
    // Se lee al montar y se borra en un efecto (el inicializador no debe tener efectos)
    const [aviso] = useState<string | null>(() => sessionStorage.getItem("aviso_login"));
    useEffect(() => {
        sessionStorage.removeItem("aviso_login");
    }, []);

    const mostrarError = (data: LoginResponse) => {
        const message = data.status === AuthStatus.TOO_MANY_REQUESTS
            ? "Demasiados intentos. Espera un minuto e intenta de nuevo."
            : data.message;

        // El backend no indica si falló el correo o la contraseña
        if (data.status === AuthStatus.INVALID_CREDENTIALS) {
            setPasswordError(message);
        }
        toast.error(message);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const isEmailValid = validateEmail(email);

        if (!password.trim()) {
            setPasswordError("La contraseña es obligatoria");
            return;
        } else {
            setPasswordError("");
        }

        if (!isEmailValid) return;

        setLoading(true);
        try {
            const data = await loginApi(email, password);

            if (data.success && data.token) {
                // 1. Obtener datos completos del usuario con roles y permisos
                const userData = await getMe(data.token);

                // 2. Guardar en localStorage usando tu función setAuth
                setAuth(data.token, data.token_type, userData);

                // 3. Guardar usuario en el contexto
                setUser(userData);

                toast.success(`Bienvenido ${userData.nombre} 👋`);

                navigate("/dashboard", { replace: true });
            } else {
                // Manejar respuesta no exitosa
                mostrarError(data);
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                mostrarError(error.response.data as LoginResponse);
            } else {
                setPasswordError("Error al conectar con el servidor");
                toast.error("Error de conexión");
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        // state
        email,
        emailError,
        password,
        passwordError,
        loading,
        showPassword,
        aviso,

        // setters
        setEmail,
        setPassword,
        setShowPassword,

        // actions
        validateEmail,
        handleSubmit,
    };
}