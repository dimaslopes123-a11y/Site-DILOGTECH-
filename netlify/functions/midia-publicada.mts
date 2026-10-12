import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Lista pública (sem senha) do que foi publicado pelo painel — o site lê isto.
export default async () => {
  const store = getStore("midia-site");
  const indice = (await store.get("indice.json", { type: "json" })) ?? [];
  return new Response(JSON.stringify(indice), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
  });
};

export const config: Config = { path: "/api/midia-publicada" };
