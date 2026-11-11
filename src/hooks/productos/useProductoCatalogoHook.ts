import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { borrarProducto, getProductosTable } from "../../services/api";
import { getToken } from "../../utils/auth";
import { ProductoInterface } from "../../types/interfaces";
import { sinTildes } from "../../utils/texto";
import { mensajeError } from "../../utils/formato";

export const SIN_CATEGORIA = "__sin_categoria__";

export function useProductosCatalogoHook() {
    const [data, setData] = useState<ProductoInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [claseFiltro, setClaseFiltro] = useState("");
    // "" = todas; SIN_CATEGORIA = los que no tienen ninguna; otro = nombre de la categoría
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [borrando, setBorrando] = useState<ProductoInterface | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDelete = async () => {
        if (!borrando) return;
        setIsDeleting(true);
        try {
            const response = await borrarProducto(getToken()!, borrando.id);
            toast.success(response.message || "Producto borrado");
            setBorrando(null);
            fetchProductos();
        } catch (error) {
            toast.error(mensajeError(error, "No se pudo borrar el producto"));
        } finally {
            setIsDeleting(false);
        }
    };

    // Las categorías que tienen al menos un producto, en orden alfabético
    const categorias = [...new Set(data.flatMap((p) => p.categorias ?? []))].sort((a, b) => a.localeCompare(b, "es"));
    const sinCategoria = data.filter((p) => !p.categorias?.length).length;

    const texto = sinTildes(filterText);
    const filteredData = data.filter(
        (item) =>
            (!claseFiltro || item.clase === claseFiltro) &&
            (!categoriaFiltro ||
                (categoriaFiltro === SIN_CATEGORIA ? !item.categorias?.length : !!item.categorias?.includes(categoriaFiltro))) &&
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
        categorias,
        sinCategoria,
        categoriaFiltro,
        setCategoriaFiltro,
        borrando,
        setBorrando,
        isDeleting,
        handleDelete,
    };
}