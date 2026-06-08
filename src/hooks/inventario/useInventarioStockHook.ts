import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { getInventarioStock } from '../../services/api';
import { getToken } from '../../utils/auth';
import { InventarioStockInterface } from '../../types/interfaces';

export function useInventarioStockHook() {
    const [data, setData] = useState<InventarioStockInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => { fetchStock(); }, []);

    const fetchStock = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error('Token no encontrado');
            const response = await getInventarioStock(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar stock');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item =>
        item.producto.toLowerCase().includes(filterText.toLowerCase()) ||
        (item.sku ?? '').toLowerCase().includes(filterText.toLowerCase())
    );

    return { filteredData, loading, filterText, setFilterText };
}