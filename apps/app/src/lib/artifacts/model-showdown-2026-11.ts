import type { TweetDeckEntry } from '@/lib/tweet-slider';

/**
 * The posts behind the 2026-11-24 livestream "Fable 5.2 vs GPT-6.2 vs Gemini 4
 * Neon", in run order. The notes are producer context from the post text read
 * on 2026-11-23; the claims are the posters' own, not ours, and the numbers
 * are not independently checked unless the note says so.
 */
export const MODEL_SHOWDOWN_TWEET_DECK: TweetDeckEntry[] = [
  {
    handle: 'ryanshrout',
    id: '2120642904875999364',
    note: 'Ryan Shrout quoting Signal65, 11 Nov: Fable 5.2 "the best coding model we have tested and it is not close", and about $30 a passed job.',
    topicTitle: 'Fable 5.2',
    url: 'https://x.com/ryanshrout/status/2120642904875999364',
  },
  {
    handle: 'petergyang',
    id: '2123540875733315815',
    note: 'Peter Yang, 19 Nov: Opus 5.5 still better at 3D and design, but Neon is on par or better at writing and personality.',
    topicTitle: 'Gemini 4 Neon',
    url: 'https://x.com/petergyang/status/2123540875733315815',
  },
  {
    handle: 'kimmonismus',
    id: '2123221275594403932',
    note: 'Chubby, 19 Nov: Neon ahead of Fable 5.2 on the Artificial Analysis coding agent index. His claim; we have not opened the index.',
    topicTitle: 'Gemini 4 Neon',
    url: 'https://x.com/kimmonismus/status/2123221275594403932',
  },
  {
    handle: 'theo',
    id: '2122757647170703550',
    note: 'Theo, 17 Nov: "I think this is the worst model OpenAI has ever released." His opinion after testing Astra.',
    topicTitle: 'GPT-6.2',
    url: 'https://x.com/theo/status/2122757647170703550',
  },
  {
    handle: 'danshipper',
    id: '2122754729012777052',
    note: 'Dan Shipper, 17 Nov: a disappointing release next to Fable 5.2. Says Astra stops too early and its writing is a step back.',
    topicTitle: 'GPT-6.2',
    url: 'https://x.com/danshipper/status/2122754729012777052',
  },
  {
    handle: 'ArtificialAnlys',
    id: '2122751016055754830',
    note: 'Artificial Analysis, 17 Nov: coding agent index flat for GPT-6.2 Astra, GPT-6.2 Sol down 3 points. An independent measurement.',
    topicTitle: 'GPT-6.2',
    url: 'https://x.com/ArtificialAnlys/status/2122751016055754830',
  },
];
