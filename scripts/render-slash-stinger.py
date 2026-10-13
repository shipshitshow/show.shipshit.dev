#!/usr/bin/env python3
"""Render the slash wipe as a transparent OBS stinger (WebM VP9 alpha, optional ProRes 4444) and an opaque preview."""
from pathlib import Path
import argparse,math,subprocess,tempfile
from PIL import Image,ImageChops,ImageDraw

parser=argparse.ArgumentParser()
parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parents[1]/'out/broadcast')
parser.add_argument('--fps',type=int,default=60)
parser.add_argument('--prores',action='store_true',help='Also write a ProRes 4444 .mov for editors (large)')
args=parser.parse_args()

W,H,SS=1920,1080,2
RED,IVORY,BLACK,PANEL=(255,45,32),(243,235,221),(13,13,13),(28,28,28)
SKEW=math.tan(math.radians(18))*H/2
STRIPE=2400
START,COVER,END=-(STRIPE/2+SKEW)-20,W/2,W+STRIPE/2+SKEW+20
f=args.fps/60
IN,DELAY,HOLD,OUT=round(22*f),round(4*f),round(2*f),round(24*f)
COVERED=DELAY+IN
TRANSITION_FRAME=COVERED+HOLD//2+1
FRAMES=COVERED+HOLD+OUT+1

def bezier(x,p1x=.76,p1y=0,p2x=.24,p2y=1):
 lo,hi=0.,1.
 for _ in range(40):
  t=(lo+hi)/2;bx=3*(1-t)**2*t*p1x+3*(1-t)*t*t*p2x+t**3
  lo,hi=(t,hi) if bx<x else (lo,t)
 t=(lo+hi)/2;return 3*(1-t)**2*t*p1y+3*(1-t)*t*t*p2y+t**3

def ease(a,b,t):return a+(b-a)*bezier(min(max(t,0),1))

def ivory_center(t):return ease(START,COVER,t/IN) if t<=COVERED else None

def red_center(t):
 if t<DELAY:return START
 if t<=COVERED:return ease(START,COVER,(t-DELAY)/IN)
 if t<=COVERED+HOLD:return COVER
 return ease(COVER,END,(t-COVERED-HOLD)/OUT)

def mask(centers):
 layers=[]
 for c in centers:
  m=Image.new('L',(W*SS,H*SS))
  if c is not None:
   x=lambda v:v*SS
   ImageDraw.Draw(m).polygon([(x(c-STRIPE/2+SKEW),0),(x(c+STRIPE/2+SKEW),0),(x(c+STRIPE/2-SKEW),H*SS),(x(c-STRIPE/2-SKEW),H*SS)],fill=255)
  layers.append(m)
 blurred=layers[0]
 for k,m in enumerate(layers[1:],2):blurred=Image.blend(blurred,m,1/k)
 return blurred.resize((W,H),Image.BOX)

def layer(color,noise,alpha):
 flat=Image.new('RGB',(W,H),color)
 grain=Image.merge('RGB',[ImageChops.add(Image.new('L',(W,H),v),noise,1,-128) for v in color])
 out=Image.composite(grain,flat,alpha.point(lambda v:255 if v else 0)).convert('RGBA');out.putalpha(alpha)
 return out

def frame(t):
 shutter=[t-.25+k/14 for k in range(8)]
 noise=grain_plates[(t//max(1,round(2*f)))%len(grain_plates)]
 ivory=layer(IVORY,noise,mask([ivory_center(s) for s in shutter]))
 red=layer(RED,noise,mask([red_center(s) for s in shutter]))
 return Image.alpha_composite(ivory,red)

def scene(after):
 s=Image.new('RGBA',(W,H),BLACK+(255,));d=ImageDraw.Draw(s)
 if after:
  d.rectangle((154,430,154+1100,430+90),fill=IVORY);d.rectangle((154,560,154+110,568),fill=RED)
 else:
  d.rounded_rectangle((77,108,77+868,108+880),16,fill=PANEL);d.rounded_rectangle((975,108,975+868,108+880),16,fill=PANEL)
 return s

grain_plates=[Image.effect_noise((W,H),7) for _ in range(6)]

def ffmpeg(*a):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*a],check=True)

args.out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
 tmp=Path(tmp);(tmp/'s').mkdir();(tmp/'p').mkdir()
 a,b=scene(False),scene(True);pad=round(20*f);n=0
 for _ in range(pad):a.save(tmp/'p'/f'{n:04d}.png');n+=1
 for t in range(FRAMES):
  fr=frame(t);fr.save(tmp/'s'/f'{t:04d}.png')
  Image.alpha_composite(a if t<TRANSITION_FRAME else b,fr).save(tmp/'p'/f'{n:04d}.png');n+=1
 for _ in range(pad*2):b.save(tmp/'p'/f'{n:04d}.png');n+=1
 src=['-framerate',str(args.fps),'-i',str(tmp/'s'/'%04d.png')]
 ffmpeg(*src,'-c:v','libvpx-vp9','-pix_fmt','yuva420p','-crf','32','-b:v','0','-auto-alt-ref','0',str(args.out/'slash-stinger.webm'))
 if args.prores:ffmpeg(*src,'-c:v','prores_ks','-profile:v','4444','-pix_fmt','yuva444p10le','-vendor','apl0',str(args.out/'slash-stinger.mov'))
 ffmpeg('-framerate',str(args.fps),'-i',str(tmp/'p'/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18',str(args.out/'slash-stinger-preview.mp4'))
print(f'Rendered {FRAMES} frames at {args.fps} fps into {args.out}. OBS transition point: {round(TRANSITION_FRAME*1000/args.fps)} ms.')
