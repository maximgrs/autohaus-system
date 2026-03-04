import { supabase } from "@/src/lib/supabase";

type Direction = "up" | "down";

export type CarxCarListCar = {
    car_id: number;
    vin: string | null;

    brand_txt?: string | null;
    model_txt?: string | null;
    typ_txt?: string | null;
    variant_txt?: string | null;

    vk_brutto?: number | null;
    vk_netto?: number | null;

    main_image?: { url?: string | null } | null;

    erstzulassung?: string | null;
    km_laufleistung?: number | null;
    kraftstoff_name?: string | null;
    getriebe_name?: string | null;

    // bei dir vorhanden:
    eingangsdatum?: string | null;
    farbe?: string | null;
    ps_leistung?: number | null;
    kw_leistung?: number | null;
};

export type CarxCarListResponse = {
    hits: number;
    cars: CarxCarListCar[];
};

export type CarxImageSize =
    | "mini"
    | "small"
    | "mida"
    | "midb"
    | "midc"
    | "midd"
    | "midi"
    | "xl"
    | "xxl"
    | "xxxl"
    | "xxxxl";

const DEFAULT_IMAGE_SIZE: CarxImageSize = "xxxxl"; // 1600px (mit Wasserzeichen)

type CarxInvokeBody = {
    q:
        | "last_modified"
        | "car_list"
        | "car"
        | "car_navi"
        | "fld_list"
        | "fld_detail";
    r?: Record<string, string | number | boolean>;
    carID?: string | number;
    tab?: string;
    fld_name?: string;
    pos?: number;
    show?: number;
    sort?: string[];
    direction?: Direction;
};

export type CarxLastModified = {
    last_modified_timestamp: string;
    last_modified_datetime: string;
};

export async function carxLastModified(): Promise<CarxLastModified> {
    return carxInvoke<CarxLastModified>({ q: "last_modified" });
}

async function carxInvoke<T>(body: CarxInvokeBody): Promise<T> {
    const { data, error } = await supabase.functions.invoke("carx", { body });
    if (error) throw error;
    return data as T;
}

function withCarxImageSize(
    url?: string | null,
    size: CarxImageSize = DEFAULT_IMAGE_SIZE,
): string | null {
    if (!url) return null;

    try {
        const u = new URL(url);
        u.searchParams.set("f", size);
        return u.toString();
    } catch {
        if (url.includes("?")) return `${url}&f=${encodeURIComponent(size)}`;
        return `${url}?f=${encodeURIComponent(size)}`;
    }
}

export async function carxCarList(params?: {
    status?: number;
    pos?: number;
    show?: number;
    sort?: string[];
    direction?: Direction;
    imageSize?: CarxImageSize;
}): Promise<CarxCarListResponse> {
    const res = await carxInvoke<CarxCarListResponse>({
        q: "car_list",
        r: params?.status != null ? { status: params.status } : undefined,
        pos: params?.pos ?? 0,
        show: params?.show ?? 250,
        sort: params?.sort,
        direction: params?.direction,
    });

    const size = params?.imageSize ?? DEFAULT_IMAGE_SIZE;

    const cars = res.cars.map((c) => {
        const img = c.main_image;
        if (!img?.url) return c;

        return {
            ...c,
            main_image: {
                ...img,
                url: withCarxImageSize(img.url, size) ?? img.url,
            },
        };
    });

    return { hits: res.hits, cars };
}

// -------------------------
// DETAIL (q="car")
// Dein Output: { car: {..., images: { image_0: {url}, ... } } }
// -------------------------

export type CarxCarDetail =
    & CarxCarListCar
    & Record<string, any>
    & {
        images?: Record<string, { url?: string | null }>;
    };

type CarxCarDetailResponse = {
    car: CarxCarDetail;
};

function normalizeCarDetailPayload(payload: any): CarxCarDetail {
    // bei dir ist es { car: {...} }
    if (
        payload && typeof payload === "object" && payload.car &&
        typeof payload.car === "object"
    ) {
        return payload.car as CarxCarDetail;
    }
    // fallback falls CarX mal direkt liefert
    return payload as CarxCarDetail;
}

function extractImageUrlsFromDetail(detail: any): string[] {
    if (!detail || typeof detail !== "object") return [];

    const urls: string[] = [];
    const push = (u: any) => {
        if (typeof u === "string" && u.trim()) urls.push(u.trim());
    };

    // optional main_image
    push(detail?.main_image?.url);

    // bei dir: images: { image_0: {url}, image_1: {url} ... }
    const imagesObj = detail?.images;
    if (imagesObj && typeof imagesObj === "object") {
        const keys = Object.keys(imagesObj).sort((a, b) => {
            const ai = Number(String(a).split("_").pop() ?? 0);
            const bi = Number(String(b).split("_").pop() ?? 0);
            return ai - bi;
        });

        for (const k of keys) {
            const v = imagesObj[k];
            push(v?.url);
        }
    }

    // dedupe (order bleibt)
    return Array.from(new Set(urls));
}

export async function carxCarDetail(params: {
    carID: number | string;
    imageSize?: CarxImageSize;
}): Promise<{ detail: CarxCarDetail; imageUrls: string[] }> {
    const size = params.imageSize ?? DEFAULT_IMAGE_SIZE;

    const raw = await carxInvoke<CarxCarDetailResponse | any>({
        q: "car",
        carID: params.carID,
    });

    const detail = normalizeCarDetailPayload(raw);

    // upgrade main_image wenn vorhanden
    if (detail?.main_image?.url) {
        detail.main_image.url =
            withCarxImageSize(detail.main_image.url, size) ??
                detail.main_image.url;
    }

    // upgrade images urls
    if (detail?.images && typeof detail.images === "object") {
        for (const key of Object.keys(detail.images)) {
            const u = detail.images[key]?.url ?? null;
            if (!u) continue;
            detail.images[key].url = withCarxImageSize(u, size) ?? u;
        }
    }

    const rawUrls = extractImageUrlsFromDetail(detail);
    const imageUrls = rawUrls
        .map((u) => withCarxImageSize(u, size) ?? u)
        .filter(Boolean) as string[];

    return { detail, imageUrls };
}
