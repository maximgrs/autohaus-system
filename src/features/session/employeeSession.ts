import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
    type EmployeeRow,
    fetchEmployeeById,
} from "@/src/features/employees/employees.service";

const KEY = "ACTIVE_EMPLOYEE_ID";

export async function getActiveEmployeeId(): Promise<string | null> {
    const v = await AsyncStorage.getItem(KEY);
    const s = (v ?? "").trim();
    return s ? s : null;
}

export async function setActiveEmployeeId(next: string | null): Promise<void> {
    const s = String(next ?? "").trim();
    if (!s) {
        await AsyncStorage.removeItem(KEY);
        return;
    }
    await AsyncStorage.setItem(KEY, s);
}

export function useEmployeeSession() {
    const [loading, setLoading] = useState(true);
    const [employeeId, setEmployeeIdState] = useState<string | null>(null);
    const [employee, setEmployee] = useState<EmployeeRow | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const id = await getActiveEmployeeId();
            setEmployeeIdState(id);
            if (!id) {
                setEmployee(null);
                return;
            }
            const row = await fetchEmployeeById(id);
            setEmployee(row?.active ? row : null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const setEmployeeId = useCallback(
        async (id: string | null) => {
            await setActiveEmployeeId(id);
            await reload();
        },
        [reload],
    );

    const clear = useCallback(async () => {
        await setActiveEmployeeId(null);
        await reload();
    }, [reload]);

    return { loading, employeeId, employee, reload, setEmployeeId, clear };
}
