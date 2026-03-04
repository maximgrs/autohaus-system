import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/src/features/session/authSession";
import { useDevEmployee } from "@/src/features/session/devSession";
import {
    type AppAccountRow,
    fetchMyAppAccount,
    fetchMyPublicAccount,
    type PublicAccountRow,
} from "@/src/features/session/accountBootstrap.service";

type Href = "/(auth)/login" | "/(auth)/select-employee" | "/(tabs)/home";

export function useAppEntryRoute(): {
    loading: boolean;
    href: Href | null;
    account: PublicAccountRow | null;
    appAccount: AppAccountRow | null;
} {
    const { loading: authLoading, user } = useAuthSession();
    const { loading: devLoading, employeeId, setEmployeeId } = useDevEmployee();

    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState<PublicAccountRow | null>(null);
    const [appAccount, setAppAccount] = useState<AppAccountRow | null>(null);

    const uid = user?.id ?? "";

    useEffect(() => {
        if (authLoading) return;

        (async () => {
            if (!uid) {
                setAccount(null);
                setAppAccount(null);
                return;
            }

            setLoading(true);
            try {
                const a = await fetchMyPublicAccount(uid);
                setAccount(a);

                const aa = await fetchMyAppAccount(uid);
                setAppAccount(aa);

                // If individual + default employee exists -> keep local active employee aligned
                if (a?.account_type === "individual") {
                    const def = aa?.default_employee_id ?? "";
                    if (def && employeeId !== def) {
                        await setEmployeeId(def);
                    }
                }
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, uid]);

    const href = useMemo<Href | null>(() => {
        if (authLoading) return null;
        if (!user) return "/(auth)/login";
        if (!account) return "/(auth)/login"; // missing public.accounts row is a configuration error

        if (!account.active) return "/(auth)/login";

        // ✅ shared: never go to select
        if (account.account_type === "shared") return "/(tabs)/home";

        // individual:
        if (appAccount?.default_employee_id) return "/(tabs)/home";
        return "/(auth)/select-employee"; // fallback only (should be rare)
    }, [account, appAccount?.default_employee_id, authLoading, user]);

    const isWaitingForLocalEmployee = account?.account_type === "individual" &&
        !!appAccount?.default_employee_id &&
        devLoading;

    const allLoading = authLoading || loading || isWaitingForLocalEmployee;

    return { loading: allLoading, href, account, appAccount };
}
