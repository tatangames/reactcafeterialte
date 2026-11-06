import { ComandaInterface } from "../types/mesas";
import { LineaCarritoInterface } from "../types/pos";
import { cantidad } from "./formato";
import { textoAjuste } from "./carrito";

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Imprime desde el navegador un ticket por área, cada uno en su propia página, para
 * cuando no hay térmica configurada o falló. Mismo formato que la térmica
 * (ImpresionService::comanda): #número, negocio, «Solicitud de producción», mesa,
 * fecha y hora, ====, la cuenta, CANT / DESCRIPCIÓN con «* extra» y ORIGINAL o COPIA.
 * Usa un iframe aparte para que los saltos de página no dependan de la pantalla actual.
 */
export const imprimirComandasNavegador = (comandas: ComandaInterface[], copia = false, negocio?: string | null) => {
    const activas = comandas
        .map((c) => ({ ...c, items: c.items.filter((i) => !i.cancelado) }))
        .filter((c) => c.items.length > 0);
    if (activas.length === 0) return;

    const nombre = (negocio || "Panadería Eduardo").toUpperCase();
    const lugar = (c: ComandaInterface) => c.terminal_tipo === "mesa" ? `Mesa: ${c.terminal}` : c.terminal_tipo === "caja" ? "Mostrador" : c.terminal;
    const fecha = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

    const paginas = activas.map((c) => `
        <section class="comanda">
            <p class="alto">#${escapar(c.numero)}</p>
            <p class="alto">${escapar(nombre)}</p>
            <p>Solicitud de producción</p>
            ${c.area ? `<p class="alto espacio">** ${escapar(c.area.toUpperCase())} **</p>` : ""}
            <p class="izq espacio">${escapar(lugar(c))}</p>
            ${c.notas ? `<p class="izq">Nota: ${escapar(c.notas)}</p>` : ""}
            <p class="izq espacio">${escapar(fecha(c.enviada_at))}</p>
            <p class="der">${escapar(c.enviada_at.slice(11, 16))}</p>
            <p class="separador">${"=".repeat(60)}</p>
            ${c.cuenta ? `<p class="espacio">${escapar(c.cuenta)}</p>` : ""}
            <table class="espacio">
                <tr><td class="cant">CANT</td><td>DESCRIPCIÓN</td></tr>
                ${c.items.map((i) => `
                <tr><td class="cant">${escapar(cantidad(i.cantidad))}</td><td>${escapar(i.nombre)}</td></tr>
                ${[...i.modificadores, ...(i.ajustes ?? []), ...(i.notas ? [i.notas] : [])]
                    .map((x) => `<tr><td></td><td class="extra">* ${escapar(x)}</td></tr>`).join("")}`).join("")}
            </table>
            <p class="espacio">${copia ? "COPIA" : "ORIGINAL"}</p>
        </section>`).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comandas</title><style>
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; font-family: "Courier New", monospace; color: #000; font-weight: bold; }
        .comanda { width: 72mm; padding: 3mm 4mm; break-after: page; page-break-after: always; font-size: 15px; line-height: 1.35; }
        .comanda:last-child { break-after: auto; page-break-after: auto; }
        p { margin: 0; text-align: center; }
        .alto { font-size: 20px; line-height: 1.6; transform: scaleY(1.4); }
        .izq { text-align: left; }
        .der { text-align: right; }
        .espacio { margin-top: 3mm; }
        .separador { font-weight: normal; font-size: 12px; overflow: hidden; white-space: nowrap; margin-top: 1mm; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 0; text-align: left; }
        .cant { width: 14mm; }
        .extra { padding-left: 0; }
    </style></head><body>${paginas}</body></html>`;

    const marco = document.createElement("iframe");
    marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(marco);
    const doc = marco.contentWindow!.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
        marco.contentWindow!.focus();
        marco.contentWindow!.print();
        setTimeout(() => marco.remove(), 1000);
    }, 100);
};

/**
 * Comandas de una venta de mostrador, una por área (lo que no tiene área va en la
 * comanda general), con la misma forma que las de mesa para imprimirlas igual.
 */
export const comandasDeMostrador = (lineas: LineaCarritoInterface[], numero: string, usuario: string | null): ComandaInterface[] => {
    const ahora = new Date();
    const dos = (n: number) => String(n).padStart(2, "0");
    const enviada = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())} ${dos(ahora.getHours())}:${dos(ahora.getMinutes())}:00`;

    const porArea = new Map<string, LineaCarritoInterface[]>();
    lineas.forEach((l) => {
        const area = l.producto.area ?? "";
        porArea.set(area, [...(porArea.get(area) ?? []), l]);
    });

    return [...porArea.entries()].map(([area, delArea], i) => ({
        id: -(i + 1), numero, orden_id: 0, terminal: "Mostrador", terminal_tipo: "caja", cuenta: null, area: area || null, color: "#6b7280",
        estado: "pendiente", notas: null, usuario, enviada_at: enviada, iniciada_at: null, terminada_at: null, entregada_at: null,
        items: delArea.map((l, j) => ({
            id: j, nombre: l.producto.nombre, cantidad: l.cantidad,
            modificadores: l.extras ?? [], ajustes: (l.ajustes ?? []).map(textoAjuste), notas: l.notas ?? null, cancelado: false,
        })),
    }));
};
