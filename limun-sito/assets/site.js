/* Limun Studio Design — il sito legge i contenuti da content/projects.json e content/settings.json,
   che si modificano dal pannello in /admin. */
(() => {
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const SL = '<span class="sl">╱</span>';
  const TONES = ["var(--ph1)","var(--ph2)","var(--ph3)","var(--ph4)"];
  const ph = (n, r, cls = "") => `<span class="ph ${cls}" style="--r:${r};--tone:${TONES[((n % 4) + 4) % 4]}"></span>`;
  const paras = t => String(t || "").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).map(s => `<p>${esc(s).replace(/\n/g, "<br>")}</p>`).join("");
  const lines = t => esc(t).replace(/\n/g, "<br>");
  const slugify = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let PROJECTS = [], S = {}, filter = null;
  const idx = p => PROJECTS.indexOf(p);
  const bySlug = s => PROJECTS.find(p => p.slug === s);
  const catsOf = p => [p.category, ...(Array.isArray(p.categories) ? p.categories : [])].filter(Boolean);
  const cats = () => [...new Set(PROJECTS.map(p => p.category).filter(Boolean).concat(PROJECTS.flatMap(p => catsOf(p))))];
  const head = p => `${esc(p.client)}${p.subtitle ? SL + esc(p.subtitle) : ""}${p.year ? " — " + esc(p.year) : ""}`;

  /* ---------- Media: foto, video, YouTube, Vimeo, Instagram ---------- */
  function ytId(u){ const m = String(u).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/); return m ? m[1] : null; }
  function vimeoId(u){ const m = String(u).match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : null; }
  function igPath(u){ const m = String(u).match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/); return m ? `${m[1] === "reels" ? "reel" : m[1]}/${m[2]}` : null; }
  const RATIOS = ["1/1","4/5","3/4","2/3","4/3","3/2","16/9","9/16"];
  const fit = r => RATIOS.includes(r) ? ` style="aspect-ratio:${r};object-fit:cover"` : "";
  function mediaItem(m, n){
    const cls = `m ${m.size === "full" ? "span2" : ""}`;
    const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : "";
    switch (m.type){
      case "image":
        if (!m.src) return `<figure class="${cls}">${ph(n, "4/3")}</figure>`;
        return `<figure class="${cls}"><img src="${esc(m.src)}" alt="${esc(m.alt || "")}" loading="lazy" decoding="async"${fit(m.ratio)}>${cap}</figure>`;
      case "gallery": {
        const imgs = (Array.isArray(m.images) ? m.images : [m.images]).filter(Boolean);
        if (!imgs.length) return "";
        const per = Math.min(4, Math.max(1, parseInt(m.per_row, 10) || (m.size === "full" ? 1 : 2)));
        return `<figure class="m span2 grp" style="--n:${per}">${imgs.map(src => `<img src="${esc(src)}" alt="" loading="lazy" decoding="async"${fit(m.ratio)}>`).join("")}${cap}</figure>`;
      }
      case "video":
        if (!m.src) return "";
        return `<figure class="${cls}"><video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ""} autoplay muted loop playsinline preload="metadata"></video>${cap}</figure>`;
      case "youtube": {
        const id = ytId(m.url); if (!id) return "";
        const tall = /\/shorts\//.test(m.url);
        return `<figure class="${cls}"><div class="emb" style="--r:${tall ? "9/16" : "16/9"}"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${esc(m.caption || "Video YouTube")}" loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>${cap}</figure>`;
      }
      case "vimeo": {
        const id = vimeoId(m.url); if (!id) return "";
        return `<figure class="${cls}"><div class="emb" style="--r:16/9"><iframe src="https://player.vimeo.com/video/${id}?dnt=1" title="${esc(m.caption || "Video Vimeo")}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>${cap}</figure>`;
      }
      case "link": {
        if (!m.url) return "";
        return `<p class="m lnk ${m.size === "full" ? "span2" : ""}"><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label || m.url)} <span aria-hidden="true">↗</span></a></p>`;
      }
      case "instagram": {
        const p = igPath(m.url); if (!p) return "";
        return `<figure class="${cls}"><div class="emb" style="--r:9/14"><iframe src="https://www.instagram.com/${p}/embed/" title="${esc(m.caption || "Post Instagram")}" loading="lazy" scrolling="no"></iframe></div>${cap}</figure>`;
      }
      default: return "";
    }
  }
  function gallery(list, seed){
    const items = (list || []).map((m, k) => mediaItem(m, seed + k)).filter(Boolean);
    if (!items.length) return `<div class="g2 p-gal">${ph(seed,"16/9","span2")}${ph(seed+1,"4/5")}${ph(seed+2,"4/5")}</div>`;
    return `<div class="g2 p-gal">${items.join("")}</div>`;
  }

  /* ---------- Podcast: stagioni a sinistra, player ed episodi a destra ---------- */
  const PODS = {};
  const pad = n => String(n).padStart(2, "0");
  function ink(hex){
    const m = /^#?([0-9a-f]{6})/i.exec(hex || ""); if (!m) return "#000";
    const n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    const L = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return (.2126 * L[0] + .7152 * L[1] + .0722 * L[2]) > .22 ? "#000" : "#fff";
  }
  function podcast(w, key){
    const seasons = (w.seasons || []).filter(s => s && (s.label || s.title)).map(s => ({ ...s, episodes: (s.episodes || []).filter(e => e && (e.title || e.url)) }));
    PODS[key] = seasons;
    const color = /^#[0-9a-f]{6}/i.test(w.color || "") ? w.color.slice(0, 7) : "#b8a6f7";
    const total = seasons.reduce((n, s) => n + s.episodes.length, 0);
    return `<div class="pod" data-pod="${key}" style="--pc:${color};--pi:${ink(color)}">
      <div class="pod-l">
        <ol class="pod-s">${seasons.map((s, i) => `<li><button type="button" data-season="${i}" aria-pressed="${i === 0}">${esc(s.label || "S" + pad(i + 1))}${s.title ? " " + esc(s.title) : ""}</button></li>`).join("")}</ol>
        <div class="pod-foot"><span>${esc(w.title)}</span><span>${total} ${total === 1 ? "episode" : "episodes"}</span></div>
      </div>
      <div class="pod-r">${podRight(key, 0, 0, false)}</div>
    </div>`;
  }
  function series(w, key){
    PODS[key] = [{ label: "", episodes: (w.episodes || []).filter(e => e && (e.title || e.url)) }];
    return `<div class="ser" data-pod="${key}"><div class="pod-r">${podRight(key, 0, 0, false)}</div></div>`;
  }
  function podRight(key, si, ei, autoplay){
    const s = PODS[key][si]; if (!s) return "";
    const e = s.episodes[ei];
    const id = e ? ytId(e.url) : null;
    const player = id
      ? `<div class="emb" style="--r:16/9"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}" title="${esc(e.title)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : `<div class="emb pod-empty" style="--r:16/9"><span>${e ? "Video in arrivo" : "Nessun episodio"}</span></div>`;
    const sl = s.label === "" ? "" : esc(s.label || "S" + pad(si + 1));
    return `<div class="pod-now">${sl}${e ? `${sl ? " — " : ""}E${pad(ei + 1)} ${esc(e.title)}${e.guest ? `<br>with ${esc(e.guest)}` : ""}` : ""}</div>
      ${player}
      <ol class="pod-eps">${s.episodes.map((x, k) => `<li><button type="button" data-ep="${k}" data-season-of="${si}" aria-pressed="${k === ei}"><span>E${pad(k + 1)}</span><span>${esc(x.title)}${x.guest ? " — " + esc(x.guest) : ""}</span></button></li>`).join("")}</ol>`;
  }

  /* ---------- Viste ---------- */
  function tile(p){
    const i = idx(p);
    let cover = ph(i, "4/3");
    const yid = !p.cover_video && p.cover_youtube ? ytId(p.cover_youtube) : null;
    if (p.cover_video) cover = `<video class="cover" src="${esc(p.cover_video)}" ${p.cover ? `poster="${esc(p.cover)}"` : ""} autoplay muted loop playsinline preload="metadata"></video>`;
    else if (yid){
      const tall = /\/shorts\//.test(p.cover_youtube);
      cover = `<span class="cover cvr${tall ? " tall" : ""}"${p.cover ? ` style="background:center/cover url('${esc(p.cover)}')"` : ""}><iframe src="https://www.youtube-nocookie.com/embed/${yid}?autoplay=1&mute=1&loop=1&playlist=${yid}&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&fs=0" title="" tabindex="-1" aria-hidden="true" loading="lazy" allow="autoplay; encrypted-media"></iframe></span>`;
    }
    else if (p.cover) cover = `<img class="cover" src="${esc(p.cover)}" alt="" loading="${i < 4 ? "eager" : "lazy"}" decoding="async">`;
    return `<a class="tile" href="#p-${p.slug}">${cover}<span>${esc(p.client)}${p.subtitle ? SL + esc(p.subtitle) : ""}<br>${esc(p.category)}</span></a>`;
  }
  const VIEWS = {
    home(){
      const list = PROJECTS.filter(p => !filter || catsOf(p).includes(filter));
      return `<div class="view">${list.length ? `<div class="g2">${list.map(tile).join("")}</div>` : `<p class="empty">Nessun progetto in questa categoria.</p>`}</div>`;
    },
    project(p){
      const i = idx(p), n = PROJECTS[(i + 1) % PROJECTS.length];
      const credits = (p.credits || []).filter(c => c && c.name);
      const works = (p.works || []).filter(w => w && w.title);
      return `<article class="view">
        <div class="p-text">
          <h1 style="font:inherit">${head(p)}<br>${esc(p.category)}</h1>
          ${paras(p.description)}
          ${credits.length ? `<p>${credits.map(c => `${esc(c.name)}${c.role ? " — " + esc(c.role) : ""}`).join("<br>")}</p>` : ""}
        </div>
        ${works.length ? `<div class="works">${works.map((w, k) => `<section class="acc">
            <button type="button" class="acc-h" data-acc aria-expanded="false"><span>${esc(w.title)}</span><span class="ic" aria-hidden="true"></span></button>
            <div class="acc-b"><div class="acc-in"><div class="acc-c">${paras(w.text)}${w.type === "podcast" ? podcast(w, `${p.slug}-${k}`) : w.type === "series" ? series(w, `${p.slug}-${k}`) : gallery(w.media, i + k * 3)}</div></div></div>
          </section>`).join("")}</div>` : gallery(p.media, i)}
        ${(() => { const x = (p.extra || []).map((m, k) => mediaItem(m, i + k)).filter(Boolean); return x.length ? `<div class="g2 p-gal after">${x.join("")}</div>` : ""; })()}
        ${PROJECTS.length > 1 ? `<a class="next" href="#p-${n.slug}">Next:<br><span class="nt">${head(n)}</span></a>` : ""}
      </article>`;
    },
    contact(){
      return `<div class="view"><div class="blocks">
        ${S.email ? `<p>New projects:<br><a href="mailto:${esc(S.email)}" data-mail>${esc(S.email)}</a><br><button type="button" class="pill" data-copy style="margin-top:.3em">Copy</button></p>` : ""}
        ${S.address ? `<p>Studio:<br>${lines(S.address)}</p>` : ""}
        ${S.instagram_url ? `<p>Instagram:<br><a href="${esc(S.instagram_url)}" target="_blank" rel="noopener">${esc(S.instagram_handle || "Instagram")}</a></p>` : ""}
      </div></div>`;
    }
  };

  /* ---------- Parti fisse: About, footer ---------- */
  function contacts(){ return `<div class="i4">
        <div>${lines(S.address)}</div>
        <div style="grid-column:span 2">${S.email ? `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : ""}${S.instagram_url ? `${S.email ? "<br>" : ""}<a href="${esc(S.instagram_url)}" target="_blank" rel="noopener">Instagram</a>` : ""}</div>
      </div>`; }
  function renderChrome(){
    const team = (S.team || []).filter(t => t && t.name);
    $("#infoContent").innerHTML = `
      <div class="i2">
        <div>${paras(S.about)}</div>
        <div>
          ${S.services?.length ? `<p>Services → ${S.services.map(esc).join(SL)}</p>` : ""}
          ${S.clients?.length ? `<p>Clients → ${S.clients.map(esc).join(SL)}</p>` : ""}
        </div>
      </div>
      ${S.contacts_in_about ? contacts() : ""}
      ${team.length ? `<div class="ipills"><button type="button" class="pill" id="teamBtn" aria-expanded="false">Team</button></div>
      <div class="team" id="team" hidden>${team.map(t => `${esc(t.name)}${t.role ? " — " + esc(t.role) : ""}`).join("<br>")}</div>` : ""}`;
    $("#foot").innerHTML = `<div>${S.name ? esc(S.name) + "<br>" : ""}${lines(S.address)}</div>
      <div>${S.email ? `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : ""}${S.instagram_url ? `${S.email ? "<br>" : ""}<a href="${esc(S.instagram_url)}" target="_blank" rel="noopener">${esc(S.instagram_handle || "Instagram")}</a>` : ""}</div>`;
    if (S.instagram_url) $("#dockIg").href = S.instagram_url;
    const tb = $("#teamBtn");
    if (tb) tb.addEventListener("click", () => { const t = $("#team"); t.hidden = !t.hidden; tb.setAttribute("aria-expanded", !t.hidden); });
  }

  /* About: si apre in alto e resta aperto mentre navighi */
  const topEl = $("#top"), abt = $("#abt");
  function setAbout(open){ topEl.classList.toggle("open", open); abt.setAttribute("aria-expanded", open); abt.textContent = open ? "Close" : "About"; }
  abt.addEventListener("click", () => setAbout(!topEl.classList.contains("open")));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setAbout(false); });

  /* Filters */
  const fbar = $("#fbar"), fbtn = $("#fbtn");
  function fillBar(){
    fbar.innerHTML = [`<button type="button" class="pill" data-f="" aria-pressed="${!filter}">All</button>`,
      ...cats().map(c => `<button type="button" class="pill" data-f="${esc(c)}" aria-pressed="${filter === c}">${esc(c)}</button>`)].join("");
    fbtn.textContent = filter ? "Filters: " + filter : "Filters";
  }
  /* Click sul nome in alto: torna davvero alla home, senza filtri */
  $("#brand").addEventListener("click", e => {
    e.preventDefault();
    filter = null; fbar.hidden = true; fbtn.setAttribute("aria-expanded", "false"); fillBar();
    setAbout(false);
    if (location.hash && location.hash !== "#home") location.hash = "home";
    else route();
  });

  fbtn.addEventListener("click", () => { fbar.hidden = !fbar.hidden; fbtn.setAttribute("aria-expanded", !fbar.hidden); fillBar(); });
  fbar.addEventListener("click", e => {
    const f = e.target.closest("[data-f]"); if (!f) return;
    filter = f.dataset.f || null; fillBar();
    if (location.hash && location.hash !== "#home"){ location.hash = "home"; return; }
    app.innerHTML = VIEWS.home(); window.scrollTo(0, 0);
  });

  /* Router */
  function route(){
    const h = decodeURIComponent(location.hash.slice(1));
    let key = "home", html;
    if (h === "about"){ setAbout(true); html = VIEWS.home(); }
    else if (h === "contact"){ key = "contact"; html = VIEWS.contact(); }
    else if (h.startsWith("p-") && bySlug(h.slice(2))){ key = "project"; const p = bySlug(h.slice(2)); html = VIEWS.project(p); document.title = `${p.client} — ${S.name || "Limun Studio Design"}`; }
    else html = VIEWS.home();
    if (key !== "project") document.title = S.name || "Limun Studio Design";
    if (key !== "home"){ fbar.hidden = true; fbtn.setAttribute("aria-expanded", "false"); }
    document.body.dataset.view = key;
    app.innerHTML = html;
    document.querySelectorAll("[data-nav]").forEach(a => a.dataset.nav === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  app.addEventListener("click", e => {
    const a = e.target.closest("[data-acc]");
    if (a){ const s = a.parentElement, open = !s.classList.contains("open"); s.classList.toggle("open", open); a.setAttribute("aria-expanded", open); return; }
    const sb = e.target.closest("[data-season]");
    if (sb){
      const pod = sb.closest("[data-pod]");
      pod.querySelectorAll("[data-season]").forEach(b => b.setAttribute("aria-pressed", b === sb));
      pod.querySelector(".pod-r").innerHTML = podRight(pod.dataset.pod, +sb.dataset.season, 0, false);
      return;
    }
    const eb = e.target.closest("[data-ep]");
    if (eb){
      const pod = eb.closest("[data-pod]");
      pod.querySelector(".pod-r").innerHTML = podRight(pod.dataset.pod, +eb.dataset.seasonOf, +eb.dataset.ep, true);
      return;
    }
    const c = e.target.closest("[data-copy]");
    if (c){
      const done = () => { c.textContent = "Copied"; setTimeout(() => c.textContent = "Copy", 1500); };
      const fallback = () => { const m = $("[data-mail]"); const r = document.createRange(); r.selectNodeContents(m); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(S.email).then(done, fallback); } catch (err){ fallback(); }
    }
  });

  /* Caricamento contenuti */
  async function load(){
    try {
      const [p, s] = await Promise.all([
        fetch("content/projects.json", { cache: "no-cache" }).then(r => r.json()),
        fetch("content/settings.json", { cache: "no-cache" }).then(r => r.json())
      ]);
      S = s || {};
      const seen = {};
      PROJECTS = (p.projects || []).filter(x => x && x.client && !x.hidden).map(x => {
        let slug = slugify(x.client + (x.subtitle ? "-" + x.subtitle : "")) || "progetto";
        seen[slug] = (seen[slug] || 0) + 1;
        if (seen[slug] > 1) slug += "-" + seen[slug];
        return { ...x, slug };
      });
    } catch (err){
      app.innerHTML = `<p class="empty">Impossibile caricare i contenuti. Ricarica la pagina.</p>`;
      return;
    }
    renderChrome(); fillBar(); route();
  }
  load();
})();
