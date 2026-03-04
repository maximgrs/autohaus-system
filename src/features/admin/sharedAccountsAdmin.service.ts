import { invokeAdmin } from "@/src/features/admin/adminInvoke";

export type EmployeeRole =
    | "admin"
    | "dealer"
    | "mechanic"
    | "detailer"
    | "listing";

export type SharedAccountRow = {
    user_id: string;
    email: string;
    role: EmployeeRole;
    active: boolean;
    created_at: string;
    employees: Array<
        {
            id: string;
            display_name: string;
            role: EmployeeRole;
            active: boolean;
        }
    >;
};

export async function adminCreateSharedAccount(params: {
    email: string;
    password: string;
    role: EmployeeRole;
    employeeIds?: string[];
}): Promise<void> {
    const { email, password, role, employeeIds } = params;

    await invokeAdmin("admin-create-shared-account", {
        email,
        password,
        role,
        employee_ids: employeeIds ?? [],
    });
}

export async function adminListSharedAccounts(): Promise<SharedAccountRow[]> {
    const data = await invokeAdmin<{ shared_accounts: SharedAccountRow[] }>(
        "admin-list-shared-accounts",
        {},
    );

    return (data?.shared_accounts ?? []) as SharedAccountRow[];
}
