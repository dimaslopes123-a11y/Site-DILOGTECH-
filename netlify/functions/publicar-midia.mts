import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const MAX_BYTES = 5 * 1024 * 1024;

type Item = { id: string; tipo: "foto" | "video"; legenda: string; arquivo: string; ts: number };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export default async (req: Request) => {
  const esperada = Netlify.env.get("ADMIN_SENHA");
  if (!esperada) return json({ erro: "A senha do painel ainda não foi configurada no Netlify (variável ADMIN_SENHA)." }, 500);
  if (req.headers.get("x-admin-senha") !== esperada) return json({ erro: "Senha incorreta." }, 401);

  const store = getStore("midia-site");
  const indice = ((await store.get("indice.json", { type: "json" })) as Item[] | null) ?? [];

  if (req.method === "GET") return json(indice);

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    const item = indice.find((i) => i.id === id);
    if (!item) return json({ erro: "Item não encontrado." }, 404);
    await store.delete(`arquivos/${item.arquivo}`);
    await store.setJSON("indice.json", indice.filter((i) => i.id !== id));
    return json({ ok: true });
  }

  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  if (req.headers.get("x-verificar")) return json({ ok: true });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ erro: "Não consegui ler o envio." }, 400);
  }

  const file = form.get("arquivo");
  if (!(file instanceof File)) return json({ erro: "Nenhum arquivo recebido." }, 400);
  if (file.size > MAX_BYTES) return json({ erro: "Arquivo maior que 5 MB. Reduza o tamanho e tente de novo." }, 413);

  const ehVideo = file.type.startsWith("video/");
  const ehFoto = file.type.startsWith("image/");
  if (!ehVideo && !ehFoto) return json({ erro: "Envie apenas foto ou vídeo." }, 400);

  const legenda = String(form.get("legenda") || "Serviço realizado pela DILOGTECH").trim().slice(0, 200);
  const ext = (file.name.split(".").pop() || (ehVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const arquivo = `${id}.${ext}`;

  await store.set(`arquivos/${arquivo}`, await file.arrayBuffer(), { metadata: { contentType: file.type } });
  const item: Item = { id, tipo: ehVideo ? "video" : "foto", legenda, arquivo, ts: Date.now() };
  await store.setJSON("indice.json", [...indice, item]);

  return json({ ok: true, item });
};

export const config: Config = { path: "/api/publicar-midia" };
