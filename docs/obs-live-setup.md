# OBS live setup

How the livestream runs without Restream: the cohost joins through VDO.Ninja, OBS
builds every scene and plays the slash wipe on each scene change, and OBS sends the
program directly to YouTube, Kick and LinkedIn.

```
Cohost browser ──VDO.Ninja──▶ OBS (scenes + slash stinger) ──▶ YouTube  (OBS main output)
                                                            ├─▶ Kick     (obs-multi-rtmp target)
                                                            └─▶ LinkedIn (obs-multi-rtmp target)
```

Verified on the Mac Studio, 2026-10-13: OBS 32.1.0 with `obs-multi-rtmp` already
installed. Platform menus move often; check each platform's current settings page
when a path below no longer matches.

## 1. Slash wipe stinger

Render it, then keep the WebM somewhere outside the worktree, because OBS stores an
absolute path:

```bash
python3 scripts/render-slash-stinger.py --out ~/Movies/shipshitshow/broadcast
```

It writes `slash-stinger.webm` (transparent VP9, 1920×1080, 60 fps, 0.88 s) and
`slash-stinger-preview.mp4` (the wipe over two placeholder scenes). Add `--prores`
for a ProRes 4444 `.mov` when an editor needs it. Requires Python with Pillow and an
ffmpeg build with `libvpx-vp9`.

In OBS, open the Scene Transitions dock, click `+`, choose **Stinger** and name it
`Slash`:

- Video file: `slash-stinger.webm`
- Transition point type: Time (milliseconds), **467**. The red stripe covers the whole
  frame there, so the scene swap is hidden.
- Audio monitoring: none (the file has no audio).

Make `Slash` the default transition. The renderer prints the transition point; use
the new value if the timing constants change.

## 2. Cohost through VDO.Ninja

1. On vdo.ninja, choose **Create a Room**. Set a room name and a director password.
2. Send the cohost the **guest invite link**. They open it in Chrome, allow camera and
   microphone and join. No install or account.
3. Copy the cohost's **solo/scene link** from the director view. In OBS add a
   **Browser** source with that link, 1920×1080, and tick **Control audio via OBS**.
4. The host joins the same room as a guest too, so both hear each other.
5. Both hosts wear headphones; open speakers feed the other host's voice back into
   the stream.

Each extra guest is one more invite and one more Browser source.

## 3. Scenes

Keep scenes few and named for the run of show, for example `Intro`, `Both hosts`,
`Host + screen`, `Topic card`, `Outro`. Put the host cam, the cohost Browser source
and the microphone in a group or nested scene so every scene reuses the same sources.

## 4. Destinations

Set YouTube as OBS's main output (**Settings → Stream → YouTube - RTMPS**, connect
the account or paste the stream key). Add Kick and LinkedIn as targets in the
**Multiple output** dock from `obs-multi-rtmp`. Where the target settings match the
main output, reuse the main encoder so the Mac encodes once.

| Destination | Where the URL and key come from | Suggested video |
|---|---|---|
| YouTube | YouTube Studio → Go live → Stream, or the connected account | 1080p, ~6,000 kbps |
| Kick | Creator dashboard → Stream URL and key (`rtmps://…`), custom service | 1080p, ~6,000 kbps (share the YouTube encoder) |
| LinkedIn | Scheduled Live event → Prepare to go live → Stream settings → region → Get URL | 720p30, ~3,500 kbps (own encoder) |

LinkedIn specifics:

- Live access is gated. The profile or Page has to pass LinkedIn's access review
  first (third-party guides cite about 150 followers or connections, good standing
  and recent original posts).
- Every show is a scheduled event with its own URL and key; paste them into the
  LinkedIn target before each show. The button unlocks one hour before the start
  (two hours for verified Pages).
- Starting OBS only shows a preview in LinkedIn's Live Studio. Someone has to click
  **Go live** there.

Stream keys are credentials: never commit them, screenshot them or show them on
stream. Reset a key that leaks.

## 5. Bandwidth

Every destination is a separate upload from this machine. YouTube + Kick + LinkedIn
at the bitrates above is about 15.5 Mbps, plus the VDO.Ninja call. Keep the total
under ~70% of a measured upload speed (roughly 25 Mbps or more for this mix). Without
that headroom, drop LinkedIn first or lower Kick to 720p.

## 6. Chat

Without Restream there is no merged chat: each platform keeps its own. Keep the
YouTube and Kick chat windows on the producer screen and check LinkedIn comments at
the breaks, or evaluate a chat aggregator separately.

## Pre-show check

- [ ] Private 10-minute test with both hosts: audio sync, echo, cohost delay.
- [ ] Slash plays on every scene change and the cut is hidden.
- [ ] YouTube, Kick and LinkedIn targets show green in the Multiple output dock.
- [ ] LinkedIn event preview is visible; **Go live** is clicked at the start.
- [ ] OBS Stats: no dropped frames from the network or the encoder.
