#!/usr/bin/env bash
# Monta a versão independente do Prumo em dist/ (pronta para Netlify, Vercel, GitHub Pages ou qualquer alojamento estático).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist; rm -rf "$OUT"; mkdir -p "$OUT/js" "$OUT/css" "$OUT/icons"
cp js/*.js "$OUT/js/"; cp css/*.css "$OUT/css/"
cp standalone/update.js "$OUT/js/update.js"
VERJS=$(python3 standalone/version.py)
cp standalone/cloud.js "$OUT/js/cloud.js"
[ -f "$OUT/config.js" ] || cp standalone/config.js "$OUT/config.js"
[ -f standalone/config.local.js ] && cp standalone/config.local.js "$OUT/config.js"
cp standalone/icons/* "$OUT/icons/"
mkdir -p "$OUT/vendor" && cp -r standalone/vendor/. "$OUT/vendor/"
# línguas: a lista dos textos do app (para a IA do servidor traduzir) e os dicionários que vêm com o app
mkdir -p "$OUT/i18n"; NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}" I18N_SKIP=brands.js,fastfood.js node standalone/i18n/extract.js && cp standalone/i18n/strings.json "$OUT/i18n/"
[ -d standalone/i18n/packs ] && cp standalone/i18n/packs/*.json "$OUT/i18n/" 2>/dev/null || true
BODY=$(sed -e '/<title>/d' -e '/os2lite/d' -e '/rel="preconnect"/d' -e '/fonts.googleapis.com\/css2/d' -e '/<link rel="stylesheet"/d' index.html \
  | sed -e 's#<script src="js/app.js"></script>#<script src="js/cloud.js"></script>\n<script src="js/app.js"></script>#')
CSS=$(grep '<link rel="stylesheet" href="css/' index.html)
cat > "$OUT/index.html" <<HTML
<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prumo</title>
<meta name="description" content="Prumo — o sistema operativo da tua vida: finanças, estudos, treino, dieta, metas e o jogo Dominus.">
<meta name="theme-color" content="#070D16">
<meta name="color-scheme" content="dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Prumo">
<meta name="robots" content="noindex,nofollow">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
$CSS
<style>[hidden]{display:none!important}</style>
<script>$VERJS</script>
$(grep os2lite index.html)
<script src="config.js"></script>
<script src="js/update.js"></script>
</head>
<body>
$BODY
<script>if ('serviceWorker' in navigator && window.isSecureContext) { const had = !!navigator.serviceWorker.controller; let r = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !r) { r = true; window.OceanumUpdating ? OceanumUpdating() : location.reload(); } }); addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(reg => { reg.update(); document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }); setInterval(() => reg.update(), 30 * 60 * 1000); }).catch(() => { })); }</script>
</body>
</html>
HTML
cat > "$OUT/manifest.webmanifest" <<'JSON'
{
  "name": "Prumo",
  "short_name": "Prumo",
  "description": "O sistema operativo da tua vida.",
  "lang": "pt",
  "start_url": "./#visao",
  "scope": "./",
  "display": "standalone",
  "background_color": "#070D16",
  "theme_color": "#070D16",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Gasto rápido", "short_name": "Gasto", "url": "./#gasto", "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }] },
    { "name": "Registar refeição", "short_name": "Dieta", "url": "./#dieta", "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }] },
    { "name": "Dominus", "short_name": "Jogo", "url": "./#dominus", "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }] }
  ]
}
JSON
FILES=$(cd "$OUT" && find . -type f ! -name sw.js ! -name config.js ! -name 'xlsx.full.min.js' ! -name _headers ! -name netlify.toml ! -name _redirects ! -name firestore.rules ! -name LANCAR.md | sort | sed 's#^\./##' | awk 'BEGIN{printf "[\"./\""} {printf ",\"%s\"", $0} END{printf "]"}')
VER=$(cd "$OUT" && cat $(find . -type f ! -name sw.js | sort) | sha1sum | cut -c1-10)
sed -e "s#__VERSION__#$VER#" -e "s#__FILES__#$FILES#" standalone/sw.js > "$OUT/sw.js"
cp standalone/_headers standalone/firestore.rules standalone/LANCAR.md "$OUT/"
echo "dist/ pronto · versão $VER · $(find "$OUT" -type f | wc -l) ficheiros"
