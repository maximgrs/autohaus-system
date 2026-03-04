import type { CarxCarListCar } from "@/src/features/carx/carx.service";
import type { InventoryRow } from "./inventory.types";

export function formatEUR(value?: number | null) {
    if (value == null || Number.isNaN(value)) return undefined;
    try {
        return new Intl.NumberFormat("de-AT", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `${Math.round(value)} €`;
    }
}

export function toTitle(c: CarxCarListCar) {
    const brand = c.brand_txt?.trim();
    const model = c.model_txt?.trim();
    const typ = c.typ_txt?.trim();
    const variant = c.variant_txt?.trim();
    return [brand, model, typ, variant].filter(Boolean).join(" ");
}

export function mapCarToInventoryRow(c: CarxCarListCar): InventoryRow {
    const title = toTitle(c) || (c.vin ?? "Unbekanntes Fahrzeug");
    const price = c.vk_brutto ?? c.vk_netto ?? null;

    return {
        id: String(c.car_id),
        title,
        vin: c.vin,
        priceLabel: formatEUR(price),
        imageUrl: c.main_image?.url ?? null,
    };
}

export function mapCarsToRows(cars: CarxCarListCar[]): InventoryRow[] {
    return cars.map(mapCarToInventoryRow);
}

export function mergeUniqueById(prev: InventoryRow[], next: InventoryRow[]) {
    if (prev.length === 0) return next;

    const seen = new Set(prev.map((r) => r.id));
    const out = [...prev];

    for (const r of next) {
        if (!seen.has(r.id)) {
            seen.add(r.id);
            out.push(r);
        }
    }
    return out;
}

export function filterRows(rows: InventoryRow[], query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
        const t = r.title.toLowerCase();
        const v = (r.vin ?? "").toLowerCase();
        return t.includes(q) || v.includes(q);
    });
}
