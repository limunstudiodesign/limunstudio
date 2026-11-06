# Sito Limun Studio Design

Il sito è statico: non serve nessuna compilazione.

- `index.html`, `assets/`: il sito.
- `content/projects.json`: i progetti, nell'ordine del portfolio.
- `content/settings.json`: About, servizi, clienti, team e contatti.
- `media/`: foto e video caricati dal pannello.
- `admin/`: il pannello di modifica (Sveltia CMS).

## Modificare i contenuti

1. Apri `https://<indirizzo-del-sito>/admin`.
2. Accedi con la chiave personale GitHub (fine-grained token con permesso **Contents: Read and write** sul repository `limun-sito`).
3. Modifica, salva: il sito si aggiorna da solo in circa un minuto.

Le foto caricate vengono convertite in WebP e ridotte a 2400 px di larghezza. I file non possono superare 25 MB: per i video lunghi usa YouTube o Vimeo.

## Al lancio su limunstudiodesign.com

- Togliere la riga `<meta name="robots" ...>` da `index.html`.
- Togliere il blocco `X-Robots-Tag` da `_headers`.
- Sostituire `robots.txt` con `User-agent: *` e `Allow: /`.
- Aggiornare `site_url` in `admin/config.yml`.
