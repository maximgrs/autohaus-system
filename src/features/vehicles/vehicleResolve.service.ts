import { supabase } from "@/src/lib/supabase";

export type DbVehicleRef = {
    id: string;
    vin: string;
    carx_vehicle_id: string | null;
};

function normalizeCarxId(carxVehicleId: string | number) {
    return String(carxVehicleId).trim();
}

/**
 * 1) Primary match: vehicles.carx_vehicle_id = carxVehicleId
 * 2) Fallback: vehicles.vin = vin (falls carx id noch nicht gesetzt)
 */
export async function findInternalVehicleForCarx(args: {
    carxVehicleId: string | number;
    vin?: string | null;
}): Promise<DbVehicleRef | null> {
    const carxId = normalizeCarxId(args.carxVehicleId);

    // primary: match by carx id
    {
        const { data, error } = await supabase
            .from("vehicles")
            .select("id, vin, carx_vehicle_id")
            .eq("carx_vehicle_id", carxId)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (data?.id) return data as DbVehicleRef;
    }

    // fallback: match by vin (optional)
    const vin = args.vin?.trim();
    if (vin) {
        const { data, error } = await supabase
            .from("vehicles")
            .select("id, vin, carx_vehicle_id")
            .eq("vin", vin)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (data?.id) return data as DbVehicleRef;
    }

    return null;
}
