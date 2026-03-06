import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

export function useOnFocus(
    effect: () => void | (() => void),
    deps: any[] = [],
) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect(useCallback(effect, deps));
}
