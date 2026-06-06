import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";

export default function NotFound() {
  return (
      <>
        <PageMeta
            title="Página no encontrada | 404"
            description="La página que buscas no existe"
        />
        <div className="min-h-screen flex flex-col items-center justify-start bg-[#6F491A] pt-20">
          <img src="/images/logo/logoe.jpg" alt="Logo" className="h-32 mb-6" />

          <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl text-center">
            <h1 className="mb-4 text-6xl font-bold text-[#6F491A]">
              404
            </h1>

            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Página no encontrada
            </h2>

            <p className="mb-8 text-gray-600">
              Lo sentimos, no pudimos encontrar la página que estás buscando.
            </p>

            <Link
                to="/"
                className="inline-flex items-center justify-center w-full px-5 py-3 text-sm font-medium text-white bg-[#6F491A] rounded-lg hover:bg-[#5a3a15] transition"
            >
              Volver al inicio
            </Link>
          </div>

          {/* Footer */}
          <p className="mt-8 text-sm text-white">
            &copy; {new Date().getFullYear()} - Panadería Eduardo
          </p>
        </div>
      </>
  );
}