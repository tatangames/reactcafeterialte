import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { getInventarioEntradas } from '../../services/api';
import { getToken } from '../../utils/auth';
import { EntradaInventarioInterface } from '../../types/interfaces';

export function useEntradasHook() {
    const [data, setData] = useState<EntradaInventarioInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [selectedEntrada, setSelectedEntrada] = useState<EntradaInventarioInterface | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => { fetchEntradas(); }, []);

    const fetchEntradas = async () => {
        try {
            const token = getToken();
            if (!token) throw new Error('Token no encontrado');
            const response = await getInventarioEntradas(token);
            setData(response);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar registros');
        } finally {
            setLoading(false);
        }
    };

    const verDetalle = (entrada: EntradaInventarioInterface) => {
        setSelectedEntrada(entrada);
        setIsDetailOpen(true);
    };

    const cerrarDetalle = () => {
        setIsDetailOpen(false);
        setSelectedEntrada(null);
    };

    const filteredData = data.filter(item =>
        (item.descripcion ?? '').toLowerCase().includes(filterText.toLowerCase()) ||
        item.fecha.includes(filterText)
    );

    return {
        filteredData,
        loading,
        filterText,
        setFilterText,
        selectedEntrada,
        isDetailOpen,
        verDetalle,
        cerrarDetalle,
    };
}