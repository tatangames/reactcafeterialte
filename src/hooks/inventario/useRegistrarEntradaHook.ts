import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { registrarEntradaInventario, getInventarioStock } from '../../services/api';
import { getToken } from '../../utils/auth';
import { InventarioStockInterface, EntradaFormInterface, EntradaFormItem } from '../../types/interfaces';

const hoy = new Date().toISOString().split('T')[0];

const initialForm: EntradaFormInterface = {
    fecha:       hoy,
    tipo:        'entrada',
    descripcion: '',
    items:       [{ producto_id: '', cantidad: '' }],
};

export function useRegistrarEntradaHook() {
    const navigate = useNavigate();

    const [form, setForm] = useState<EntradaFormInterface>(initialForm);
    const [productos, setProductos] = useState<InventarioStockInterface[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const res = await getInventarioStock(token);
                setProductos(res);
            } catch {
                toast.error('Error al cargar productos');
            } finally {
                setLoadingProductos(false);
            }
        };
        cargar();
    }, []);

    const handleChange = (field: keyof Omit<EntradaFormInterface, 'items'>, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const agregarItem = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { producto_id: '', cantidad: '' }],
        }));
    };

    const eliminarItem = (index: number) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleItemChange = (index: number, field: keyof EntradaFormItem, value: string) => {
        setForm(prev => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const validar = (): boolean => {
        if (!form.fecha) { toast.error('La fecha es requerida'); return false; }
        if (form.items.length === 0) { toast.error('Agrega al menos un producto'); return false; }

        for (let i = 0; i < form.items.length; i++) {
            if (!form.items[i].producto_id) {
                toast.error(`Selecciona el producto en la línea ${i + 1}`);
                return false;
            }
            if (!form.items[i].cantidad || Number(form.items[i].cantidad) <= 0) {
                toast.error(`La cantidad en la línea ${i + 1} debe ser mayor a 0`);
                return false;
            }
        }

        const ids = form.items.map(i => i.producto_id);
        if (new Set(ids).size !== ids.length) {
            toast.error('Hay productos repetidos en el desglose');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validar()) return;

        setIsSaving(true);
        try {
            const token = getToken();
            const response = await registrarEntradaInventario(token!, {
                fecha:       form.fecha,
                tipo:        form.tipo,
                descripcion: form.descripcion || undefined,
                items:       form.items.map(i => ({
                    producto_id: Number(i.producto_id),
                    cantidad:    Number(i.cantidad),
                })),
            });

            toast.success(response.message || 'Registro guardado correctamente');
            navigate('/admin/inventario/entradas');
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error((firstError as string[])[0]);
            } else {
                toast.error(error.response?.data?.message || 'Error al guardar');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return {
        form,
        productos,
        loadingProductos,
        isSaving,
        handleChange,
        agregarItem,
        eliminarItem,
        handleItemChange,
        handleSubmit,
    };
}