import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (_req: Request, context: Context) => {
  const arquivo = context.params.arquivo;
  if (!arquivo || arquivo.includes("/") || arquivo.includes("..")) return new Response("Não encontrado", { status: 404 });

  const store = getStore("midia-site");
  const entry = await store.getWithMetadata(`arquivos/${arquivo}`, { type: "arrayBuffer" });
  if (!entry) return new Response("Não encontrado", { status: 404 });

  const contentType = (entry.metadata?.contentType as string) || "application/octet-stream";
  return new Response(entry.data, {
    headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
};

export const config: Config = { path: "/midia/:arquivo" };
