// src/services/supabase/errors.ts
export type AppErrorCode =
    | "SUPABASE_ERROR"
    | "NOT_FOUND"
    | "INVALID_ARGUMENT"
    | "UNKNOWN";

export type AppError = {
    code: AppErrorCode;
    message: string;
    cause?: unknown;
    meta?: Record<string, unknown>;
};

export function toAppError(
    err: unknown,
    fallbackMessage = "Unbekannter Fehler",
    meta?: Record<string, unknown>,
): AppError {
    if (isAppError(err)) return err;

    const message = typeof err === "object" && err && "message" in err
        ? String((err as any).message)
        : fallbackMessage;

    // Supabase errors typically have: message, code, details, hint
    const supabaseCode = typeof err === "object" && err && "code" in err
        ? String((err as any).code)
        : undefined;

    return {
        code: supabaseCode ? "SUPABASE_ERROR" : "UNKNOWN",
        message,
        cause: err,
        meta: { ...(meta ?? {}), supabaseCode },
    };
}

export function isAppError(err: unknown): err is AppError {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        "message" in err &&
        typeof (err as any).code === "string" &&
        typeof (err as any).message === "string"
    );
}
