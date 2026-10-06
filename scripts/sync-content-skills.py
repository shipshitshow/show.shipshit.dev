#!/usr/bin/env python3
"""Sync public skill contracts into app adapters without a runtime sibling dependency."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,subprocess
parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True,help='Checkout of shipshitshow/skills')
parser.add_argument('--check',action='store_true')
args=parser.parse_args();source=args.source.resolve();root=Path(__file__).resolve().parents[1]
mapping={'talking-points':'prep','youtube-metadata':'metadata','thumbnail-prompt-variations':'thumbnails'}
errors=[];lock={}
for src,dst in mapping.items():
 s=source/src;d=root/'skills'/dst
 body=(s/'SKILL.md').read_text().replace('name: '+src+'\n','name: '+dst+'\n',1)
 interface=(s/'agents/openai.yaml').read_text().replace('$'+src,'$'+dst)
 interface=re.sub(r'(?m)^(\s*display_name: ).*$',lambda match:match[1]+'"'+dst.capitalize()+'"',interface)
 expected={Path('SKILL.md'):body.encode(),Path('agents/openai.yaml'):interface.encode()}
 for p in (s/'references').glob('*.md'):expected[Path('references')/p.name]=p.read_bytes()
 if src=='youtube-metadata':expected[Path('scripts/analyze-vault-performance.js')]=(s/'scripts/analyze-vault-performance.js').read_bytes()
 for relative,content in expected.items():
  target=d/relative
  if args.check:
   if not target.is_file() or target.read_bytes()!=content:errors.append(str(target))
  else:
   target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
 lock[dst]={'source':'https://github.com/shipshitshow/skills/tree/master/'+src,'contract_sha256':hashlib.sha256((s/'SKILL.md').read_bytes()).hexdigest(),'profile_sha256':hashlib.sha256((s/'references/channel-profile.md').read_bytes()).hexdigest()}
if args.check:
 if json.loads((root/'skills/content-skills.lock.json').read_text())!=lock:errors.append('content-skills.lock.json')
 if errors:parser.exit(1,'Contract drift: '+', '.join(errors)+'\n')
else:(root/'skills/content-skills.lock.json').write_text(json.dumps(lock,indent=2,sort_keys=True)+'\n')
print('Content contracts match the supplied public skills checkout.')
