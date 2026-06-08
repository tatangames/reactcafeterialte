import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { getProductosTable } from "../../services/api";
import { getToken } from "../../utils/auth";
import { ProductoInterface } from "../../types/interfaces";

export function useProductosCatalogoHook() {
    const [data, setData] = useState<ProductoInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getProductosTable(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar productos");
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(
        (item) =>
            item.nombre.toLowerCase().includes(filterText.toLowerCase()) ||
            (item.sku ?? "").toLowerCase().includes(filterText.toLowerCase())
    );

    return {
        filteredData,
        loading,
        filterText,
        setFilterText,
    };
}