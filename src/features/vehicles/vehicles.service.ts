import { supabase } from "@/src/lib/supabase";

export type VehicleQueueItem = {
  id: string;
  vin: string;
  draft_model: string | null;
  created_at: string;
  carx_vehicle_id: string | null;
};

export async function fetchVehicleQueue() {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, vin, draft_model, created_at, carx_vehicle_id")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as VehicleQueueItem[];
}
