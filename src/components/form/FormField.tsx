import { ReactNode } from "react";

interface FormFieldProps {
    label: string;
    required?: boolean;
    hint?: string;
    children: ReactNode;
}

// Etiqueta + control + ayuda, con el estilo de los formularios existentes
export default function FormField({ label, required, hint, children }: FormFieldProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
    );
}

export const inputClass =
    "w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition bg-white";
