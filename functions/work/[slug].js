// Pagina dedicata di ogni progetto: /work/nome-progetto
// Restituisce la stessa pagina del sito, ma con titolo, descrizione e immagine del progetto,
// così i link condivisi (WhatsApp, LinkedIn, Google) mostrano l'anteprima giusta.

const slugify = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const attr = s => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/", url));
  let project = null, settings = {};
  try {
    const [p, s] = await Promise.all([
      env.ASSETS.fetch(new URL("/content/projects.json", url)).then(r => r.json()),
      env.ASSETS.fetch(new URL("/content/settings.json", url)).then(r => r.json()).catch(() => ({}))
    ]);
    settings = s || {};
    const seen = {};
    for (const x of (p.projects || [])) {
      if (!x || !x.client || x.hidden) continue;
      let slug = slugify(x.client + (x.subtitle ? "-" + x.subtitle : "")) || "progetto";
      seen[slug] = (seen[slug] || 0) + 1;
      if (seen[slug] > 1) slug += "-" + seen[slug];
      if (slug === params.slug) { project = x; break; }
    }
  } catch (e) { /* in caso di errore si serve la pagina normale */ }
  if (!project) return page;

  const studio = settings.name || "Limun Studio Design";
  const title = `${project.client}${project.subtitle ? " — " + project.subtitle : ""} — ${studio}`;
  const text = String(project.description || "").replace(/\s+/g, " ").trim();
  const desc = (text.length > 160 ? text.slice(0, 157).replace(/\s+\S*$/, "") + "…" : text) || `${project.category || ""} — ${studio}`;
  const img = project.cover ? new URL(project.cover, url).href : "";
  const meta = [
    `<meta name="description" content="${attr(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${attr(studio)}">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:url" content="${attr(url.origin + url.pathname)}">`,
    img ? `<meta property="og:image" content="${attr(img)}">` : "",
    `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">`,
    `<link rel="canonical" href="${attr(url.origin + url.pathname)}">`
  ].join("\n");

  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(title); } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .on("head", { element(el) { el.append(meta, { html: true }); } })
    .transform(new Response(page.body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
}
