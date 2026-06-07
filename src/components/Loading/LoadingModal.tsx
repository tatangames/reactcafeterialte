// components/LoadingModal.tsx
import { createPortal } from "react-dom";

interface LoadingModalProps {
    isOpen: boolean;
    text?: string;
}

export default function LoadingModal({ isOpen, text = "Cargando..." }: LoadingModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[99999] flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-3">
                {/* Spinner */}
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-3 border-gray-200 rounded-full"></div>
                    <div className="absolute inset-0 border-3 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>

                {/* Texto */}
                <p className="text-sm font-medium text-gray-700">{text}</p>
            </div>
        </div>,
        document.body
    );
}