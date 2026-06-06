import { useResetPassword } from "../../hooks/login/useResetPassword.ts";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";

const ResetPasswordForm = () => {
    const {
        email,
        emailError,
        loading,
        setEmail,
        handleSubmit,
    } = useResetPassword();

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <Label>Correo electrónico *</Label>
                <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={emailError ? "border-red-500" : ""}
                    placeholder="correo@ejemplo.com"
                    maxLength={100}
                />
                {emailError && (
                    <p className="text-sm text-red-500">{emailError}</p>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
            </Button>
        </form>
    );
};

export default ResetPasswordForm;