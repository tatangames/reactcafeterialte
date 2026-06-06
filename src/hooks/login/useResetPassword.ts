import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { sendResetPasswordEmail } from "../../services/api.ts";

// Codes que vienen del backend
export enum ResetPasswordCode {
    EMAIL_REQUIRED = "EMAIL_REQUIRED",
    EMAIL_INVALID = "EMAIL_INVALID",
    EMAIL_NOT_FOUND = "EMAIL_NOT_FOUND",
    RESET_EMAIL_SENT = "RESET_EMAIL_SENT",
    RESET_EMAIL_FAILED = "RESET_EMAIL_FAILED",
}

interface ResetPasswordResponse {
    success: boolean;
    code: ResetPasswordCode;
    message: string;
}

export function useResetPassword() {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [loading, setLoading] = useState(false);

    // Validación frontend
    const validateEmail = (value: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!value.trim()) {
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

        // Validación local
        if (!validateEmail(email)) return;

        setLoading(true);
        setEmailError("");

        try {
            const data: ResetPasswordResponse = await sendResetPasswordEmail(email);

            if (data.success) {
                toast.success(data.message);
                setEmail("");
                return;
            }

            // Manejo de errores controlados por backend
            if (
                data.code === ResetPasswordCode.EMAIL_REQUIRED ||
                data.code === ResetPasswordCode.EMAIL_INVALID ||
                data.code === ResetPasswordCode.EMAIL_NOT_FOUND
            ) {
                setEmailError(data.message);
            }

            toast.error(data.message);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const data = error.response.data as ResetPasswordResponse;

                if (
                    data.code === ResetPasswordCode.EMAIL_REQUIRED ||
                    data.code === ResetPasswordCode.EMAIL_INVALID ||
                    data.code === ResetPasswordCode.EMAIL_NOT_FOUND
                ) {
                    setEmailError(data.message);
                }

                toast.error(data.message || "Error al enviar el correo");
            } else {
                toast.error("Error de conexión con el servidor");
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        // state
        email,
        emailError,
        loading,

        // setters
        setEmail,

        // actions
        handleSubmit,
    };
}
