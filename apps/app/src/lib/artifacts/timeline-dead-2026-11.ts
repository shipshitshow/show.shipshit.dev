import type { TweetDeckEntry } from '@/lib/tweet-slider';

/**
 * The posts behind the 2026-11-17 livestream "Is The Timeline Dead?", in run
 * order. The notes are producer context from the post text and counts read on
 * 2026-11-17; the videos inside were not watched. Claims in the posts are the
 * posters' own, not ours.
 */
export const TIMELINE_DEAD_TWEET_DECK: TweetDeckEntry[] = [
  {
    handle: 'ForwardEditor',
    id: '2115412009806414253',
    note: 'Brian, 28 Oct: "Is editing the old way gone forever?" The post that started the episode.',
    topicTitle: 'Is The Timeline Dead?',
    url: 'https://x.com/ForwardEditor/status/2115412009806414253',
  },
  {
    handle: 'ForwardEditor',
    id: '2119050987931336831',
    note: 'Brian, 7 Nov: "I have edited for 20 years. Opus is a better editor than me." The post names Opus, not a version or a tool.',
    topicTitle: 'Is The Timeline Dead?',
    url: 'https://x.com/ForwardEditor/status/2119050987931336831',
  },
  {
    handle: 'higgsfield',
    id: '2122441171771265172',
    note: 'Higgsfield, 16 Nov: 10 days left to enter its $1,000,000 Talent Contest, a 3 to 7 minute film submitted by 26 Nov. The question for Brian: manual editor cuts, or 100% AI? We have not checked the film.',
    topicTitle: 'AI video generation',
    url: 'https://x.com/higgsfield/status/2122441171771265172',
  },
  {
    handle: 'rames_jusso',
    id: '2122465287354409304',
    note: 'James Russo, 16 Nov: claims a reverse-any-video skill for HyperFrames took 81 s against 1,595 s for REA-Video (about 20x faster) and scored SSIM 0.96 against 0.78. These are his numbers; we have not run it.',
    topicTitle: 'Is The Timeline Dead?',
    url: 'https://x.com/rames_jusso/status/2122465287354409304',
  },
];
