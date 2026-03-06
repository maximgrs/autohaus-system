// src/services/supabase/select.ts
import { toAppError } from "./errors";

export function requireData<T>(
    data: T | null | undefined,
    message = "Datensatz nicht gefunden",
): T {
    if (data === null || data === undefined) {
        throw toAppError(null, message, { kind: "requireData" });
    }
    return data;
}

export function requireArray<T>(
    data: T[] | null | undefined,
    message = "Keine Daten gefunden",
): T[] {
    if (!Array.isArray(data)) {
        throw toAppError(null, message, { kind: "requireArray" });
    }
    return data;
}
