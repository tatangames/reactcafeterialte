// components/common/PageMeta.tsx
import { useEffect } from "react";

const PageMeta = ({ title, description }: { title: string; description: string }) => {
    useEffect(() => {
        document.title = title;

        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute("content", description);
    }, [title, description]);

    return null;
};

export const AppWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default PageMeta;