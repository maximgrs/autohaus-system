import { invokeAdmin } from "@/src/features/admin/adminInvoke";

export type CreatedInvite = {
    code: string;
    employee_id: string;
    expires_at: string | null;
};

export async function adminCreateEmployeeInvite(params: {
    employeeId: string;
    expiresDays?: number;
}): Promise<CreatedInvite> {
    const { employeeId, expiresDays } = params;

    const data = await invokeAdmin<{ invite: CreatedInvite }>(
        "admin-create-employee-invite",
        {
            employee_id: employeeId,
            expires_days: expiresDays ?? 30,
        },
    );

    if (!data?.invite?.code) {
        throw new Error("Invite konnte nicht erstellt werden.");
    }
    return data.invite;
}
