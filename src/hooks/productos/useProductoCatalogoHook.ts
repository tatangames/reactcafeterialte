import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { getProductosTable } from "../../services/api";
import { getToken } from "../../utils/auth";
import { ProductoInterface } from "../../types/interfaces";
import { sinTildes } from "../../utils/texto";

export function useProductosCatalogoHook() {
    const [data, setData] = useState<ProductoInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [claseFiltro, setClaseFiltro] = useState("");

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

    const texto = sinTildes(filterText);
    const filteredData = data.filter(
        (item) =>
            (!claseFiltro || item.clase === claseFiltro) &&
            (sinTildes(item.nombre).includes(texto) ||
                sinTildes(item.sku ?? "").includes(texto) ||
                sinTildes(item.codigo_barras ?? "").includes(texto))
    );

    return {
        filteredData,
        loading,
        filterText,
        setFilterText,
        claseFiltro,
        setClaseFiltro,
    };
}