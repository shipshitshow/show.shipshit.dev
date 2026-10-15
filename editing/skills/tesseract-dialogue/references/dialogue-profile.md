# Local recap profile: measured example, not a universal preset

The September 29 recording used 48 kHz stereo derivatives. The speakers were
highly correlated; NARA-WPE was applied to selected speech domains at 16 kHz with
FFT 512, hop 128, 20 taps, delay 3, three iterations and 30% wet mix, then restored
to the source rate. Demonstrations and selected stereo ranges were bypassed.
Measured latency was compensated by 1200 source samples (25 ms).

The recorded FFmpeg chain was:

```text
afftdn=nr=5:nf=-65:tn=1:gs=5,
highpass=f=75:p=2,
equalizer=f=280:t=q:w=0.9:g=-1.8,
equalizer=f=3200:t=q:w=0.8:g=1.2,
acompressor=threshold=0.126:ratio=2.5:attack=18:release=180:makeup=1:knee=2.8,
deesser=i=0.15:m=0.25:f=0.5
```

For the closing impulses only:

```text
adeclick=w=55:o=75:a=2:t=2.5:b=1:m=add
```

The repair had source handles and 250 ms eased boundaries. Output sample count
and measured repair delay were checked. This does not establish audible repair
quality; listening was unavailable.

Music was locally synthesized without vocals/drums. Its editable gain envelope
used approximately 50 ms attack, 350 ms release, 2 seconds in and 4 seconds out,
with demo dropouts. Dialogue/music balance measured about 20–23 dB apart.

Final AAC measured -15.15 LUFS and -1.68 dBTP. A measured native AAC offset was
compensated at mastering; measure new renders rather than applying it blindly.

Evidence in this workspace:
- projects/260929/final/audio-treatment.md
- projects/260929/versions/v002/audio-treatment.md
- projects/260929/outputs/work/audio-recipe-v2.json
- projects/260929/outputs/work/audio-recipe-v3.json
- projects/260929/outputs/work/v3-final-audio-check.json
- projects/260929/outputs/work/v3-mix-balance.json

The preserved scripts show the episode's implementation and hardcoded domains.
Copy/adapt them into a new project's outputs/work before use. Tune to the new
source, keep raw media unchanged and perform actual listening when available.
