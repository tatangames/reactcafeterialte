import SignInForm from "../../components/auth/SignInForm";
import PageMeta from "../../components/common/PageMeta";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Iniciar sesión | Cafetería"
        description="Acceso al sistema de cafetería"
      />
      <SignInForm />
    </>
  );
}
