export default function LoadingOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-xl">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="text-sm font-medium text-gray-700">
          Cargando...
        </span>
            </div>
        </div>
    );
}
