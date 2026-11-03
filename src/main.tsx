import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";

import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CajaProvider } from "./context/CajaContext.tsx";
import { ConexionProvider } from "./context/ConexionContext.tsx";

createRoot(document.getElementById("root")!).render(

        <StrictMode>
            <AuthProvider>
                <ConexionProvider>
                    <CajaProvider>
                        <ThemeProvider>
                            <App />
                        </ThemeProvider>
                    </CajaProvider>
                </ConexionProvider>
            </AuthProvider>
        </StrictMode>

);

// Service worker: permite volver a abrir el POS sin conexión. Los navegadores solo
// lo permiten en https o localhost; en http://192.168.x.x se omite y el POS sigue
// vendiendo sin conexión mientras la página permanezca abierta.
if (import.meta.env.PROD && "serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker no registrado:", error));
    });
}
