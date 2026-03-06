// src/services/realtime/tasksRealtime.ts
import { supabase } from "@/src/lib/supabase";

export type WatchedTable =
    | "tasks"
    | "vehicle_sales"
    | "vehicle_sale_prep"
    | "vehicle_handover_task"
    | "vehicles";

export type TasksRealtimeEvent =
    | { type: "connected" }
    | { type: "disconnected" }
    | { type: "error"; message: string }
    | {
        type: "change";
        table: WatchedTable;
        eventType: "INSERT" | "UPDATE" | "DELETE";
        record: any;
        old: any;
    };

type Listener = (evt: TasksRealtimeEvent) => void;

const TABLES_TO_WATCH: WatchedTable[] = [
    "tasks",
    "vehicle_sales",
    "vehicle_sale_prep",
    "vehicle_handover_task",
    "vehicles",
];

class TasksRealtime {
    private listeners = new Set<Listener>();
    private channel: any | null = null;
    private started = false;

    start() {
        if (this.started) return;
        this.started = true;

        const channel = supabase.channel("rt:app:global");

        for (const table of TABLES_TO_WATCH) {
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table },
                (payload: any) => {
                    const eventType = String(payload?.eventType ?? "UPDATE") as
                        | "INSERT"
                        | "UPDATE"
                        | "DELETE";

                    this.emit({
                        type: "change",
                        table,
                        eventType,
                        record: payload?.new ?? null,
                        old: payload?.old ?? null,
                    });
                },
            );
        }

        channel.subscribe((status: any) => {
            if (status === "SUBSCRIBED") this.emit({ type: "connected" });
            if (status === "CLOSED") this.emit({ type: "disconnected" });
            if (status === "CHANNEL_ERROR") {
                this.emit({ type: "error", message: "Realtime channel error" });
            }
        });

        this.channel = channel;
    }

    stop() {
        if (!this.started) return;
        this.started = false;

        if (this.channel) {
            try {
                supabase.removeChannel(this.channel);
            } catch {
                // ignore
            }
        }
        this.channel = null;
        this.emit({ type: "disconnected" });
    }

    on(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(evt: TasksRealtimeEvent) {
        for (const l of this.listeners) l(evt);
    }
}

export const tasksRealtime = new TasksRealtime();
