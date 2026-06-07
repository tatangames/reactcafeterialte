import { Modal } from "../ui/modal";

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    itemName: string;
    isDeleting?: boolean;
}

export default function ConfirmDeleteModal({
                                               isOpen,
                                               onClose,
                                               onConfirm,
                                               title,
                                               description,
                                               itemName,
                                               isDeleting = false,
                                           }: ConfirmDeleteModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-8 sm:p-12">
            <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                            stroke="#EF4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="mb-3 text-2xl font-semibold text-gray-800">
                    {title}
                </h2>

                {/* Description */}
                <p className="mb-8 max-w-md text-sm text-gray-600">
                    {description}{" "}
                    <span className="font-semibold text-gray-800">
            {itemName}
          </span>
                </p>

                {/* Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="min-w-[140px] rounded-lg bg-red-500 px-6 py-3 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                        {isDeleting ? "Borrando..." : "Borrar"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
