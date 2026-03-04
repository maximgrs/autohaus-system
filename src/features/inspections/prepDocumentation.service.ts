import { supabase } from "@/src/lib/supabase";
import {
    type DbVehicleRef,
    findInternalVehicleForCarx,
} from "@/src/features/vehicles/vehicleResolve.service";

export type DbInspection = {
    id: string;
    vehicle_id: string;
    type: "intake" | "final";
    notes: string | null;
    actor_employee_id: string | null;
    created_at: string;
    updated_at: string;
};

export type DbInspectionItem = {
    id: string;
    inspection_id: string;
    category: string;
    severity: string;
    position: any;
    comment: string | null;
    photo_urls: string[] | null;
    created_at: string;
};

/**
 * Latest inspection of a given type + its items
 */
export async function fetchLatestInspectionWithItems(
    vehicleId: string,
    type: "intake" | "final",
): Promise<{ inspection: DbInspection | null; items: DbInspectionItem[] }> {
    const { data: ins, error: insErr } = await supabase
        .from("inspections")
        .select(
            "id, vehicle_id, type, notes, actor_employee_id, created_at, updated_at",
        )
        .eq("vehicle_id", vehicleId)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (insErr) throw insErr;
    if (!ins?.id) return { inspection: null, items: [] };

    const { data: items, error: itErr } = await supabase
        .from("inspection_items")
        .select(
            "id, inspection_id, category, severity, position, comment, photo_urls, created_at",
        )
        .eq("inspection_id", ins.id)
        .order("created_at", { ascending: false });

    if (itErr) throw itErr;

    return {
        inspection: ins as DbInspection,
        items: (items ?? []) as DbInspectionItem[],
    };
}

/**
 * Direct load by internal vehicle id (no matching needed)
 */
export async function fetchPrepDocumentationForVehicle(args: {
    vehicleId: string;
    includeFinal?: boolean;
}) {
    const vehicle: DbVehicleRef = {
        id: args.vehicleId,
        vin: "",
        carx_vehicle_id: null,
    };

    const intake = await fetchLatestInspectionWithItems(
        args.vehicleId,
        "intake",
    );
    const final = args.includeFinal
        ? await fetchLatestInspectionWithItems(args.vehicleId, "final")
        : { inspection: null, items: [] as DbInspectionItem[] };

    return { vehicle, intake, final };
}

/**
 * Resolve internal vehicle via carx id/vin, then load docs
 */
export async function fetchPrepDocumentationForCarx(args: {
    carxVehicleId: string | number;
    vin?: string | null;
    includeFinal?: boolean;
}) {
    const vehicle = await findInternalVehicleForCarx({
        carxVehicleId: args.carxVehicleId,
        vin: args.vin ?? null,
    });

    if (!vehicle) {
        return {
            vehicle: null as DbVehicleRef | null,
            intake: {
                inspection: null as DbInspection | null,
                items: [] as DbInspectionItem[],
            },
            final: {
                inspection: null as DbInspection | null,
                items: [] as DbInspectionItem[],
            },
        };
    }

    const intake = await fetchLatestInspectionWithItems(vehicle.id, "intake");
    const final = args.includeFinal
        ? await fetchLatestInspectionWithItems(vehicle.id, "final")
        : { inspection: null, items: [] as DbInspectionItem[] };

    return { vehicle, intake, final };
}

// import { supabase } from "@/src/lib/supabase";

// export type DbVehicleRef = {
//     id: string;
//     vin: string;
//     carx_vehicle_id: string | null;
// };

// export type DbInspection = {
//     id: string;
//     vehicle_id: string;
//     type: "intake" | "final";
//     notes: string | null;
//     actor_employee_id: string | null;
//     created_at: string;
//     updated_at: string;
// };

// export type DbInspectionItem = {
//     id: string;
//     inspection_id: string;
//     category: string;
//     severity: string;
//     position: any;
//     comment: string | null;
//     photo_urls: string[] | null;
//     created_at: string;
// };

// function normalizeCarxId(carxVehicleId: string | number) {
//     return String(carxVehicleId).trim();
// }

// /**
//  * 1) Primary match: vehicles.carx_vehicle_id = carxVehicleId
//  * 2) Fallback: vehicles.vin = vin (falls carx id noch nicht gesetzt)
//  */
// export async function findInternalVehicleForCarx(args: {
//     carxVehicleId: string | number;
//     vin?: string | null;
// }): Promise<DbVehicleRef | null> {
//     const carxId = normalizeCarxId(args.carxVehicleId);

//     // primary: match by carx id
//     {
//         const { data, error } = await supabase
//             .from("vehicles")
//             .select("id, vin, carx_vehicle_id")
//             .eq("carx_vehicle_id", carxId)
//             .limit(1)
//             .maybeSingle();

//         if (error) throw error;
//         if (data?.id) return data as DbVehicleRef;
//     }

//     // fallback: match by vin (optional)
//     const vin = args.vin?.trim();
//     if (vin) {
//         const { data, error } = await supabase
//             .from("vehicles")
//             .select("id, vin, carx_vehicle_id")
//             .eq("vin", vin)
//             .order("created_at", { ascending: false })
//             .limit(1)
//             .maybeSingle();

//         if (error) throw error;
//         if (data?.id) return data as DbVehicleRef;
//     }

//     return null;
// }

// /**
//  * Latest inspection of a given type + its items
//  */
// export async function fetchLatestInspectionWithItems(
//     vehicleId: string,
//     type: "intake" | "final",
// ): Promise<{ inspection: DbInspection | null; items: DbInspectionItem[] }> {
//     // 1) latest inspection header
//     const { data: ins, error: insErr } = await supabase
//         .from("inspections")
//         .select(
//             "id, vehicle_id, type, notes, actor_employee_id, created_at, updated_at",
//         )
//         .eq("vehicle_id", vehicleId)
//         .eq("type", type)
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .maybeSingle();

//     if (insErr) throw insErr;
//     if (!ins?.id) return { inspection: null, items: [] };

//     // 2) items for that inspection
//     const { data: items, error: itErr } = await supabase
//         .from("inspection_items")
//         .select(
//             "id, inspection_id, category, severity, position, comment, photo_urls, created_at",
//         )
//         .eq("inspection_id", ins.id)
//         .order("created_at", { ascending: false });

//     if (itErr) throw itErr;

//     return {
//         inspection: ins as DbInspection,
//         items: (items ?? []) as DbInspectionItem[],
//     };
// }

// /**
//  * Main helper for the accordion:
//  * - resolve internal vehicle
//  * - load intake (and optional final)
//  */
// export async function fetchPrepDocumentationForCarx(args: {
//     carxVehicleId: string | number;
//     vin?: string | null;
//     includeFinal?: boolean;
// }) {
//     const vehicle = await findInternalVehicleForCarx({
//         carxVehicleId: args.carxVehicleId,
//         vin: args.vin ?? null,
//     });

//     if (!vehicle) {
//         return {
//             vehicle: null as DbVehicleRef | null,
//             intake: {
//                 inspection: null as DbInspection | null,
//                 items: [] as DbInspectionItem[],
//             },
//             final: {
//                 inspection: null as DbInspection | null,
//                 items: [] as DbInspectionItem[],
//             },
//         };
//     }

//     const intake = await fetchLatestInspectionWithItems(vehicle.id, "intake");
//     const final = args.includeFinal
//         ? await fetchLatestInspectionWithItems(vehicle.id, "final")
//         : { inspection: null, items: [] as DbInspectionItem[] };

//     return { vehicle, intake, final };
// }
