// Dominio ufficiale (limunstudiodesign.com) mentre è attiva la landing temporanea:
// - www rimanda all'indirizzo senza www
// - i vecchi indirizzi del sito Wix e le pagine non ancora pronte rimandano alla landing
// Su limunstudio.pages.dev invece si vede tutto il sito in lavorazione.
const LIVE = "limunstudiodesign.com";
const OPEN = ["/", "/about", "/contact", "/privacy"];

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.hostname === "www." + LIVE) return Response.redirect(`https://${LIVE}${url.pathname}${url.search}`, 301);
  if (url.hostname !== LIVE) return next();
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (/\.[a-z0-9]+$/i.test(path)) return next();
  let s = {};
  try { s = await env.ASSETS.fetch(new URL("/content/settings.json", url)).then(r => r.json()); } catch (e) {}
  if (!s.landing) return next();
  if (path === "/privacy-policy") return Response.redirect(`https://${LIVE}/privacy`, 301);
  if (!OPEN.includes(path)) return Response.redirect(`https://${LIVE}/`, 301);
  return next();
}
