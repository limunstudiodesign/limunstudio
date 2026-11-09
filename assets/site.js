/* Limun Studio Design — il sito legge i contenuti da content/projects.json e content/settings.json,
   che si modificano dal pannello in /admin. */
(() => {
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const SL = '<span class="sl">╱</span>';
  const TONES = ["var(--ph1)","var(--ph2)","var(--ph3)","var(--ph4)"];
  const ph = (n, r, cls = "") => `<span class="ph ${cls}" style="--r:${r};--tone:${TONES[((n % 4) + 4) % 4]}"></span>`;
  const paras = t => String(t || "").split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => `<p>${esc(s)}</p>`).join("");
  const lines = t => esc(t).replace(/\n/g, "<br>");
  const slugify = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let PROJECTS = [], S = {}, filter = null, lastList = "/";
  const idx = p => PROJECTS.indexOf(p);
  const bySlug = s => PROJECTS.find(p => p.slug === s);
  const catsOf = p => [p.category, ...(Array.isArray(p.categories) ? p.categories : [])].filter(Boolean);
  const cats = () => [...new Set(PROJECTS.map(p => p.category).filter(Boolean).concat(PROJECTS.flatMap(p => catsOf(p))))];
  const head = p => `${esc(p.client)}${p.subtitle ? SL + esc(p.subtitle) : ""}${p.year ? " — " + esc(p.year) : ""}`;

  /* ---------- Contenuti esterni: si caricano solo dopo il consenso ---------- */
  /* Scelta salvata: "1" accettati, "0" rifiutati, nessun valore = banner da mostrare */
  let choice = null;
  try { choice = localStorage.getItem("limun-ext"); } catch (err) {}
  let ext = choice === "1";
  function setExt(v){ ext = v; choice = v ? "1" : "0"; try { localStorage.setItem("limun-ext", choice); } catch (err) {} }
  const SERVICE = { youtube: "YouTube", vimeo: "Vimeo", instagram: "Instagram" };
  function frame(service, src, ratio, title, allow, link){
    const ifr = `<iframe src="${src}" title="${esc(title)}" loading="lazy" ${allow ? `allow="${allow}" allowfullscreen` : `scrolling="no"`}></iframe>`;
    const cls = service === "instagram" ? "emb ig" : "emb";
    if (ext) return `<div class="${cls}" style="--r:${ratio}">${ifr}</div>`;
    return `<div class="${cls} ext-off" style="--r:${ratio}" data-gate="${encodeURIComponent(ifr)}" data-r="${ratio}"><button type="button" class="pill" data-load-ext>Mostra il video</button></div>`;
  }
  function loadAll(){
    document.querySelectorAll(".ext-off[data-gate]").forEach(d => {
      d.innerHTML = decodeURIComponent(d.dataset.gate); d.classList.remove("ext-off"); delete d.dataset.gate;
    });
  }
  const YTA = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";

  /* ---------- Media: foto, video, YouTube, Vimeo, Instagram ---------- */
  function ytId(u){ const m = String(u).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/); return m ? m[1] : null; }
  function vimeoId(u){ const m = String(u).match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : null; }
  function igPath(u){ const m = String(u).match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/); return m ? `${m[1] === "reels" ? "reel" : m[1]}/${m[2]}` : null; }
  const RATIOS = ["1/1","4/5","3/4","2/3","4/3","3/2","16/9","9/16"];
  const fit = r => RATIOS.includes(r) ? ` style="aspect-ratio:${r};object-fit:cover"` : "";
  function mediaItem(m, n){
    const cls = `m${m.size === "full" ? " span2" : ""}${m.type === "image" && RATIOS.includes(m.ratio) ? `" data-fixed="${m.ratio}` : ""}`;
    const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : "";
    switch (m.type){
      case "image":
        if (!m.src) return `<figure class="${cls}">${ph(n, "4/3")}</figure>`;
        return `<figure class="${cls}"><img src="${esc(m.src)}" alt="${esc(m.alt || "")}" loading="lazy" decoding="async">${cap}</figure>`;
      case "gallery": {
        const imgs = (Array.isArray(m.images) ? m.images : [m.images]).filter(Boolean);
        if (!imgs.length) return "";
        const per = Math.min(4, Math.max(1, parseInt(m.per_row, 10) || (m.size === "full" ? 1 : 2)));
        const fx = RATIOS.includes(m.ratio) ? ` data-fixed="${m.ratio}"` : "";
        return imgs.map(src => `<figure class="m"${fx}><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></figure>`).join("");
      }
      case "video":
        if (!m.src) return "";
        if (m.sound) return `<figure class="${cls}"><video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ""} controls playsinline preload="none"></video>${cap}</figure>`;
        return `<figure class="${cls}"><video data-auto src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ""} muted loop playsinline preload="none"></video>${cap}</figure>`;
      case "youtube": {
        const id = ytId(m.url); if (!id) return "";
        const tall = /\/shorts\//.test(m.url);
        return `<figure class="${cls}">${frame("youtube", `https://www.youtube-nocookie.com/embed/${id}?rel=0`, tall ? "9/16" : "16/9", m.caption || "Video YouTube", YTA, m.url)}${cap}</figure>`;
      }
      case "vimeo": {
        const id = vimeoId(m.url); if (!id) return "";
        return `<figure class="${cls}">${frame("vimeo", `https://player.vimeo.com/video/${id}?dnt=1`, "16/9", m.caption || "Video Vimeo", "autoplay; fullscreen; picture-in-picture", m.url)}${cap}</figure>`;
      }
      case "link": {
        if (!m.url) return "";
        return `<p class="m lnk ${m.size === "full" ? "span2" : ""}"><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label || m.url)} <span aria-hidden="true">↗</span></a></p>`;
      }
      case "instagram": {
        const p = igPath(m.url); if (!p) return "";
        const who = m.avatar || m.handle ? `<div class="ig-h">${m.avatar ? `<img src="${esc(m.avatar)}" alt="">` : ""}${m.handle ? `<span>${esc(m.handle)}</span>` : ""}</div>` : "";
        return `<figure class="${cls}">${who}${frame("instagram", `https://www.instagram.com/${p}/embed/`, "9/16", m.caption || "Post Instagram", "", m.url)}${cap}</figure>`;
      }
      default: return "";
    }
  }
  function gallery(list, seed, lay){
    const items = (list || []).map((m, k) => mediaItem(m, seed + k)).filter(Boolean);
    if (!items.length) return `<div class="g2 p-gal">${ph(seed,"16/9","span2")}${ph(seed+1,"4/5")}${ph(seed+2,"4/5")}</div>`;
    return `<div class="pk p-gal"${lay === "rows" ? ' data-layout="rows"' : ""}>${items.join("")}</div>`;
  }


  /* ---------- Impaginazione automatica dei media ----------
     Foto e video si dispongono in righe della stessa altezza che riempiono la larghezza.
     Se nel blocco ci sono sia elementi verticali sia orizzontali, i verticali vanno
     in una colonna a destra e le due colonne finiscono alla stessa altezza. */
  const GAP = 8;
  const rnum = r => { const [a, b] = String(r).split("/").map(Number); return a && b ? a / b : 0; };
  function aspect(fig){
    if (fig.dataset.a) return Promise.resolve(+fig.dataset.a);
    const done = a => { fig.dataset.a = a; return a; };
    if (fig.dataset.fixed) return Promise.resolve(done(rnum(fig.dataset.fixed)));
    const emb = fig.querySelector(".emb");
    if (emb) return Promise.resolve(done(rnum(emb.style.getPropertyValue("--r")) || 16 / 9));
    const img = fig.querySelector("img"), vid = fig.querySelector("video");
    let p;
    if (img){
      img.loading = "eager";
      p = img.complete && img.naturalWidth ? Promise.resolve(img.naturalWidth / img.naturalHeight)
        : new Promise(r => { img.addEventListener("load", () => r(img.naturalWidth / img.naturalHeight), { once: true }); img.addEventListener("error", () => r(4 / 3), { once: true }); });
    } else if (vid){
      p = vid.videoWidth ? Promise.resolve(vid.videoWidth / vid.videoHeight)
        : new Promise(r => { vid.addEventListener("loadedmetadata", () => r(vid.videoWidth / vid.videoHeight), { once: true }); vid.addEventListener("error", () => r(16 / 9), { once: true }); if (vid.preload === "none"){ vid.preload = "metadata"; vid.load(); } });
    } else return Promise.resolve(done(0));
    return Promise.race([p, new Promise(r => setTimeout(() => r(16 / 9), 8000))]).then(a => done(a || 16 / 9));
  }
  /* Divide gli elementi in righe scegliendo le interruzioni più vicine all'altezza ideale */
  function rows(list, W, T, maxN, noFull){
    const out = []; let seg = [];
    const dp = idx => {
      const n = idx.length, best = Array(n + 1).fill(Infinity), prev = Array(n + 1).fill(0); best[0] = 0;
      for (let j = 1; j <= n; j++) for (let k = Math.max(0, j - maxN); k < j; k++){
        let s = 0; for (let t = k; t < j; t++) s += list[idx[t]].a;
        const h = (W - GAP * (j - k - 1)) / s, c = best[k] + ((h - T) / T) ** 2;
        if (c < best[j]){ best[j] = c; prev[j] = k; }
      }
      const r = []; for (let j = n; j > 0; j = prev[j]) r.unshift(idx.slice(prev[j], j)); return r;
    };
    const flush = () => { if (seg.length){ out.push(...dp(seg)); seg = []; } };
    list.forEach((it, i) => { if (!it.a || (!noFull && it.full && it.a >= 1)){ flush(); out.push([i]); } else seg.push(i); });
    flush(); return out;
  }
  const sumA = (list, r) => r.reduce((s, i) => s + list[i].a, 0);
  /* altezza di una colonna di righe larga w */
  const colH = (list, rs, w) => rs.reduce((h, r) => h + (list[r[0]].a ? (w - GAP * (r.length - 1)) / sumA(list, r) : 40), 0) + GAP * Math.max(0, rs.length - 1);
  function rowsHTML(list, rs, maxH){
    return rs.map(r => {
      const s = sumA(list, r);
      if (!s) return `<div class="pk-row pk-solo">${r.map(i => list[i].html).join("")}</div>`;
      const cap = maxH && r.length === 1 && s < 1 ? ` style="max-width:${Math.round(maxH * s + GAP * (r.length - 1))}px"` : "";
      return `<div class="pk-row"${cap}>${r.map(i => list[i].html.replace(/^<(figure|div|p)\b/, `<$1 style="flex:${Math.round(list[i].a * 1000)} 1 0%;--a:${list[i].a}"`)).join("")}</div>`;
    }).join("");
  }
  function layout(box){
    const list = box._items, W = box.clientWidth;
    if (!W) return;
    const maxH = Math.round(window.innerHeight * .86);
    const mobile = W < 600;
    const V = list.filter(it => it.a && it.a < .87), O = list.filter(it => !(it.a && it.a < .87));
    let html;
    if (mobile || !V.length || !O.length || box.dataset.layout === "rows"){
      const onlyV = !O.length;
      const T = mobile ? W * .62 : onlyV ? W * .36 : Math.min(Math.max(W * .34, 240), 620);
      html = rowsHTML(list, rows(list, W, T, mobile ? 3 : onlyV ? 5 : 4), maxH);
    } else {
      /* due colonne: orizzontali a sinistra, verticali a destra, stessa altezza */
      const avgV = V.reduce((s, it) => s + it.a, 0) / V.length;
      let below = [], vRight = V.slice(), oLeft = O.slice(), best = null;
      const plan = (k, oL, vR) => {
        const lRows = rows(oL, W * .62, Math.min(Math.max(W * .2, 200), 480), 3, true);
        const wr0 = W * .36, rRows = rows(vR, wr0, (wr0 - GAP * (k - 1)) / (k * avgV), k, true);
        /* larghezza di sinistra che rende uguali le altezze: le due altezze sono lineari nella larghezza */
        const hL = w => colH(oL, lRows, w), hR = w => colH(vR, rRows, w);
        const a1 = hL(1000) - hL(0), b1 = hL(0), a2 = hR(1000) - hR(0), b2 = hR(0);
        const avail = W - GAP * 2;
        const wl = ((b2 - b1) * 1000 + a2 * avail) / (a1 + a2);
        return { k, lRows, rRows, oL, vR, wl, fr: 1 - wl / avail };
      };
      const ok = pl => pl.fr >= .2 && pl.fr <= .5;
      const score = pl => (ok(pl) ? 0 : 1 + Math.min(Math.abs(pl.fr - .2), Math.abs(pl.fr - .5))) + Math.abs(pl.fr - .36) + (vRight.length % pl.k ? .05 : 0);
      for (const k of [1, 2, 3]){ const pl = plan(k, oLeft, vRight); if (!best || score(pl) < score(best)) best = pl; }
      /* troppe foto: quelle in più vanno sotto, a tutta larghezza */
      while (best.fr > .46 && oLeft.length > 1){ below.unshift(oLeft.pop()); best = plan(best.k, oLeft, vRight); }
      /* troppi verticali: quelli in più vanno sotto */
      while (best.fr < .22 && vRight.length > best.k){ for (let j = 0; j < best.k && vRight.length > best.k; j++) below.unshift(vRight.pop()); best = plan(best.k, oLeft, vRight); }
      const wl = Math.round(best.wl), wr = Math.round(W - GAP * 2 - wl);
      html = `<div class="pk-split"><div class="pk-col" style="width:${wl}px">${rowsHTML(best.oL, best.lRows)}</div><div class="pk-col" style="width:${wr}px">${rowsHTML(best.vR, best.rRows)}</div></div>`;
      if (below.length){
        const allV = below.every(it => it.a && it.a < .87);
        html += rowsHTML(below, rows(below, W, allV ? W * .36 : Math.min(Math.max(W * .34, 240), 620), allV ? 5 : 4), maxH);
      }
    }
    /* sposta gli elementi esistenti (i video restano gli stessi) */
    const keep = new Map(list.map(it => [it.id, it.el]));
    box.innerHTML = html;
    box.querySelectorAll("[data-pk]").forEach(ph => {
      const el = keep.get(ph.dataset.pk); if (!el) return;
      el.style.cssText = ph.style.cssText; ph.replaceWith(el);
    });
    box.dataset.w = W;
  }
  function pack(box){
    if (box._busy) return; box._busy = true;
    const figs = [...box.children];
    Promise.all(figs.map(aspect)).then(as => {
      box._items = figs.map((el, i) => ({ el, id: String(i), a: as[i], full: el.classList.contains("span2"),
        html: `<${el.tagName.toLowerCase()} data-pk="${i}"></${el.tagName.toLowerCase()}>` }));
      layout(box); box.classList.add("ok"); watchVideos();
    });
  }
  function packAll(){
    document.querySelectorAll(".pk:not(.ok)").forEach(b => { const acc = b.closest(".acc"); if (!acc || acc.classList.contains("open")) pack(b); });
  }
  let rsz;
  window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => document.querySelectorAll(".pk.ok").forEach(b => { if (+b.dataset.w !== b.clientWidth) layout(b); }), 150); });

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
    const n = (w.seasons || []).filter(s => s && ((s.episodes || []).length || s.label || s.title)).length;
    const si = Math.min(Math.max((parseInt(w.start_season, 10) || 1) - 1, 0), Math.max(n - 1, 0));
    const seasons = (w.seasons || []).filter(s => s && ((s.episodes || []).length || s.label || s.title)).map(s => ({ ...s, episodes: (s.episodes || []).filter(e => e && (e.title || e.url)) }));
    PODS[key] = seasons;
    return `<div class="pod" data-pod="${key}">
      <div class="pod-l">
        ${seasons.length > 1 ? `<div class="pod-pills">${seasons.map((s, i) => `<button type="button" class="pill" data-season="${i}" aria-pressed="${i === si}">Stagione ${pad(i + 1)}</button>`).join("")}</div>` : ""}
        <div class="pod-list">${podList(key, si, 0)}</div>
      </div>
      <div class="pod-r">${podPlayer(key, si, 0, false)}</div>
    </div>`;
  }
  function series(w, key){
    PODS[key] = [{ episodes: (w.episodes || []).filter(e => e && (e.title || e.url)) }];
    return `<div class="pod" data-pod="${key}">
      <div class="pod-l"><div class="pod-list">${podList(key, 0, 0)}</div></div>
      <div class="pod-r">${podPlayer(key, 0, 0, false)}</div>
    </div>`;
  }
  const epNum = (e, k) => { const n = String(e.number ?? "").trim(); return n ? esc(/^\d$/.test(n) ? "0" + n : n) : pad(k + 1); };
  function podList(key, si, ei){
    const s = PODS[key][si]; if (!s) return "";
    return `<ol class="pod-eps">${s.episodes.map((x, k) => `<li><button type="button" data-ep="${k}" data-season-of="${si}" aria-pressed="${k === ei}"><span>E${epNum(x, k)}</span><span>${esc(x.title)}${x.guest ? " — " + esc(x.guest) : ""}</span></button></li>`).join("")}</ol>`;
  }
  function podPlayer(key, si, ei, autoplay){
    const s = PODS[key][si]; if (!s) return "";
    const e = s.episodes[ei];
    const id = e ? ytId(e.url) : null;
    const player = id
      ? frame("youtube", `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}`, "16/9", e.title, YTA, e.url)
      : `<div class="emb pod-empty" style="--r:16/9"><span>${e ? "Video in arrivo" : "Nessun episodio"}</span></div>`;
    return `${player}<div class="pod-now">${e ? `E${epNum(e, ei)} ${esc(e.title)}${e.guest ? `<br><em>with</em> ${esc(e.guest)}` : ""}` : ""}</div>`;
  }

  /* ---------- Viste ---------- */
  function focus(p){
    const v = x => { const n = parseInt(x, 10); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50; };
    return `object-position:${v(p.cover_focus_x)}% ${v(p.cover_focus_y)}%`;
  }
  function tile(p){
    const i = idx(p);
    let cover = ph(i, "4/3");
    const yid = !p.cover_video && p.cover_youtube && ext ? ytId(p.cover_youtube) : null;
    if (p.cover_video) cover = `<video class="cover" style="${focus(p)}" data-auto src="${esc(p.cover_video)}" ${p.cover ? `poster="${esc(p.cover)}"` : ""} muted loop playsinline preload="none"></video>`;
    else if (yid){
      const tall = /\/shorts\//.test(p.cover_youtube);
      cover = `<span class="cover cvr${tall ? " tall" : ""}"${p.cover ? ` style="background:${focus(p).split(":")[1]}/cover url('${esc(p.cover)}')"` : ""}><iframe src="https://www.youtube-nocookie.com/embed/${yid}?autoplay=1&mute=1&loop=1&playlist=${yid}&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&fs=0" title="" tabindex="-1" aria-hidden="true" loading="lazy" allow="autoplay; encrypted-media"></iframe></span>`;
    }
    else if (p.cover) cover = `<img class="cover" style="${focus(p)}" src="${esc(p.cover)}" alt="" loading="${i < 4 ? "eager" : "lazy"}" decoding="async">`;
    return `<a class="tile" href="/work/${p.slug}">${cover}<span>${esc(p.client)}${p.subtitle ? SL + esc(p.subtitle) : ""}<br>${esc(p.category)}</span></a>`;
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
        ${works.length ? `<div class="works">${works.map((w, k) => `<section class="acc${w.open ? " open" : ""}">
            <button type="button" class="acc-h" data-acc aria-expanded="${!!w.open}"><span>${esc(w.title)}</span><span class="ic" aria-hidden="true"></span></button>
            <div class="acc-b"><div class="acc-in"><div class="acc-c">${paras(w.text)}${w.type === "podcast" ? podcast(w, `${p.slug}-${k}`) : w.type === "series" ? series(w, `${p.slug}-${k}`) : gallery(w.media, i + k * 3, w.layout)}</div></div></div>
          </section>`).join("")}</div>` : gallery(p.media, i, p.layout)}
        ${(() => { const x = (p.extra || []).map((m, k) => mediaItem(m, i + k)).filter(Boolean); return x.length ? `<div class="pk p-gal after"${p.layout === "rows" ? ' data-layout="rows"' : ""}>${x.join("")}</div>` : ""; })()}
        <nav class="pnav" aria-label="Progetti">
          <a class="back" href="${lastList}">Back to:<br><span class="nt">${lastList === "/archive" ? "Archive" : lastList === "/" || !filter ? "Portfolio" : esc(filter)}</span></a>
          ${PROJECTS.length > 1 ? `<a class="next" href="/work/${n.slug}">Next:<br><span class="nt">${head(n)}</span></a>` : ""}
        </nav>
      </article>`;
    },
    archive(){
      /* Indice di tutti i lavori: una riga per progetto, o per ogni striscia se il progetto ne ha */
      const rows = [];
      PROJECTS.forEach(p => {
        const works = (p.works || []).filter(w => w && w.title);
        const first = t => { const x = String(t || "").replace(/\s+/g, " ").trim(); return x; };
        if (works.length) works.forEach((w, k) => rows.push({ href: `/work/${p.slug}?s=${k}`, name: w.title, p, text: first(w.summary) || first(w.text) || first(p.summary) || first(p.description) }));
        else rows.push({ href: `/work/${p.slug}`, name: p.subtitle || p.client, p, text: first(p.summary) || first(p.description) });
      });
      rows.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
      return `<div class="view"><div class="arc" role="table">
        <div class="arc-r arc-hd" role="row"><span>N°</span><span>Name</span><span>Category</span><span>Client</span><span>Description</span><span>Year</span></div>
        ${rows.map((r, i) => `<a class="arc-r" role="row" href="${r.href}"><span>[${String(i + 1).padStart(3, "0")}]</span><span>${esc(r.name)}</span><span>${esc(catsOf(r.p).join(" / "))}</span><span>${esc(r.p.client)}</span><span class="arc-d"><span>${esc(r.text)}</span></span><span>${esc(r.p.year || "")}</span></a>`).join("")}
      </div></div>`;
    }
  };
  function contactBlock(){
    return `<div class="ctc i4">
        ${S.email ? `<p>New projects:<br><a href="mailto:${esc(S.email)}" data-mail>${esc(S.email)}</a><br><button type="button" class="pill" data-copy style="margin-top:.3em">Copy</button></p>` : ""}
        ${S.address ? `<p>Studio:<br>${lines(S.address)}</p>` : ""}
        ${S.instagram_url ? `<p>Instagram:<br><a href="${esc(S.instagram_url)}" target="_blank" rel="noopener">${esc(S.instagram_handle || "Instagram")}</a></p>` : ""}
      </div>
      <div class="ct-priv"><button type="button" class="pill" id="privBtn" aria-expanded="false" data-priv>Privacy</button>
        <div class="priv" id="priv" hidden>${paras(S.privacy || "")}<p><button type="button" class="pill" data-cookie-prefs>Cookie preferences</button></p></div>
      </div>`;
  }

  /* ---------- Parti fisse: About, footer ---------- */
  function contacts(){ return `<div class="i4">
        <div>${lines(S.address)}</div>
        <div style="grid-column:span 2">${S.email ? `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : ""}${S.instagram_url ? `${S.email ? "<br>" : ""}<a href="${esc(S.instagram_url)}" target="_blank" rel="noopener">Instagram</a>` : ""}</div>
      </div>`; }
  /* Un cliente in About diventa un link se esiste un progetto con lo stesso nome */
  function clientLink(c){
    const p = PROJECTS.find(x => slugify(x.client) === slugify(c));
    return p ? `<a href="/work/${p.slug}">${esc(c)}</a>` : esc(c);
  }
  function renderChrome(){
    const team = (S.team || []).filter(t => t && t.name);
    $("#infoContent").innerHTML = `
      <div class="i2">
        <div>${paras(S.about)}</div>
        <div>
          ${S.services?.length ? `<p>Services → ${S.services.map(esc).join(SL)}</p>` : ""}
          ${S.clients?.length ? `<p>Clients → ${S.clients.map(clientLink).join(SL)}</p>` : ""}
        </div>
      </div>
      ${S.contacts_in_about ? contacts() : ""}
      <div class="ipills">${team.length ? `<button type="button" class="pill" id="teamBtn" aria-expanded="false">Team</button>` : ""}<button type="button" class="pill" id="ctBtn" aria-expanded="false">Contact</button></div>
      ${team.length ? `<div class="team" id="team" hidden>${team.map(t => `${esc(t.name)}${t.role ? " — " + esc(t.role) : ""}`).join("<br>")}</div>` : ""}
      <div class="ct" id="ct" hidden>${contactBlock()}</div>`;
    $("#foot").innerHTML = `<div>${S.name ? esc(S.name) + "<br>" : ""}${lines(S.address)}</div>
      <div>${S.email ? `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : ""}${S.instagram_url ? `${S.email ? "<br>" : ""}<a href="${esc(S.instagram_url)}" target="_blank" rel="noopener">${esc(S.instagram_handle || "Instagram")}</a>` : ""}</div>`;
    const vat = (S.vat || []).filter(v => v && v.number);
    if (vat.length) $("#foot > div").insertAdjacentHTML("beforeend", `<br>P.IVA ${vat.map(v => esc(v.number)).join(" — ")}`);
    if (S.instagram_url) $("#dockIg").href = S.instagram_url;
    const tb = $("#teamBtn");
    if (tb) tb.addEventListener("click", () => { const t = $("#team"); t.hidden = !t.hidden; tb.setAttribute("aria-expanded", !t.hidden); });
    $("#ctBtn").addEventListener("click", () => showContact($("#ct").hidden));
  }
  function showContact(open){ const c = $("#ct"), b = $("#ctBtn"); if (!c) return; c.hidden = !open; b.setAttribute("aria-expanded", open); }

  function showPrivacy(open){ const p = $("#priv"), b = $("#privBtn"); if (!p) return; p.hidden = !open; b.setAttribute("aria-expanded", open); }

  /* Banner dei cookie: Accetta e Rifiuta con lo stesso peso */
  function banner(show){
    let el = $("#cookie");
    if (!show){ if (el) el.hidden = true; return; }
    if (!el){
      el = document.createElement("div"); el.id = "cookie"; el.className = "cookie"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Cookie");
      el.innerHTML = `<p>Questo sito mostra video e post di YouTube, Vimeo e Instagram, che possono usare cookie propri. Li carichiamo solo se accetti.</p>
        <div class="cookie-b"><button type="button" class="pill" data-consent="1">Accetta</button><button type="button" class="pill" data-consent="0">Rifiuta</button><a class="pill" href="/privacy">Privacy</a></div>`;
      document.body.appendChild(el);
    }
    el.hidden = false;
  }
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-consent]");
    if (c){ const yes = c.dataset.consent === "1"; const was = ext; setExt(yes); banner(false); if (yes) loadAll(); else if (was) route(); return; }
    if (e.target.closest("[data-cookie-prefs]")) banner(true);
    if (e.target.closest("[data-load-ext]")){ setExt(true); banner(false); loadAll(); }
  });

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
    go("/");
  });

  fbtn.addEventListener("click", () => { fbar.hidden = !fbar.hidden; fbtn.setAttribute("aria-expanded", !fbar.hidden); fillBar(); });
  fbar.addEventListener("click", e => {
    const f = e.target.closest("[data-f]"); if (!f) return;
    const c = f.dataset.f || null;
    if (!c){ fbar.hidden = true; fbtn.setAttribute("aria-expanded", "false"); }
    go(c ? "/category/" + slugify(c) : "/");
  });

  /* Video in loop: partono solo quando sono sullo schermo, così la pagina resta leggera */
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting){ if (v.preload !== "auto") v.preload = "auto"; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else v.pause();
  }), { rootMargin: "200px 0px" }) : null;
  function watchVideos(){ document.querySelectorAll("video[data-auto]").forEach(v => { if (v.dataset.watched) return; v.dataset.watched = "1"; if (io) io.observe(v); else { v.autoplay = true; v.play().catch(() => {}); } }); }
  document.addEventListener("click", e => { if (e.target.closest(".acc-h")) setTimeout(watchVideos, 50); });

  /* Router */
  /* Indirizzi veri: /work/nome-progetto, /contact, /privacy, /about */
  function go(path){ if (location.pathname + location.search + location.hash !== path) history.pushState(null, "", path); route(); }
  function route(){
    const old = decodeURIComponent(location.hash.slice(1));
    if (old){ /* vecchi link con # */
      const map = { home: "/", contact: "/contact", privacy: "/privacy", about: "/about" };
      const to = old.startsWith("p-") ? "/work/" + old.slice(2) : map[old];
      if (to){ history.replaceState(null, "", to); }
    }
    const path = decodeURIComponent(location.pathname).replace(/\/+$/, "") || "/";
    let h = path === "/" ? "home" : path.startsWith("/work/") ? "p-" + path.slice(6) : path.slice(1);
    if (path === "/") filter = null;
    if (path.startsWith("/category/")){ const sl = path.slice(10); filter = cats().find(c => slugify(c) === sl) || null; h = "home"; }
    if (h === "home") lastList = filter ? "/category/" + slugify(filter) : "/";
    fillBar();
    let key = "home", html;
    if (h === "about"){ setAbout(true); html = VIEWS.home(); }
    else if (h === "contact" || h === "privacy"){ setAbout(true); showContact(true); if (h === "privacy") showPrivacy(true); html = VIEWS.home(); }
    else if (h === "archive"){ key = "archive"; lastList = "/archive"; html = VIEWS.archive(); }
    else if (h.startsWith("p-") && bySlug(h.slice(2))){ key = "project"; const p = bySlug(h.slice(2)); html = VIEWS.project(p); document.title = `${p.client} — ${S.name || "Limun Studio Design"}`; }
    else html = VIEWS.home();
    if (key !== "project") document.title = (key === "home" && filter ? filter + " — " : "") + (S.name || "Limun Studio Design");
    if (key !== "home"){ fbar.hidden = true; fbtn.setAttribute("aria-expanded", "false"); }
    document.body.dataset.view = key;
    app.innerHTML = html;
    watchVideos(); packAll();
    document.querySelectorAll("[data-nav]").forEach(a => a.dataset.nav === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    window.scrollTo(0, 0);
    if (key === "project"){ const k = new URLSearchParams(location.search).get("s"); const sec = k !== null ? app.querySelectorAll(".acc")[+k] : null;
      if (sec){ if (!sec.classList.contains("open")){ sec.classList.add("open"); sec.querySelector("[data-acc]").setAttribute("aria-expanded", "true"); packAll(); watchVideos(); } setTimeout(() => sec.scrollIntoView({ block: "start" }), 60); } }
  }
  window.addEventListener("popstate", route);
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href^='/']");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const href = a.getAttribute("href");
    if (/^\/(admin|media|assets|content)(\/|$)/.test(href)) return;
    e.preventDefault(); go(href);
  });

  app.addEventListener("click", e => {
    const a = e.target.closest("[data-acc]");
    if (a){ const s = a.parentElement, open = !s.classList.contains("open"); s.classList.toggle("open", open); a.setAttribute("aria-expanded", open); if (open) packAll(); return; }
    const sb = e.target.closest("[data-season]");
    if (sb){
      const pod = sb.closest("[data-pod]");
      pod.querySelectorAll("[data-season]").forEach(b => b.setAttribute("aria-pressed", b === sb));
      pod.querySelector(".pod-list").innerHTML = podList(pod.dataset.pod, +sb.dataset.season, 0);
      pod.querySelector(".pod-r").innerHTML = podPlayer(pod.dataset.pod, +sb.dataset.season, 0, false);
      return;
    }
    const eb = e.target.closest("[data-ep]");
    if (eb){
      const pod = eb.closest("[data-pod]");
      pod.querySelectorAll("[data-ep]").forEach(b => b.setAttribute("aria-pressed", b === eb));
      pod.querySelector(".pod-r").innerHTML = podPlayer(pod.dataset.pod, +eb.dataset.seasonOf, +eb.dataset.ep, true);
      return;
    }
  });
  document.addEventListener("click", e => {
    if (e.target.closest("[data-priv]")){ showPrivacy($("#priv").hidden); return; }
    const c = e.target.closest("[data-copy]");
    if (c){
      const done = () => { c.textContent = "Copied"; setTimeout(() => c.textContent = "Copy", 1500); };
      const fallback = () => { const m = $("[data-mail]"); const r = document.createRange(); r.selectNodeContents(m); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(S.email).then(done, fallback); } catch (err){ fallback(); }
    }
  });

  /* Archive: la descrizione scorre quando passi sopra alla riga */
  document.addEventListener("mouseover", e => {
    const r = e.target.closest("a.arc-r"); if (!r || r.dataset.mq) return;
    const box = r.querySelector(".arc-d"), t = box && box.firstElementChild; if (!t) return;
    r.dataset.mq = "1";
    const d = t.scrollWidth - box.clientWidth;
    if (d > 4){ box.style.setProperty("--d", -d - 16 + "px"); box.style.setProperty("--s", Math.max(2, d / 60) + "s"); box.classList.add("mq"); }
    r.addEventListener("mouseleave", () => { box.classList.remove("mq"); delete r.dataset.mq; }, { once: true });
  });

  /* Caricamento contenuti */
  async function load(){
    try {
      const [p, s] = await Promise.all([
        fetch("/content/projects.json", { cache: "no-cache" }).then(r => r.json()),
        fetch("/content/settings.json", { cache: "no-cache" }).then(r => r.json())
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
    if (choice === null) banner(true);
  }
  load();
})();
