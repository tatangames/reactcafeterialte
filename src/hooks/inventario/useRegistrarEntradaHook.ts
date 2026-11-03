import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { registrarEntradaInventario } from '../../services/api';
import { getStock } from '../../services/inventario';
import { getToken } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';
import { hoyLocal, mensajeError } from '../../utils/formato';
import { InventarioStockInterface, EntradaFormInterface, EntradaFormItem } from '../../types/interfaces';

const itemVacio: EntradaFormItem = { producto_id: '', cantidad: '', costo_unitario: '' };

// El costo solo aplica a lo que entra: recalcula el costo promedio del producto
export const tipoConCosto = (tipo: EntradaFormInterface['tipo']) => tipo === 'entrada' || tipo === 'produccion';

export function useRegistrarEntradaHook() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    // Tipos que el usuario puede registrar (los ajustes tienen permiso propio)
    const tiposPermitidos = (['entrada', 'salida', 'ajuste', 'produccion'] as const).filter((t) =>
        t === 'ajuste' ? hasPermission('inventario.ajustar') : hasPermission('inventario.registrar')
    );

    const [form, setForm] = useState<EntradaFormInterface>(() => ({
        fecha:       hoyLocal(),
        tipo:        tiposPermitidos[0] ?? 'entrada',
        descripcion: '',
        items:       [{ ...itemVacio }],
    }));
    const [productos, setProductos] = useState<InventarioStockInterface[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                setProductos(await getStock());
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
            items: [...prev.items, { ...itemVacio }],
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

    const productoDe = (id: string) => productos.find(p => String(p.producto_id) === id);

    const validar = (): boolean => {
        if (!form.fecha) { toast.error('La fecha es requerida'); return false; }
        if (form.fecha > hoyLocal()) { toast.error('La fecha no puede ser futura'); return false; }
        if (form.tipo === 'ajuste' && !form.descripcion.trim()) { toast.error('Indica el motivo del ajuste'); return false; }
        if (form.items.length === 0) { toast.error('Agrega al menos un producto'); return false; }

        for (let i = 0; i < form.items.length; i++) {
            const item = form.items[i];
            if (!item.producto_id) {
                toast.error(`Selecciona el producto en la línea ${i + 1}`);
                return false;
            }
            const valor = Number(item.cantidad);
            const minimoOk = form.tipo === 'ajuste' ? item.cantidad !== '' && valor >= 0 : valor > 0;
            if (!minimoOk) {
                toast.error(form.tipo === 'ajuste'
                    ? `Ingresa la cantidad contada en la línea ${i + 1}`
                    : `La cantidad en la línea ${i + 1} debe ser mayor a 0`);
                return false;
            }
            const producto = productoDe(item.producto_id);
            if (producto && !producto.permite_fraccion && !Number.isInteger(valor)) {
                toast.error(`${producto.producto} solo admite cantidades enteras`);
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
            const response = await registrarEntradaInventario(getToken()!, {
                fecha:       form.fecha,
                tipo:        form.tipo,
                descripcion: form.descripcion || undefined,
                items:       form.items.map(i => ({
                    producto_id:    Number(i.producto_id),
                    cantidad:       Number(i.cantidad),
                    costo_unitario: tipoConCosto(form.tipo) && i.costo_unitario !== '' ? Number(i.costo_unitario) : undefined,
                })),
            });

            toast.success(response.message || 'Registro guardado correctamente');
            navigate('/admin/inventario/entradas');
        } catch (error) {
            toast.error(mensajeError(error, 'Error al guardar'));
        } finally {
            setIsSaving(false);
        }
    };

    return {
        form,
        productos,
        tiposPermitidos,
        productoDe,
        loadingProductos,
        isSaving,
        handleChange,
        agregarItem,
        eliminarItem,
        handleItemChange,
        handleSubmit,
    };
}
