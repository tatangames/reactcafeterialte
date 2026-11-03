import { ComandaInterface } from "../types/mesas";
import { LineaCarritoInterface } from "../types/pos";
import { cantidad } from "./formato";

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Imprime desde el navegador un ticket por área (COCINA, BARRA…), cada uno en su
 * propia página, para cuando no hay térmica configurada o falló. Usa un iframe
 * aparte para que los saltos de página no dependan de la pantalla actual.
 */
export const imprimirComandasNavegador = (comandas: ComandaInterface[], copia = false) => {
    const activas = comandas
        .map((c) => ({ ...c, items: c.items.filter((i) => !i.cancelado) }))
        .filter((c) => c.items.length > 0);
    if (activas.length === 0) return;

    const paginas = activas.map((c) => `
        <section class="comanda">
            <h1>${escapar((c.area ?? "Comanda").toUpperCase())}</h1>
            <p class="titulo">${escapar(c.terminal)} · #${escapar(c.numero)}${copia ? " (COPIA)" : ""}</p>
            <p>${escapar(c.enviada_at.slice(8, 10) + "/" + c.enviada_at.slice(5, 7) + "/" + c.enviada_at.slice(0, 4) + " " + c.enviada_at.slice(11, 16))}</p>
            ${c.usuario ? `<p>Mesero: ${escapar(c.usuario)}</p>` : ""}
            ${c.notas ? `<p>Nota: ${escapar(c.notas)}</p>` : ""}
            <hr>
            ${c.items.map((i) => `
                <div class="item">
                    <p class="linea">${escapar(cantidad(i.cantidad))}&nbsp;&nbsp;${escapar(i.nombre)}</p>
                    ${i.modificadores.length || i.notas ? `<p class="extra">&gt; ${escapar([...i.modificadores.map((m) => "+ " + m), ...(i.notas ? [i.notas] : [])].join(" · "))}</p>` : ""}
                </div>`).join("")}
            <hr>
        </section>`).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comandas</title><style>
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; font-family: "Courier New", monospace; color: #000; }
        .comanda { width: 72mm; padding: 3mm 4mm; break-after: page; page-break-after: always; }
        .comanda:last-child { break-after: auto; page-break-after: auto; }
        h1 { margin: 0 0 2mm; text-align: center; font-size: 26px; letter-spacing: 2px; }
        p { margin: 0; font-size: 13px; text-align: center; }
        .titulo { font-weight: bold; font-size: 15px; }
        hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
        .item { margin-bottom: 2mm; }
        .linea { text-align: left; font-weight: bold; font-size: 17px; }
        .extra { text-align: left; font-size: 13px; padding-left: 4mm; }
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
        id: -(i + 1), numero, orden_id: 0, terminal: "Mostrador", area: area || null, color: "#6b7280",
        estado: "pendiente", notas: null, usuario, enviada_at: enviada, iniciada_at: null, terminada_at: null, entregada_at: null,
        items: delArea.map((l, j) => ({ id: j, nombre: l.producto.nombre, cantidad: l.cantidad, modificadores: [], notas: null, cancelado: false })),
    }));
};
