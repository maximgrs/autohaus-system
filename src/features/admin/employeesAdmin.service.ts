import { supabase } from "@/src/lib/supabase";
import { invokeAdmin } from "@/src/features/admin/adminInvoke";

type EmployeeRole =
    | "admin"
    | "dealer"
    | "mechanic"
    | "detailer"
    | "listing";

export type EmployeeRow = {
    id: string;
    account_user_id: string | null;
    display_name: string;
    role: EmployeeRole;
    active: boolean;
};

export async function adminCreateEmployee(params: {
    displayName: string;
    role: EmployeeRole;
}): Promise<EmployeeRow> {
    const { displayName, role } = params;

    const data = await invokeAdmin<{ employee: EmployeeRow }>(
        "admin-create-employee",
        {
            display_name: displayName,
            role,
        },
    );

    if (!data?.employee?.id) {
        throw new Error("Employee konnte nicht erstellt werden.");
    }
    return data.employee;
}

export async function adminSetEmployeeActive(params: {
    employeeId: string;
    active: boolean;
}): Promise<EmployeeRow> {
    const { employeeId, active } = params;

    const data = await invokeAdmin<{ employee: EmployeeRow }>(
        "admin-set-employee-active",
        {
            employee_id: employeeId,
            active,
        },
    );

    if (!data?.employee?.id) {
        throw new Error("Employee konnte nicht aktualisiert werden.");
    }
    return data.employee;
}

export async function fetchEmployees(): Promise<EmployeeRow[]> {
    const { data, error } = await supabase
        .from("employees")
        .select("id, account_user_id, display_name, role, active")
        .order("role", { ascending: true })
        .order("display_name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as EmployeeRow[];
}
