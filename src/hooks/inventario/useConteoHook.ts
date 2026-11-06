import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { getCategoriasTable } from '../../services/api';
import { getStock, registrarConteo } from '../../services/inventario';
import { getToken } from '../../utils/auth';
import { hoyLocal, mensajeError } from '../../utils/formato';
import { CategoriasInterface, InventarioStockInterface } from '../../types/interfaces';
import { sinTildes } from '../../utils/texto';

export interface LineaConteo {
    producto: InventarioStockInterface;
    contado: number;
    diferencia: number;
    valorDiferencia: number;
}

// Conteo físico: se anota lo contado y se ajusta solo lo que se capturó
export function useConteoHook() {
    const navigate = useNavigate();

    const [productos, setProductos] = useState<InventarioStockInterface[]>([]);
    const [categorias, setCategorias] = useState<CategoriasInterface[]>([]);
    const [clase, setClase] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [buscar, setBuscar] = useState('');
    const [conteos, setConteos] = useState<Record<number, string>>({});
    const [motivo, setMotivo] = useState('Conteo físico');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmando, setConfirmando] = useState(false);

    useEffect(() => {
        Promise.all([getStock(), getCategoriasTable(getToken() ?? '')])
            .then(([stock, cats]) => {
                setProductos(stock);
                setCategorias((cats as CategoriasInterface[]).filter(c => c.estado));
            })
            .catch(() => toast.error('Error al cargar productos'))
            .finally(() => setLoading(false));
    }, []);

    const categoriaNombre = categorias.find(c => String(c.id) === categoriaId)?.nombre;
    const texto = sinTildes(buscar);

    const visibles = productos.filter(p =>
        (!clase || p.clase === clase) &&
        (!categoriaNombre || p.categorias.includes(categoriaNombre)) &&
        (!texto || sinTildes(p.producto).includes(texto) || sinTildes(p.sku ?? '').includes(texto))
    );

    const setConteo = (productoId: number, valor: string) =>
        setConteos(prev => {
            const nuevo = { ...prev };
            if (valor === '') delete nuevo[productoId];
            else nuevo[productoId] = valor;
            return nuevo;
        });

    // Solo las líneas capturadas (en cualquier filtro), con su diferencia
    const lineas: LineaConteo[] = useMemo(() => productos
        .filter(p => conteos[p.producto_id] !== undefined)
        .map(p => {
            const contado = Number(conteos[p.producto_id]);
            const diferencia = contado - p.stock_actual;
            return { producto: p, contado, diferencia, valorDiferencia: diferencia * p.costo_unitario };
        }), [productos, conteos]);

    const resumen = useMemo(() => ({
        capturados: lineas.length,
        conDiferencia: lineas.filter(l => Math.abs(l.diferencia) > 0.00001).length,
        faltante: lineas.filter(l => l.diferencia < 0).reduce((s, l) => s + l.valorDiferencia, 0),
        sobrante: lineas.filter(l => l.diferencia > 0).reduce((s, l) => s + l.valorDiferencia, 0),
    }), [lineas]);

    // Igualar al sistema: marca como contado el stock actual de lo visible (para luego corregir solo las diferencias)
    const copiarSistema = () =>
        setConteos(prev => {
            const nuevo = { ...prev };
            visibles.forEach(p => {
                if (nuevo[p.producto_id] === undefined) nuevo[p.producto_id] = String(Math.max(p.stock_actual, 0));
            });
            return nuevo;
        });

    const pedirConfirmacion = () => {
        if (!motivo.trim()) { toast.error('Indica el motivo del conteo'); return; }
        if (lineas.length === 0) { toast.error('Captura al menos una cantidad contada'); return; }
        const decimalInvalido = lineas.find(l => !l.producto.permite_fraccion && !Number.isInteger(l.contado));
        if (decimalInvalido) { toast.error(`${decimalInvalido.producto.producto} solo admite cantidades enteras`); return; }
        if (resumen.conDiferencia === 0) { toast('Lo contado coincide con el sistema: no hay nada que ajustar'); return; }
        setConfirmando(true);
    };


    const guardar = async () => {
        setIsSaving(true);
        try {
            // Solo se envían las líneas con diferencia: las que coinciden no generan movimiento
            const res = await registrarConteo({
                fecha: hoyLocal(),
                descripcion: motivo.trim(),
                items: lineas
                    .filter(l => Math.abs(l.diferencia) > 0.00001)
                    .map(l => ({ producto_id: l.producto.producto_id, cantidad: l.contado })),
            });
            toast.success(res.message || 'Conteo registrado');
            navigate('/admin/inventario');
        } catch (error) {
            toast.error(mensajeError(error, 'Error al registrar el conteo'));
        } finally {
            setIsSaving(false);
            setConfirmando(false);
        }
    };

    return {
        visibles, categorias, clase, setClase, categoriaId, setCategoriaId, buscar, setBuscar,
        conteos, setConteo, motivo, setMotivo, lineas, resumen, copiarSistema,
        loading, isSaving, confirmando, setConfirmando, pedirConfirmacion, guardar,
    };
}
