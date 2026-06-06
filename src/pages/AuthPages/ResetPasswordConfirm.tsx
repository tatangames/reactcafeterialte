import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import ResetPasswordConfirmForm from "../../components/auth/ResetPasswordConfirmForm";
import LoadingOverlay from "../../components/ui/loading/LoadingOverlay";
import {validateResetToken} from "../../services/api.ts";

const ResetPasswordConfirm = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const token = params.get("token") || "";
    const email = params.get("email") || "";

    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const validateToken = async () => {
            if (!token || !email) {
                setErrorMessage("Enlace inválido o incompleto");
                setValidating(false);
                return;
            }

            try {
                await validateResetToken(token, email);
                setTokenValid(true);
            } catch (error: any) {
                const message = error?.response?.data?.message || "El token ha expirado o es inválido";
                setErrorMessage(message);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token, email]);

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#6F491A]">
                <LoadingOverlay />
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-start bg-[#6F491A] pt-20">
                <img
                    src="/images/logo/logoe.jpg"
                    alt="Logo"
                    className="h-32 mb-6"
                />

                <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl text-center">
                    <div className="mb-6">
                        <svg
                            className="mx-auto h-12 w-12 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        {errorMessage}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        El enlace de recuperación ha expirado o ya fue utilizado.
                        Por favor, solicita un nuevo enlace.
                    </p>

                    <button
                        onClick={() => navigate("/reset-password")}
                        className="w-full py-2 px-4 bg-[#6F491A] text-white rounded-lg hover:bg-[#5a3a15] transition"
                    >
                        Solicitar nuevo enlace
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <PageMeta title="Restablecer contraseña" description="" />

            <div className="min-h-screen flex flex-col items-center justify-start bg-[#6F491A] pt-20">
                <img
                    src="/images/logo/logoe.jpg"
                    alt="Logo"
                    className="h-32 mb-6"
                />

                <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl">
                    <div className="mb-6 text-center">
                        <h1 className="mb-2 text-2xl font-semibold text-gray-800">
                            Restablecer contraseña
                        </h1>
                        <p className="text-sm text-gray-500">
                            Ingresa tu nueva contraseña
                        </p>
                    </div>

                    <ResetPasswordConfirmForm
                        token={token}
                        email={email}
                        onSuccess={() => navigate("/")}
                    />
                </div>
            </div>
        </>
    );
};

export default ResetPasswordConfirm;