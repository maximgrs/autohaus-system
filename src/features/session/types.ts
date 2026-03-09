import type { User } from "@supabase/supabase-js";

export type AccountRole =
    | "admin"
    | "dealer"
    | "mechanic"
    | "detailer"
    | "listing"
    | string;

export type AccountType = "shared" | "individual" | string;

export type AccountRow = {
    user_id: string;
    role: AccountRole;
    account_type: AccountType;
    active: boolean;
};

export type SelectedEmployeeRow = {
    id: string;
    display_name: string | null;
    role: AccountRole;
    active: boolean;
};

export type EffectiveRole =
    | "admin"
    | "dealer"
    | "mechanic"
    | "detailer"
    | "listing";

export type SessionSnapshot = {
    user: User | null;
    account: AccountRow | null;
    selectedEmployee: SelectedEmployeeRow | null;
    selectedEmployeeId: string | null;
    effectiveRole: EffectiveRole | null;
    accountType: AccountType | null;
    loading: boolean;
};
