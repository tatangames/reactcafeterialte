import { Link } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useSignIn } from "../../hooks/login/useSignIn.ts";
import LoadingOverlay from "../ui/loading/LoadingOverlay.tsx";

function SignInForm() {
  const {
    email,
    emailError,
    password,
    passwordError,
    loading,
    showPassword,
    setEmail,
    setPassword,
    setShowPassword,
    validateEmail,
    handleSubmit,
  } = useSignIn();

  return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-[#6F491A] pt-10">

        <img src="/images/logo/logoe.jpg" alt="Logo" className="h-32 mb-6"/>

        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-gray-800">
              Iniciar sesión
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tu correo y contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <Label>Correo electrónico *</Label>
              <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  className={emailError ? "border-red-500" : ""}
                  maxLength={100}
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            </div>

            <div>
              <Label>Contraseña *</Label>
              <div className="relative">
                <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                {showPassword ? <EyeIcon/> : <EyeCloseIcon/>}
              </span>
              </div>
              {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
              )}
            </div>

            <div className="text-right">
              <Link to="/reset-password" className="text-sm text-blue-600">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {loading && <LoadingOverlay />}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

          </form>
        </div>
      </div>
  );
}

export default SignInForm
