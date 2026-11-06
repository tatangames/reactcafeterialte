import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { getCategoriasTable } from '../../services/api';
import { actualizarStockMinimo, getStock } from '../../services/inventario';
import { getToken } from '../../utils/auth';
import { mensajeError } from '../../utils/formato';
import { CategoriasInterface, InventarioStockFiltros, InventarioStockInterface } from '../../types/interfaces';
import { sinTildes } from '../../utils/texto';

export function useInventarioStockHook() {
    const [data, setData] = useState<InventarioStockInterface[]>([]);
    const [categorias, setCategorias] = useState<CategoriasInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filtros, setFiltros] = useState<InventarioStockFiltros>({ clase: '', categoria_id: '', estado: '' });

    // Edición del stock mínimo
    const [editando, setEditando] = useState<InventarioStockInterface | null>(null);
    const [isSavingMinimo, setIsSavingMinimo] = useState(false);

    useEffect(() => {
        getCategoriasTable(getToken() ?? '')
            .then((res: CategoriasInterface[]) => setCategorias(res.filter(c => c.estado)))
            .catch(() => setCategorias([]));
    }, []);

    useEffect(() => { fetchStock(); }, [filtros]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            setData(await getStock(filtros));
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar stock');
        } finally {
            setLoading(false);
        }
    };

    const setFiltro = (campo: keyof InventarioStockFiltros, valor: string) =>
        setFiltros(prev => ({ ...prev, [campo]: valor }));

    const guardarMinimo = async (valor: number) => {
        if (!editando) return;
        setIsSavingMinimo(true);
        try {
            const res = await actualizarStockMinimo(editando.producto_id, valor);
            setData(prev => prev.map(p => p.producto_id === editando.producto_id
                ? { ...p, stock_minimo: valor, bajo_minimo: res.bajo_minimo }
                : p));
            toast.success(res.message);
            setEditando(null);
        } catch (error) {
            toast.error(mensajeError(error, 'Error al guardar el stock mínimo'));
        } finally {
            setIsSavingMinimo(false);
        }
    };

    const texto = sinTildes(filterText);
    const filteredData = data.filter(item =>
        sinTildes(item.producto).includes(texto) ||
        sinTildes(item.sku ?? '').includes(texto) ||
        sinTildes(item.codigo_barras ?? '').includes(texto)
    );

    const resumen = useMemo(() => ({
        productos:  filteredData.length,
        enAlerta:   filteredData.filter(p => p.bajo_minimo).length,
        valorTotal: filteredData.reduce((suma, p) => suma + p.valor_inventario, 0),
    }), [filteredData]);

    return {
        filteredData,
        categorias,
        loading,
        filterText,
        setFilterText,
        filtros,
        setFiltro,
        resumen,
        editando,
        setEditando,
        isSavingMinimo,
        guardarMinimo,
    };
}
