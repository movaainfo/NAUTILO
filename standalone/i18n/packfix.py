# arruma os dicionários depois de gerados: no português do Brasil tira o que ficou igual (o app mostra o original)
# e as frases em que a tradução perdeu um {n}; nas outras línguas tira só as que perderam um {n} que não está colado a uma palavra
import json, re, glob, os
for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'packs', '*.json'))):
    d = json.load(open(f)); m = d['m']; n0 = len(m); l = d.get('l')
    ph = lambda s: sorted(re.findall(r'\{\d+\}', s))
    if l == 'pt-BR': m = {k: v for k, v in m.items() if k != v and ph(k) == ph(v)}
    d['m'] = m; json.dump(d, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(l, n0, '→', len(m))
