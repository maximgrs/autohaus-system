import { supabase } from "@/src/lib/supabase";

function extFromUri(uri: string) {
  const m = uri.toLowerCase().match(/\.(jpg|jpeg|png|heic|webp)$/);
  return m?.[1] ?? "jpg";
}

function contentTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

export async function uploadImagesToBucket(params: {
  bucket: "vehicle-photos" | "vehicle-docs" | "workcards" | "sale_prep_photos";
  vehicleId: string;
  uris: string[];
}) {
  const { bucket, vehicleId, uris } = params;

  const uploadedPaths: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const ext = extFromUri(uri);
    const contentType = contentTypeFromExt(ext);

    const bytes = await uriToArrayBuffer(uri);

    const filePath = `${vehicleId}/${Date.now()}_${i}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, bytes, { contentType, upsert: false });

    if (error) throw error;

    uploadedPaths.push(filePath);
  }

  return uploadedPaths;
}
