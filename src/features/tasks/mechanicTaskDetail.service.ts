import { supabase } from "@/src/lib/supabase";

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue"
    | string;

export type MechanicTask = {
    id: string;
    vehicle_id: string;
    type: string;
    status: TaskStatus;
    title: string | null;
    assigned_employee_id: string | null;
    actor_employee_id: string | null;
    payload: any;
    done_at: string | null;
    created_at: string;
    updated_at: string;
};

export type VehicleRef = {
    id: string;
    vin: string | null;
    status: string;
    internal_image_urls: string[] | null;
    draft_model: string | null;
    carx_data: any;
};

export type PrepRow = {
    id: string;
    vehicle_id: string;
    dealer_employee_id: string | null;
    top_seller_payload: any;
    attachment_urls: string[] | null; // NOTE: in DB sind das STORAGE-PFADE
    created_at: string;
    updated_at: string;
};

export type WorkcardRow = {
    id: string;
    vehicle_id: string;
    notes: string | null;
    photo_urls: string[] | null;
    actor_employee_id: string | null;
    created_at: string;
};

export type EmployeeMini = {
    id: string;
    display_name: string;
    role: string;
};

export type MechanicTaskDetail = {
    task: MechanicTask;
    vehicle: VehicleRef;
    assignedEmployee: EmployeeMini | null;
    prep: PrepRow | null; // NOTE: hier liefern wir attachment_urls als SIGNED URLS fürs UI
    workcard: WorkcardRow | null;
};

function mergePayload(oldPayload: any, patch: Record<string, unknown>) {
    const base = oldPayload && typeof oldPayload === "object" ? oldPayload : {};
    return { ...base, ...patch };
}

async function signPrepAttachments(
    prep: PrepRow | null,
): Promise<PrepRow | null> {
    if (!prep?.attachment_urls?.length) return prep;

    // DB enthält paths -> UI braucht http(s) urls
    const { data, error } = await supabase.storage
        .from("sale_prep_photos")
        .createSignedUrls(prep.attachment_urls, 60 * 60);

    if (error) throw error;

    const signedUrls = (data ?? [])
        .map((x) => x?.signedUrl)
        .filter(Boolean) as string[];

    return {
        ...prep,
        attachment_urls: signedUrls,
    };
}

export async function fetchMechanicTaskDetail(
    taskId: string,
): Promise<MechanicTaskDetail> {
    const { data: task, error: tErr } = await supabase
        .from("tasks")
        .select(
            "id, vehicle_id, type, status, title, assigned_employee_id, actor_employee_id, payload, done_at, created_at, updated_at",
        )
        .eq("id", taskId)
        .single();
    if (tErr) throw tErr;

    const { data: vehicle, error: vErr } = await supabase
        .from("vehicles")
        .select("id, vin, status, internal_image_urls, draft_model, carx_data")
        .eq("id", task.vehicle_id)
        .single();
    if (vErr) throw vErr;

    const assignedId = task.assigned_employee_id as string | null;
    let assignedEmployee: EmployeeMini | null = null;

    if (assignedId) {
        const { data: emp, error: eErr } = await supabase
            .from("employees")
            .select("id, display_name, role")
            .eq("id", assignedId)
            .maybeSingle();
        if (eErr) throw eErr;
        assignedEmployee = (emp as EmployeeMini) ?? null;
    }

    // ✅ CHANGE: sort by updated_at (nicht created_at), damit du das zuletzt bearbeitete Prep holst
    const { data: prep, error: pErr } = await supabase
        .from("vehicle_sale_prep")
        .select(
            "id, vehicle_id, dealer_employee_id, top_seller_payload, attachment_urls, created_at, updated_at",
        )
        .eq("vehicle_id", task.vehicle_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (pErr) throw pErr;

    // ✅ CHANGE: storage paths -> signed urls fürs UI
    const prepSigned = await signPrepAttachments((prep as PrepRow) ?? null);

    const { data: wc, error: wErr } = await supabase
        .from("workcards")
        .select(
            "id, vehicle_id, notes, photo_urls, actor_employee_id, created_at",
        )
        .eq("vehicle_id", task.vehicle_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (wErr) throw wErr;

    return {
        task: task as MechanicTask,
        vehicle: vehicle as VehicleRef,
        assignedEmployee,
        prep: prepSigned,
        workcard: (wc as WorkcardRow) ?? null,
    };
}

export async function takeMechanicTask(args: {
    taskId: string;
    mechanicEmployeeId: string;
    actorEmployeeId: string | null;
}) {
    const { data: curr, error: cErr } = await supabase
        .from("tasks")
        .select("payload, status, assigned_employee_id")
        .eq("id", args.taskId)
        .single();
    if (cErr) throw cErr;

    // already taken
    if (curr.assigned_employee_id) return;

    const nextPayload = mergePayload(curr.payload, {
        taken_at: new Date().toISOString(),
        taken_employee_id: args.mechanicEmployeeId,
    });

    const { error } = await supabase
        .from("tasks")
        .update({
            assigned_employee_id: args.mechanicEmployeeId,
            status: "in_progress",
            actor_employee_id: args.actorEmployeeId,
            payload: nextPayload,
            updated_at: new Date().toISOString(),
        })
        .eq("id", args.taskId);

    if (error) throw error;
}

export async function completeMechanicTask(args: {
    taskId: string;
    actorEmployeeId: string | null;
}) {
    const { error } = await supabase
        .from("tasks")
        .update({
            status: "done",
            done_at: new Date().toISOString(),
            actor_employee_id: args.actorEmployeeId,
            updated_at: new Date().toISOString(),
        })
        .eq("id", args.taskId);

    if (error) throw error;
}

export async function upsertWorkcard(args: {
    vehicleId: string;
    actorEmployeeId: string | null;
    notes: string | null;
    photoUrls: string[];
}): Promise<WorkcardRow> {
    // update latest workcard for this vehicle (simple) else insert
    const { data: existing, error: exErr } = await supabase
        .from("workcards")
        .select("id")
        .eq("vehicle_id", args.vehicleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (exErr) throw exErr;

    if (existing?.id) {
        const { data, error } = await supabase
            .from("workcards")
            .update({
                notes: args.notes,
                photo_urls: args.photoUrls,
                actor_employee_id: args.actorEmployeeId,
            })
            .eq("id", existing.id)
            .select(
                "id, vehicle_id, notes, photo_urls, actor_employee_id, created_at",
            )
            .single();

        if (error) throw error;
        return data as WorkcardRow;
    }

    const { data, error } = await supabase
        .from("workcards")
        .insert({
            vehicle_id: args.vehicleId,
            notes: args.notes,
            photo_urls: args.photoUrls,
            actor_employee_id: args.actorEmployeeId,
        })
        .select(
            "id, vehicle_id, notes, photo_urls, actor_employee_id, created_at",
        )
        .single();

    if (error) throw error;
    return data as WorkcardRow;
}
