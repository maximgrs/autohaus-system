import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

type Direction = "up" | "down";

type CarxRequest = {
  q:
    | "car_list"
    | "car"
    | "car_navi"
    | "fld_list"
    | "fld_detail"
    | "last_modified";
  r?: Record<string, string | number | boolean>;
  carID?: string | number;

  tab?: string; // fld_list
  fld_name?: string; // fld_detail

  pos?: number;
  show?: number;
  sort?: string[];
  direction?: Direction;

  d?: 1 | 0;
};

function mustEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env secret: ${name}`);
  return v;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeCarList(payload: any) {
  // Falls CarX irgendwann mal schon ein Array liefern würde:
  if (Array.isArray(payload)) {
    return { hits: payload.length, cars: payload };
  }

  // Falls du später serverseitig schon {cars:[]} zurückgeben würdest:
  if (payload && typeof payload === "object" && Array.isArray(payload.cars)) {
    return { hits: payload.hits ?? payload.cars.length, cars: payload.cars };
  }

  const obj = payload && typeof payload === "object" ? payload : {};
  const cars = Object.keys(obj)
    .filter((k) => k.startsWith("car_"))
    .sort((a, b) => {
      const ai = Number(a.replace("car_", ""));
      const bi = Number(b.replace("car_", ""));
      return ai - bi;
    })
    .map((k) => obj[k]);

  return {
    hits: obj.hits ?? cars.length,
    cars,
  };
}

function buildUrl(body: CarxRequest) {
  const base = mustEnv("CARX_BASE_URL"); // z.B. https://cxo.systems/api.php
  const m = mustEnv("CARX_M");
  const t = mustEnv("CARX_TOKEN");

  const url = new URL(base);
  url.searchParams.set("utf8", "1");
  url.searchParams.set("m", m);
  url.searchParams.set("t", t);
  url.searchParams.set("q", body.q);

  if (body.carID != null) url.searchParams.set("carID", String(body.carID));
  if (body.tab) url.searchParams.set("tab", body.tab);
  if (body.fld_name) url.searchParams.set("fld_name", body.fld_name);

  if (body.pos != null) url.searchParams.set("pos", String(body.pos));
  if (body.show != null) url.searchParams.set("show", String(body.show));
  if (body.direction) url.searchParams.set("direction", body.direction);

  if (body.sort?.length) {
    body.sort.forEach((s, i) => url.searchParams.set(`sort[${i}]`, s));
  }

  if (body.r) {
    for (const [k, v] of Object.entries(body.r)) {
      url.searchParams.set(`r[${k}]`, String(v));
    }
  }

  if (body.d) url.searchParams.set("d", String(body.d));

  return url.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  try {
    const body = (await req.json()) as CarxRequest;

    if (!body?.q) return jsonResponse({ error: "Missing q" }, 400);

    const allowed = new Set<CarxRequest["q"]>([
      "car_list",
      "car",
      "car_navi",
      "fld_list",
      "fld_detail",
      "last_modified",
    ]);
    if (!allowed.has(body.q)) {
      return jsonResponse({ error: "Unsupported q" }, 400);
    }

    const url = buildUrl(body);

    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    const text = await res.text();

    if (!res.ok) {
      return jsonResponse(
        {
          error: "CarX request failed",
          status: res.status,
          body: text.slice(0, 2000),
        },
        502,
      );
    }

    const payload = safeJsonParse(text);

    // Normalisierung nur für car_list
    if (body.q === "car_list") {
      const normalized = normalizeCarList(payload);
      return jsonResponse(normalized, 200);
    }

    // Sonst 1:1 weiterreichen
    return jsonResponse(payload, 200);
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
