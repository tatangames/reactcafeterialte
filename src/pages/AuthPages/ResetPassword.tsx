import PageMeta from "../../components/common/PageMeta";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  return (
    <>
      <PageMeta
        title="Recuperar contraseña"
        description=""
      />

      <div className="min-h-screen flex flex-col items-center justify-start bg-[#6F491A] pt-20">

        {/* Logo */}
        <img
          src="/images/logo/logoe.jpg"
          alt="Logo"
          className="h-32 mb-6"
        />

        {/* Card */}
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-gray-800">
              ¿Olvidaste tu contraseña?
            </h1>

            <p className="text-sm text-gray-500">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          <ResetPasswordForm />

            {/* Volver a inicio */}
            <div className="mt-6 text-center">
                <Link
                    to="/"
                    className="text-sm text-[#6F491A] hover:text-[#5a3a15] font-medium transition-colors"
                >
                    ← Volver a inicio
                </Link>
            </div>

        </div>
      </div>
    </>
  );
};

export default ResetPassword;
