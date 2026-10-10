# Número de versão: sobe sozinho quando o código muda. Notas da versão em standalone/notes.txt (uma por linha).
import hashlib, json, glob, datetime, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
h = hashlib.sha1()
for f in sorted(glob.glob('js/*.js') + glob.glob('css/*.css') + ['standalone/update.js', 'standalone/cloud.js', 'index.html']): h.update(open(f, 'rb').read())
h = h.hexdigest()[:12]
V = json.load(open('standalone/version.json'))
notes = [l.strip() for l in open('standalone/notes.txt') if l.strip()] if os.path.exists('standalone/notes.txt') else []
if V.get('hash') != h:
    V['n'] = V.get('n', 0) + (1 if V.get('hash') else 0); V['hash'] = h; V['date'] = datetime.date.today().strftime('%d/%m/%Y'); V['notes'] = notes
    json.dump(V, open('standalone/version.json', 'w'), ensure_ascii=False, indent=1)
print('window.OCEANUM_VERSION=' + json.dumps({'v': ('2.%d' % (V['n'] - 100)) if V['n'] >= 100 else ('1.%d' % V['n']), 'date': V.get('date', ''), 'notes': V.get('notes', [])}, ensure_ascii=False) + ';')
