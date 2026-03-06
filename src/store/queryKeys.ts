export const qk = {
    auth: {
        session: () => ["auth", "session"] as const,
        user: () => ["auth", "user"] as const,
    },

    dealers: {
        list: () => ["dealers", "list"] as const,
    },

    tasks: {
        // Base keys for broad invalidation (invalidate all variants regardless of params)
        detailerQueueBase: () => ["tasks", "detailerQueue"] as const,
        mechanicQueueBase: () => ["tasks", "mechanicQueue"] as const,

        // Dedicated keys per list type
        detailerQueue: (args: { types?: string[] | null } = {}) =>
            ["tasks", "detailerQueue", { types: args.types ?? null }] as const,

        mechanicQueue: (args: { filter?: string | null } = {}) =>
            ["tasks", "mechanicQueue", {
                filter: args.filter ?? null,
            }] as const,

        list: (
            args: { dealerId?: string | null; employeeId?: string | null } = {},
        ) => ["tasks", "list", {
            dealerId: args.dealerId ?? null,
            employeeId: args.employeeId ?? null,
        }] as const,

        byId: (taskId: string) => ["tasks", "byId", taskId] as const,
    },

    vehicles: {
        list: (args: { dealerId?: string | null } = {}) =>
            ["vehicles", "list", { dealerId: args.dealerId ?? null }] as const,
        byId: (vehicleId: string) => ["vehicles", "byId", vehicleId] as const,
    },
} as const;
