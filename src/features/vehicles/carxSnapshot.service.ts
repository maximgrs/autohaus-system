import { supabase } from "@/src/lib/supabase";

type Obj = Record<string, unknown>;

export type CarxSnapshotSelected = {
    snapshot_version: 1;

    // Identity / core
    car_id: number | null;
    dyna_fin: string; // VIN/FIN (source of truth)
    angebots_nr: string | null;
    art: string | null;
    art_name: string | null;
    carx_last_chg: string | null;

    // Basics
    farbe: string | null;
    baujahr: number | null;
    erstzulassung: string | null;
    erstzulassung_sort: string | null;
    eingangsdatum: string | null;
    datum_hu: string | null;
    bauart_name: string | null;

    // Model headline
    brand_txt: string | null;
    brand_name: string | null;
    model_txt: string | null;
    model_name: string | null;
    typ_txt: string | null;
    full_text: string | null;

    // Powertrain
    ccm: number | null; // hubraum
    dyna_motor_nr: string | null; // motor number (CarX internal)
    kw_leistung: number | null;
    ps_leistung: number | null;
    kraftstoff_name: string | null;
    getriebe_name: string | null;
    anz_gaenge: number | null;

    // Dimensions / seats / owners
    anz_tueren: number | null;
    anz_sitzplaetze: number | null;
    anz_vorbesitzer: number | null;

    // Mileage
    km_laufleistung: number | null;

    // Prices (your list)
    dyna_ekx: number | null;
    vk_netto: number | null;
    vk_brutto: number | null;
    listenpreis_netto: number | null;
    vk_haendler_netto: number | null;
    vk_haendler_brutto: number | null;
};

function isObj(v: unknown): v is Obj {
    return typeof v === "object" && v !== null;
}

function asObj(v: unknown): Obj {
    return isObj(v) ? v : {};
}

function str(o: Obj, key: string): string | null {
    const v = o[key];
    if (typeof v === "string") {
        const s = v.trim();
        return s ? s : null;
    }
    return null;
}

function num(o: Obj, key: string): number | null {
    const v = o[key];

    if (typeof v === "number" && !Number.isNaN(v)) return v;

    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return null;

        // allow "28.08.2012" -> NaN => null
        const n = Number(s.replace(/\./g, "").replace(",", "."));
        return Number.isNaN(n) ? null : n;
    }

    return null;
}

function normalizeCarDetailPayload(payload: unknown): Obj {
    const p = asObj(payload);
    const car = p["car"];
    if (isObj(car)) return car;
    return p;
}

function requireDynaFin(detail: Obj): string {
    const fin = str(detail, "dyna_fin");
    if (!fin) throw new Error("CarX Snapshot: dyna_fin fehlt");
    return fin;
}

/**
 * Baut genau deinen gewünschten Snapshot (Whitelist).
 * Keine images, keine ausstattung/beschreibung, keine boolean-features.
 */
function buildSnapshotSelected(detail: Obj): CarxSnapshotSelected {
    const dyna_fin = requireDynaFin(detail);

    return {
        snapshot_version: 1,

        car_id: num(detail, "car_id"),
        dyna_fin,
        angebots_nr: str(detail, "angebots_nr"),
        art: str(detail, "art"),
        art_name: str(detail, "art_name"),
        carx_last_chg: str(detail, "last_chg"),

        farbe: str(detail, "farbe"),
        baujahr: num(detail, "baujahr"),
        erstzulassung: str(detail, "erstzulassung"),
        erstzulassung_sort: str(detail, "erstzulassung_sort"),
        eingangsdatum: str(detail, "eingangsdatum"),
        datum_hu: str(detail, "datum_hu"),
        bauart_name: str(detail, "bauart_name"),

        brand_txt: str(detail, "brand_txt"),
        brand_name: str(detail, "brand_name"),
        model_txt: str(detail, "model_txt"),
        model_name: str(detail, "model_name"),
        typ_txt: str(detail, "typ_txt"),
        full_text: str(detail, "full_text"),

        ccm: num(detail, "ccm"),
        dyna_motor_nr: str(detail, "dyna_motor_nr"),
        kw_leistung: num(detail, "kw_leistung"),
        ps_leistung: num(detail, "ps_leistung"),
        kraftstoff_name: str(detail, "kraftstoff_name"),
        getriebe_name: str(detail, "getriebe_name"),
        anz_gaenge: num(detail, "anz_gaenge"),

        anz_tueren: num(detail, "anz_tueren"),
        anz_sitzplaetze: num(detail, "anz_sitzplaetze"),
        anz_vorbesitzer: num(detail, "anz_vorbesitzer"),

        km_laufleistung: num(detail, "km_laufleistung"),

        dyna_ekx: num(detail, "dyna_ekx"),
        vk_netto: num(detail, "vk_netto"),
        vk_brutto: num(detail, "vk_brutto"),
        listenpreis_netto: num(detail, "listenpreis_netto"),
        vk_haendler_netto: num(detail, "vk_haendler_netto"),
        vk_haendler_brutto: num(detail, "vk_haendler_brutto"),
    };
}

/**
 * Holt CarX raw über Edge Function "carx" (q="car") – ohne Bild-Upgrade.
 */
async function fetchCarxCarRaw(carID: string | number): Promise<Obj> {
    const { data, error } = await supabase.functions.invoke("carx", {
        body: { q: "car", carID },
    });

    if (error) throw error;
    return normalizeCarDetailPayload(data as unknown);
}

/**
 * Sync:
 * - VIN/FIN wird ausschließlich aus dyna_fin genommen
 * - vehicles.vin = dyna_fin
 * - vehicles.carx_data = ausgewählter Snapshot
 * - vehicles.carx_synced_at = now
 * - vehicles.carx_vehicle_id setzen
 */
export async function syncVehicleCarxSnapshotSelected(args: {
    vehicleId: string;
    carxVehicleId: string | number;
}) {
    const carxVehicleId = String(args.carxVehicleId).trim();
    if (!carxVehicleId) throw new Error("Missing carxVehicleId");

    const raw = await fetchCarxCarRaw(carxVehicleId);
    const snapshot = buildSnapshotSelected(raw);

    const { error } = await supabase
        .from("vehicles")
        .update({
            carx_vehicle_id: carxVehicleId,
            vin: snapshot.dyna_fin, // ONLY dyna_fin
            carx_data: snapshot, // small snapshot
            carx_synced_at: new Date().toISOString(),
            status: "active",
        })
        .eq("id", args.vehicleId);

    if (error) throw error;

    return { vin: snapshot.dyna_fin, snapshot };
}
