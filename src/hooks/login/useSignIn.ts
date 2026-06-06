// USADO PARA INICIAR SESION, OBTENER TOKEN

import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { getMe, loginApi } from "../../services/api.ts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { setAuth } from "../../utils/auth.ts";

export enum AuthStatus {
    INVALID_EMAIL = "EMAIL_NOT_FOUND",
    INVALID_PASSWORD = "INVALID_PASSWORD",
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

                // 👇 Agrega esto
                console.log("userData:", userData);
                console.log("localStorage auth:", localStorage.getItem("auth"));

                toast.success(`Bienvenido ${userData.nombre} 👋`);

                navigate("/dashboard", { replace: true });
            } else {
                // Manejar respuesta no exitosa
                if (data.status === AuthStatus.INVALID_EMAIL) {
                    setEmailError(data.message);
                } else if (data.status === AuthStatus.INVALID_PASSWORD) {
                    setPasswordError(data.message);
                }
                toast.error(data.message);
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const data = error.response.data as LoginResponse;

                if (data.status === AuthStatus.INVALID_EMAIL) {
                    setEmailError(data.message);
                } else if (data.status === AuthStatus.INVALID_PASSWORD) {
                    setPasswordError(data.message);
                }
                toast.error(data.message);
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

        // setters
        setEmail,
        setPassword,
        setShowPassword,

        // actions
        validateEmail,
        handleSubmit,
    };
}