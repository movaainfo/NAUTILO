# Gera dist-gh/: o Prumo num único index.html (CSS e JS embutidos) + manifesto, service worker, config e ícones na raiz.
import re, os, shutil, hashlib
src = 'dist'; out = 'dist-gh'
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
html = open(f'{src}/index.html').read()
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + open(f'{src}/{m.group(1)}').read() + '\n</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + open(f'{src}/{m.group(1)}').read().replace('</script', '<\\/script') + '\n</script>', html)
html = html.replace('href="icons/', 'href="')
open(f'{out}/index.html', 'w').write(html)
man = open(f'{src}/manifest.webmanifest').read().replace('icons/', '')
open(f'{out}/manifest.webmanifest', 'w').write(man)
for f in os.listdir(f'{src}/icons'): shutil.copy(f'{src}/icons/{f}', out)
for f in ['config.js', 'LANCAR.md', 'firestore.rules']: shutil.copy(f'{src}/{f}', out)
if os.path.isdir(f'{src}/vendor'): shutil.copytree(f'{src}/vendor', f'{out}/vendor')
# funções do Vercel (cotações de reserva)
if os.path.isdir('standalone/api'): shutil.copytree('standalone/api', f'{out}/api')
shutil.copy('standalone/vercel.json', f'{out}/vercel.json')
# páginas públicas dos documentos legais (/privacidade, /termos…)
import subprocess; subprocess.run(['node', 'standalone/legalpages.js', out], check=True)
files = ['manifest.webmanifest'] + sorted(x for x in os.listdir(out) if x.endswith('.png')) + (['vendor/fonts/' + x for x in sorted(os.listdir(f'{out}/vendor/fonts'))] if os.path.isdir(f'{out}/vendor/fonts') else [])
ver = hashlib.sha1(html.encode()).hexdigest()[:10]
sw = open('standalone/sw.js').read().replace('__VERSION__', ver).replace('__FILES__', '[' + ','.join(f'"{x}"' for x in files) + ']')
open(f'{out}/sw.js', 'w').write(sw)
print('dist-gh pronto:', sorted(os.listdir(out)), round(os.path.getsize(f'{out}/index.html') / 1024), 'KB')
