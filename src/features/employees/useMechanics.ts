import React from "react";
import { fetchMechanics, type MechanicEmployee } from "./mechanics.service";

export function useMechanics() {
    const [loading, setLoading] = React.useState(false);
    const [mechanics, setMechanics] = React.useState<MechanicEmployee[]>([]);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            setMechanics(await fetchMechanics());
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    return { loading, mechanics, reload: load };
}
