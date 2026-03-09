import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { useDevEmployee } from "@/src/features/session/devSession";
import { resolveEffectiveRole } from "@/src/features/session/lib/resolveEffectiveRole";
import type {
    AccountRow,
    SelectedEmployeeRow,
    SessionSnapshot,
} from "@/src/features/session/types";

type AppAccountRow = {
    user_id: string;
    default_employee_id: string | null;
};

async function loadAccount(userId: string): Promise<AccountRow | null> {
    const { data, error } = await supabase
        .from("accounts")
        .select("user_id, role, account_type, active")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return (data ?? null) as AccountRow | null;
}

async function loadAppAccount(userId: string): Promise<AppAccountRow | null> {
    const { data, error } = await supabase
        .from("app_accounts")
        .select("user_id, default_employee_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return (data ?? null) as AppAccountRow | null;
}

export function useSessionSnapshot(): SessionSnapshot {
    const {
        employee,
        employeeId,
        loading: employeeLoading,
        setEmployeeId,
        clear,
    } = useDevEmployee();

    const [userLoading, setUserLoading] = useState(true);
    const [account, setAccount] = useState<AccountRow | null>(null);
    const [userObject, setUserObject] = useState<any | null>(null);

    const hydratedUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        let alive = true;

        async function hydrateForUser(userId: string | null) {
            if (!userId) {
                setAccount(null);
                hydratedUserIdRef.current = null;
                await clear();
                return;
            }

            const nextAccount = await loadAccount(userId);

            if (!alive) return;

            setAccount(nextAccount);
            hydratedUserIdRef.current = userId;

            if (!nextAccount || nextAccount.active === false) {
                await clear();
                return;
            }

            if (nextAccount.account_type === "shared") {
                if (employeeId) {
                    await clear();
                }
                return;
            }

            const appAccount = await loadAppAccount(userId);

            if (!alive) return;

            const defaultEmployeeId = appAccount?.default_employee_id ?? null;

            if (!defaultEmployeeId) {
                if (employeeId) {
                    await clear();
                }
                return;
            }

            if (employeeId !== defaultEmployeeId) {
                await setEmployeeId(defaultEmployeeId);
            }
        }

        async function load() {
            setUserLoading(true);

            try {
                const { data: authData, error: authError } = await supabase.auth
                    .getUser();
                if (authError) throw authError;

                const user = authData.user ?? null;

                if (!alive) return;

                setUserObject(user);
                await hydrateForUser(user?.id ?? null);
            } catch {
                if (!alive) return;
                setUserObject(null);
                setAccount(null);
                hydratedUserIdRef.current = null;
                await clear();
            } finally {
                if (alive) {
                    setUserLoading(false);
                }
            }
        }

        void load();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user ?? null;
            const userId = user?.id ?? null;

            setUserObject(user);

            void (async () => {
                if (hydratedUserIdRef.current !== userId) {
                    await hydrateForUser(userId);
                    return;
                }

                if (!userId) {
                    await hydrateForUser(null);
                    return;
                }

                const nextAccount = await loadAccount(userId);
                setAccount(nextAccount);

                if (!nextAccount || nextAccount.active === false) {
                    await clear();
                    return;
                }

                if (nextAccount.account_type === "shared") {
                    if (employeeId) {
                        await clear();
                    }
                    return;
                }

                const appAccount = await loadAppAccount(userId);
                const defaultEmployeeId = appAccount?.default_employee_id ??
                    null;

                if (!defaultEmployeeId) {
                    if (employeeId) {
                        await clear();
                    }
                    return;
                }

                if (employeeId !== defaultEmployeeId) {
                    await setEmployeeId(defaultEmployeeId);
                }
            })();
        });

        return () => {
            alive = false;
            subscription.unsubscribe();
        };
    }, [clear, employeeId, setEmployeeId]);

    const selectedEmployee = useMemo<SelectedEmployeeRow | null>(() => {
        if (!employee) return null;

        return {
            id: employee.id,
            display_name: employee.display_name ?? null,
            role: employee.role,
            active: Boolean(employee.active ?? true),
        };
    }, [employee]);

    const effectiveRole = useMemo(() => {
        return resolveEffectiveRole({
            accountRole: account?.role ?? null,
            selectedEmployee,
        });
    }, [account?.role, selectedEmployee]);

    return {
        user: userObject,
        account,
        selectedEmployee,
        selectedEmployeeId: selectedEmployee?.id ?? employeeId ?? null,
        effectiveRole,
        accountType: account?.account_type ?? null,
        loading: userLoading || employeeLoading,
    };
}
