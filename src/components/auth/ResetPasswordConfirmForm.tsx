import { useState } from "react";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import LoadingOverlay from "../ui/loading/LoadingOverlay";
import {confirmResetPassword} from "../../services/api.ts";
import toast from "react-hot-toast";

interface ResetPasswordConfirmFormProps {
    token: string;
    email: string;
    onSuccess: () => void;
}

const ResetPasswordConfirmForm = ({ token, email, onSuccess }: ResetPasswordConfirmFormProps) => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await confirmResetPassword(token, email, password, confirmPassword);

            toast.success(data.message);

            onSuccess();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            <div>
                <Label>Nueva contraseña *</Label>
                <div className="relative">
                    <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        maxLength={50}
                    />
                    <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 hover:text-gray-800"
                    >
                        {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                    </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Mínimo 8 caracteres
                </p>
            </div>

            <div>
                <Label>Confirmar contraseña *</Label>
                <div className="relative">
                    <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        maxLength={50}
                    />
                    <span
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 hover:text-gray-800"
                    >
                        {showConfirmPassword ? <EyeIcon /> : <EyeCloseIcon />}
                    </span>
                </div>
            </div>

            {loading && <LoadingOverlay />}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Restableciendo..." : "Restablecer contraseña"}
            </Button>
        </form>
    );
};

export default ResetPasswordConfirmForm;