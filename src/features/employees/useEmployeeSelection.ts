import { useEmployeeSession } from "@/src/features/session/employeeSession";

/**
 * Compat wrapper:
 * Some refactor steps import this from `features/employees/*`,
 * while the real implementation lives in `features/session/*`.
 */
export function useEmployeeSelection() {
    return useEmployeeSession();
}

export default useEmployeeSelection;
