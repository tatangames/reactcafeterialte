import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { confirmResetPassword } from "../../services/api.ts";


interface ResetPasswordConfirmResponse {
    success: boolean;
    code: string;
    message: string;
}

export function useConfirmResetPassword(
    token: string,
    email: string,
    onSuccess?: () => void
) {
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!password.trim()) {
            setPasswordError("La contraseña es obligatoria");
            return;
        }

        if (password.length < 4) {
            setPasswordError("Debe tener al menos 4 caracteres");
            return;
        }

        if (password !== passwordConfirmation) {
            setPasswordError("Las contraseñas no coinciden");
            return;
        }

        setPasswordError("");
        setLoading(true);

        try {
            const data: ResetPasswordConfirmResponse =
                await confirmResetPassword(
                    token,
                    email,
                    password,
                    passwordConfirmation
                );

            if (data.success) {
                toast.success(data.message);
                onSuccess?.();
                return;
            }

            toast.error(data.message);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Error de conexión");
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        password,
        passwordConfirmation,
        passwordError,
        loading,
        setPassword,
        setPasswordConfirmation,
        handleSubmit,
    };
}
