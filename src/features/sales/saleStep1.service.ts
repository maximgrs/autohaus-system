import { supabase } from "@/src/lib/supabase";

export type SaleRow = {
    id: string;
    vehicle_id: string;
    buyer_id: string | null;
    dealer_employee_id: string | null;
    status: string;
    created_at: string;
};

export type VehicleRow = {
    id: string;
    vin: string | null;
    internal_image_urls: string[] | null;
    carx_data: any | null;
};

export type SaleWithVehicle = {
    sale: SaleRow;
    vehicle: VehicleRow;
};

export async function fetchSaleWithVehicle(
    saleId: string,
): Promise<SaleWithVehicle> {
    const { data, error } = await supabase
        .from("sales")
        .select(
            `
      id, vehicle_id, buyer_id, dealer_employee_id, status, created_at,
      vehicle:vehicles ( id, vin, internal_image_urls, carx_data )
    `,
        )
        .eq("id", saleId)
        .single();

    if (error) throw error;

    return {
        sale: {
            id: data.id,
            vehicle_id: data.vehicle_id,
            buyer_id: data.buyer_id ?? null,
            dealer_employee_id: data.dealer_employee_id ?? null,
            status: data.status,
            created_at: data.created_at,
        },
        vehicle: (data as any).vehicle as VehicleRow,
    };
}

export async function linkBuyerAndDealerToSale(args: {
    saleId: string;
    buyerId: string;
    dealerEmployeeId: string;
}) {
    const { error } = await supabase
        .from("sales")
        .update({
            buyer_id: args.buyerId,
            dealer_employee_id: args.dealerEmployeeId,
        })
        .eq("id", args.saleId);

    if (error) throw error;
}
