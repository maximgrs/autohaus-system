import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_LAST_MODIFIED = "carx:last_modified_timestamp";
const LIST_PREFIX = "carx:car_list:first_page:";

export function makeCarListCacheKey(args: {
    status: number;
    pageSize: number;
    imageSize: string;
}) {
    return `${LIST_PREFIX}status=${args.status}&show=${args.pageSize}&img=${args.imageSize}`;
}

export async function getCachedLastModified(): Promise<string | null> {
    return AsyncStorage.getItem(KEY_LAST_MODIFIED);
}

export async function setCachedLastModified(ts: string): Promise<void> {
    await AsyncStorage.setItem(KEY_LAST_MODIFIED, ts);
}

export async function getCachedCarListFirstPage<T>(cacheKey: string) {
    const raw = await AsyncStorage.getItem(cacheKey);
    return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCachedCarListFirstPage<T>(
    cacheKey: string,
    payload: T,
) {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
}
