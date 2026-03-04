// supabase/functions/generate-sale-contract/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

type PaymentType = "cash" | "credit" | "transfer" | "leasing";

function json(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Robust date formatting:
 * - "DD.MM.YYYY" stays (CarX)
 * - "MM-YYYY" stays (HU)
 * - ISO/parseable -> "DD.MM.YYYY"
 * - otherwise -> raw string (no NaN.NaN.NaN)
 */
function fmtDateAT(raw?: string | null) {
    const s = String(raw ?? "").trim();
    if (!s) return "";

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return s;
    if (/^\d{2}-\d{4}$/.test(s)) return s;

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = String(d.getFullYear());
        return `${dd}.${mm}.${yy}`;
    }

    return s;
}

function fmtKm(n?: number | null) {
    if (n == null) return "";
    try {
        return new Intl.NumberFormat("de-AT", { maximumFractionDigits: 0 })
            .format(n);
    } catch {
        return String(n);
    }
}

function fmtEUR(n?: number | null) {
    if (n == null) return "";
    try {
        return new Intl.NumberFormat("de-AT", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
        }).format(n);
    } catch {
        return `${Math.round(n)} €`;
    }
}

function getStr(o: any, key: string) {
    const v = o?.[key];
    return typeof v === "string" ? v.trim() : "";
}

function getNum(o: any, key: string): number | null {
    const v = o?.[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
        const n = Number(v.replace(/\./g, "").replace(",", "."));
        return Number.isNaN(n) ? null : n;
    }
    return null;
}

function safeSetText(form: any, name: string, value: string) {
    try {
        form.getTextField(name).setText(value ?? "");
    } catch {
        // ignore missing field
    }
}

function safeCheck(form: any, name: string, checked: boolean) {
    try {
        const cb = form.getCheckBox(name);
        checked ? cb.check() : cb.uncheck();
    } catch {
        // ignore missing box
    }
}

function setCondGroup(
    form: any,
    prefix: "A" | "B" | "C" | "D" | "E",
    cls: number | null,
) {
    for (let i = 1; i <= 4; i++) safeCheck(form, `COND_${prefix}_${i}`, false);
    if (cls && cls >= 1 && cls <= 4) {
        safeCheck(form, `COND_${prefix}_${cls}`, true);
    }
}

function setPayGroup(form: any, payment: PaymentType | null) {
    safeCheck(form, "PAY_BAR", false);
    safeCheck(form, "PAY_KREDIT", false);
    safeCheck(form, "PAY_UEBERWEISUNG", false);
    safeCheck(form, "PAY_LEASING", false);

    if (payment === "cash") safeCheck(form, "PAY_BAR", true);
    if (payment === "credit") safeCheck(form, "PAY_KREDIT", true);
    if (payment === "transfer") safeCheck(form, "PAY_UEBERWEISUNG", true);
    if (payment === "leasing") safeCheck(form, "PAY_LEASING", true);
}

function computeOverallFromDetails(details: any): number {
    const arr = [
        details?.cond_a,
        details?.cond_b,
        details?.cond_c,
        details?.cond_d,
        details?.cond_e,
    ].filter(
        (x: any) => typeof x === "number" && !Number.isNaN(x),
    );

    if (!arr.length) return 2; // Vertragstext: wenn nichts angekreuzt -> Klasse 2
    const avg = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
    return Math.min(4, Math.max(1, Math.ceil(avg)));
}

serve(async (req: Request) => {
    try {
        const body = await req.json().catch(() => null);
        const saleId = body?.saleId ? String(body.saleId).trim() : "";
        if (!saleId) return json(400, { error: "Missing saleId" });

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!SUPABASE_URL || !SERVICE_ROLE) {
            return json(500, {
                error:
                    "Missing env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
            });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

        // --- load sale (include status!)
        const { data: sale, error: saleErr } = await supabase
            .from("sales")
            .select(
                "id, vehicle_id, buyer_id, dealer_employee_id, sale_price, down_payment, payment_type, bank_name, contract_url, status",
            )
            .eq("id", saleId)
            .single();
        if (saleErr) throw saleErr;

        if (!sale.buyer_id) {
            return json(400, { error: "Sale missing buyer_id" });
        }
        if (!sale.dealer_employee_id) {
            return json(400, { error: "Sale missing dealer_employee_id" });
        }

        // --- buyer
        const { data: buyer, error: buyerErr } = await supabase
            .from("buyers")
            .select("full_name, address, email, phone, birthdate")
            .eq("id", sale.buyer_id)
            .single();
        if (buyerErr) throw buyerErr;

        // --- dealer
        const { data: dealer, error: dealerErr } = await supabase
            .from("employees")
            .select("display_name")
            .eq("id", sale.dealer_employee_id)
            .single();
        if (dealerErr) throw dealerErr;

        // --- vehicle (vin = dyna_fin)
        const { data: vehicle, error: vehErr } = await supabase
            .from("vehicles")
            .select("vin, carx_data, carx_vehicle_id")
            .eq("id", sale.vehicle_id)
            .single();
        if (vehErr) throw vehErr;

        // --- contract details (includes cond_overall)d
        const { data: details, error: detErr } = await supabase
            .from("sale_contract_details")
            .select(
                "cond_a, cond_b, cond_c, cond_d, cond_e, cond_overall, contract_date, handover_date, other_agreements",
            )
            .eq("sale_id", saleId)
            .maybeSingle();
        if (detErr) throw detErr;

        const carx = vehicle?.carx_data ?? {};

        // --- template
        const TEMPLATE_BUCKET = "contract-templates";
        const TEMPLATE_PATH = "kaufvertrag/v1.pdf";

        const { data: tplFile, error: tplErr } = await supabase.storage.from(
            TEMPLATE_BUCKET,
        ).download(TEMPLATE_PATH);
        if (tplErr) {
            return json(404, {
                error: "Template not found",
                bucket: TEMPLATE_BUCKET,
                path: TEMPLATE_PATH,
            });
        }

        const tplBytes = new Uint8Array(await tplFile.arrayBuffer());
        const pdfDoc = await PDFDocument.load(tplBytes);
        const form = pdfDoc.getForm();

        // --- map values
        const ort = "Dornbirn";

        const fin = String(vehicle?.vin ?? "").trim(); // <-- your dyna_fin
        const marke = getStr(carx, "brand_txt") || getStr(carx, "brand_name");
        const modell = getStr(carx, "model_txt") || getStr(carx, "model_name");
        const motorNr = getStr(carx, "dyna_motor_nr"); // <-- CarX motor nr
        const km = getNum(carx, "km_laufleistung");
        const erstzulassung = getStr(carx, "erstzulassung"); // usually DD.MM.YYYY
        const farbe = getStr(carx, "farbe");

        // Seller
        safeSetText(form, "Text3", dealer?.display_name ?? "");

        // Buyer
        safeSetText(form, "Text13", buyer?.full_name ?? "");
        safeSetText(form, "Text14", buyer?.address ?? "");
        safeSetText(form, "Text4", buyer?.email ?? "");
        safeSetText(form, "Text8", buyer?.phone ?? "");
        safeSetText(form, "Text9", fmtDateAT(buyer?.birthdate ?? null));

        // Vehicle
        safeSetText(form, "Text15", marke);
        safeSetText(form, "Text16", modell);
        safeSetText(form, "Text18", fin);
        safeSetText(form, "Text19", motorNr);
        safeSetText(form, "Text20", km != null ? fmtKm(km) : "");
        safeSetText(
            form,
            "Text10",
            erstzulassung ? fmtDateAT(erstzulassung) : "",
        );
        safeSetText(form, "Text11", farbe);

        // Payment values
        safeSetText(form, "Text49", fmtEUR(sale.sale_price ?? null));
        safeSetText(form, "Text50", fmtEUR(sale.down_payment ?? null));

        const payment = (sale.payment_type ?? null) as PaymentType | null;
        const needsBank = payment === "credit" || payment === "leasing";
        const bank = String(sale.bank_name ?? "").trim();
        const other = String(details?.other_agreements ?? "").trim();

        const agreements = needsBank && bank
            ? (other
                ? `Finanzierung über ${bank}\n${other}`
                : `Finanzierung über ${bank}`)
            : other;

        safeSetText(form, "Text51", agreements);

        // Signature fields
        safeSetText(form, "Text59", ort);
        safeSetText(form, "Text60", fmtDateAT(details?.contract_date ?? null));
        safeSetText(form, "Text64", ort);
        safeSetText(form, "Text65", fmtDateAT(details?.handover_date ?? null));

        // Text58: Gesamtzustand (1..4)
        const overall = typeof details?.cond_overall === "number"
            ? details.cond_overall
            : computeOverallFromDetails(details);
        safeSetText(form, "Text58", String(overall));

        // Checkboxes
        setCondGroup(form, "A", details?.cond_a ?? null);
        setCondGroup(form, "B", details?.cond_b ?? null);
        setCondGroup(form, "C", details?.cond_c ?? null);
        setCondGroup(form, "D", details?.cond_d ?? null);
        setCondGroup(form, "E", details?.cond_e ?? null);

        setPayGroup(form, payment);

        // finalize
        form.flatten();
        const outBytes = await pdfDoc.save();

        // upload
        const OUT_BUCKET = "contracts";
        const outPath = `${saleId}/kaufvertrag_${Date.now()}.pdf`;

        const { error: upErr } = await supabase.storage.from(OUT_BUCKET).upload(
            outPath,
            outBytes,
            {
                contentType: "application/pdf",
                upsert: true,
            },
        );
        if (upErr) throw upErr;

        // Update sale: contract_url + move status draft -> contract_generated
        const nextStatus = String(sale.status ?? "") === "draft"
            ? "contract_generated"
            : sale.status;

        const { error: updErr } = await supabase
            .from("sales")
            .update({ contract_url: outPath, status: nextStatus })
            .eq("id", saleId);
        if (updErr) throw updErr;

        // signed url for preview/open
        const { data: signed, error: signedErr } = await supabase.storage
            .from(OUT_BUCKET)
            .createSignedUrl(outPath, 60 * 60 * 24 * 7);
        if (signedErr) throw signedErr;

        return json(200, { path: outPath, signedUrl: signed.signedUrl });
    } catch (e: any) {
        console.error("generate-sale-contract error:", e);
        return json(500, { error: e?.message ?? String(e) });
    }
});
