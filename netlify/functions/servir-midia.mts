import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Serve os arquivos de mídia enviados pelo painel admin, guardados no Blobs.
export default async (req: Request, context: Context) => {
  const { tipo, nome } = context.params;
  if (!tipo || !nome) {
    return new Response("Não encontrado", { status: 404 });
  }

  const store = getStore("midia-site");
  const chave = `${tipo}/${nome}`;
  const entry = await store.getWithMetadata(chave, { type: "arrayBuffer" });

  if (!entry) {
    return new Response("Não encontrado", { status: 404 });
  }

  const contentType = (entry.metadata?.contentType as string) || "application/octet-stream";
  return new Response(entry.data, {
    headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
};

export const config: Config = {
  path: "/midia/:tipo/:nome",
};
