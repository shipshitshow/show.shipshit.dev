#!/usr/bin/env python3
"""Build the youtube:update batch file for the channel clean-up (no network).
Usage: python3 -I build_updates.py <snapshot main-latest.json> <out updates.json>
- Livestream archives: add a CHAPTERS block (before a trailing hashtag line) and, only where tags are empty, 5-10 tags.
- 8 main-channel Shorts: second description line "Full episode: <url>".
Skips ppcMDBiJ5xc (owned by another thread). Prints a plan; changes nothing on YouTube."""
import json,re,sys,os
snap=json.load(open(sys.argv[1])); out=sys.argv[2]
here=os.path.dirname(os.path.abspath(__file__))
tags=json.load(open(here+'/tags.json'))
SKIP={'ppcMDBiJ5xc'}
SHORTS={ # short id -> episode id (content verified by transcript overlap, 10 Nov)
 'ypW0neOBhKU':'1CFi5rzc2bU','thX_6dhGV8A':'1CFi5rzc2bU','1Rd82x8x-dI':'1CFi5rzc2bU','S8dj5sYSLAU':'1CFi5rzc2bU',
 'lmLaYAEpFDc':'qAw_zC1_BDM','AEXZ4Q9TeJo':'qAw_zC1_BDM','gR_daNttW88':'qAw_zC1_BDM','9QP3Ed6BHVs':'qAw_zC1_BDM'}
vids={v['id']:v for v in snap['videos']}
ups=[];notes=[]
def is_hash(l): return bool(l.strip()) and all(w.startswith('#') for w in l.split())
for f in sorted(os.listdir(here+'/chapters')):
    vid=f[:-4]
    if vid in SKIP or vid not in vids: notes.append(('missing/skipped',vid)); continue
    v=vids[vid]; ch=open(here+'/chapters/'+f).read().strip()
    d=v['description'] or ''
    u={'id':vid}
    if re.search(r'(?m)^\s*0:00\b',d): notes.append(('has chapters',vid))
    else:
        lines=d.rstrip().split('\n')
        block='CHAPTERS:\n'+ch
        if lines and is_hash(lines[-1]):
            nd='\n'.join(lines[:-1]).rstrip()+'\n\n'+block+'\n\n'+lines[-1]
        else: nd=d.rstrip()+('\n\n' if d.strip() else '')+block
        if len(nd.encode())>5000: notes.append(('too long',vid))
        else: u['description']=nd
    if not v['tags'] and vid in tags: u['tags']=tags[vid]['tags']
    if len(u)>1: ups.append(u)
for sid,ep in SHORTS.items():
    v=vids.get(sid)
    if not v: notes.append(('short missing',sid)); continue
    if v['privacyStatus']!='public': notes.append(('short not public',sid)); continue
    lines=[l for l in (v['description'] or '').split('\n') if not l.startswith('Full episode:')]
    first=lines[0] if lines else ''
    rest=lines[1:]
    nd='\n'.join([first,'Full episode: https://www.youtube.com/watch?v='+ep]+rest)
    if nd!=v['description']: ups.append({'id':sid,'description':nd})
json.dump(ups,open(out,'w'),indent=1,ensure_ascii=False)
print(len(ups),'videos in batch');[print(*n) for n in notes]
