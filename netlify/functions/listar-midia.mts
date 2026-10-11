import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Devolve o HTML de todos os itens publicados pelo painel admin.
export default async () => {
  const store = getStore("midia-site");
  const indice = ((await store.get("indice.json", { type: "json" })) as any[]) || [];
  const html = indice.map((i) => i.codigoHtml).join("\n");
  return Response.json({ html }, { headers: { "cache-control": "no-store" } });
};

export const config: Config = { path: "/api/listar-midia" };
