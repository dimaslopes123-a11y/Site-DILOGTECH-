import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Recebe fotos/vídeos do painel admin, salva no Blobs e devolve o HTML
// pronto para o site. A publicação real do arquivo no site ainda depende
// de outra função (servir-midia) que lê do mesmo Blobs store.
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405 });
  }

  const senha = req.headers.get("x-admin-senha");
  if (senha !== Netlify.env.get("ADMIN_SENHA")) {
    return new Response("Não autorizado", { status: 401 });
  }

  const form = await req.formData();
  const arquivos = form.getAll("arquivo") as File[];
  const legendas = form.getAll("legenda") as string[];
  const tipos = form.getAll("tipo") as string[];

  if (!arquivos.length) {
    return new Response("Nenhum arquivo enviado", { status: 400 });
  }

  const store = getStore("midia-site");
  const timestamp = Date.now();
  let codigoHtml = "";

  for (let i = 0; i < arquivos.length; i++) {
    const file = arquivos[i];
    const legenda = (legendas[i] || "Serviço realizado pela DILOGTECH").trim();
    const tipo = tipos[i];
    const ext = file.name.split(".").pop();
    const nomeBase = `novo-${timestamp}-${i + 1}`;
    const nomeArquivo = `${nomeBase}.${ext}`;
    const chave = tipo === "video" ? `videos/${nomeArquivo}` : `capas/${nomeArquivo}`;

    await store.set(chave, file, { metadata: { contentType: file.type } });

    if (tipo === "video") {
      codigoHtml += `        <div class="video-card">\n`;
      codigoHtml += `          <video controls preload="none" poster="/midia/capas/${nomeBase}.jpg" playsinline>\n`;
      codigoHtml += `            <source src="/midia/videos/${nomeArquivo}" type="video/mp4">\n`;
      codigoHtml += `          </video>\n`;
      codigoHtml += `          <p>${escapeHtml(legenda)}</p>\n`;
      codigoHtml += `        </div>\n`;
    } else {
      codigoHtml += `        <div class="video-card">\n`;
      codigoHtml += `          <img src="/midia/capas/${nomeArquivo}" alt="${escapeHtml(legenda)}" style="display:block;width:100%;aspect-ratio:9/16;object-fit:cover;">\n`;
      codigoHtml += `          <p>${escapeHtml(legenda)}</p>\n`;
      codigoHtml += `        </div>\n`;
    }
  }

  // Guarda também a lista de itens publicados (para listagem futura)
  const indice = (await store.get("indice.json", { type: "json" })) as any[] || [];
  indice.push({ timestamp, codigoHtml });
  await store.setJSON("indice.json", indice);

  return Response.json({ ok: true, codigoHtml });
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const config: Config = {
  path: "/api/publicar-midia",
};
