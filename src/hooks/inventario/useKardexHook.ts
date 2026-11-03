import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';

import { getKardex } from '../../services/inventario';
import { haceDias, hoyLocal, mensajeError } from '../../utils/formato';
import { KardexResponseInterface } from '../../types/interfaces';

export function useKardexHook() {
    const { id } = useParams();
    const productoId = Number(id);

    const [rango, setRango] = useState({ desde: haceDias(29), hasta: hoyLocal() });
    const [pagina, setPagina] = useState(1);
    const [kardex, setKardex] = useState<KardexResponseInterface | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!rango.desde || !rango.hasta) return;
        setLoading(true);
        getKardex(productoId, { ...rango, page: pagina })
            .then(setKardex)
            .catch((error) => toast.error(mensajeError(error, 'Error al cargar el kardex')))
            .finally(() => setLoading(false));
    }, [productoId, rango, pagina]);

    const cambiarRango = (nuevo: { desde: string; hasta: string }) => {
        setPagina(1);
        setRango(nuevo);
    };

    return { kardex, rango, cambiarRango, pagina, setPagina, loading };
}
