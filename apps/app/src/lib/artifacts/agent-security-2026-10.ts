import type { TweetDeckEntry } from '@/lib/tweet-slider';

export type TimelineTrack = 'agent' | 'extension' | 'php';

/**
 * How far a claim was checked when the timeline was compiled on 2026-11-02.
 * - confirmed: stated in the vendor or project's own notice.
 * - reported: from a news or security-firm page, not checked against a
 *   primary advisory.
 * - unverified: seen only in a search snippet or an aggregator, or the
 *   sources disagree.
 */
export type TimelineStatus = 'confirmed' | 'reported' | 'unverified';

export type SourceKind = 'news' | 'vendor' | 'x';

export interface TimelineSource {
  kind: SourceKind;
  label: string;
  url: string;
}

export interface TimelineEvent {
  body: string;
  /** Sort key, `YYYY-MM-DD`. */
  date: string;
  dateLabel: string;
  id: string;
  sources: TimelineSource[];
  status: TimelineStatus;
  subLabel: string;
  title: string;
  track: TimelineTrack;
}

export interface CveEntry {
  id: string;
  score: string;
  state: string;
  summary: string;
  unverified?: boolean;
}

export const TRACK_LABELS: Record<TimelineTrack, string> = {
  agent: 'AI-agent intrusions',
  extension: 'Extension trojan',
  php: 'PHP2Shell',
};

export const STATUS_LABELS: Record<TimelineStatus, string> = {
  confirmed: 'Confirmed',
  reported: 'Reported',
  unverified: 'Unverified',
};

export const STATUS_HELP: Record<TimelineStatus, string> = {
  confirmed: "Stated in the vendor or project's own notice.",
  reported:
    'From a news or security-firm page. Not checked against a primary advisory.',
  unverified:
    'Seen only in a search snippet or an aggregator, or the sources disagree.',
};

const WIKI = 'https://en.wikipedia.org/wiki/PHP2Shell';
const CURSOR_NOTICE =
  'https://cursor.com/blog/claude-code-extension-security-notice';
const THN_PHANTOM =
  'https://thehackernews.com/2026/10/exposed-infrastructure-reveals-how.html';
const THN_ROOTS_25 =
  'https://thehackernews.com/2026/10/php2shell-attack-roots-25-servers.html';
const THN_UNIT42 =
  'https://thehackernews.com/2026/10/php2shell-exploitation-hits-government.html';

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    body: "Ryan Austin of Calif found the flaws during an audit of the PHP source, using OpenAI's GPT-5.6 Sol, as part of OpenAI's Patch the Planet project. Wiz found them independently with Gemini 4 Argon, GPT-5.6 Sol and its own tool, and named the pair PHP2Shell.",
    date: '2026-08-01',
    dateLabel: 'Aug 2026',
    id: 'php-discovery',
    sources: [
      { kind: 'news', label: 'Wikipedia: PHP2Shell', url: WIKI },
      {
        kind: 'news',
        label:
          'The Wall Street Journal, 21 Oct (paywalled, cited by Wikipedia)',
        url: 'https://www.wsj.com/tech/cybersecurity/ai-just-found-a-bug-that-puts-up-to-70-of-the-worlds-websites-at-risk-fd0902ea',
      },
    ],
    status: 'reported',
    subLabel: 'discovery',
    title: 'PHP2Shell found with AI help',
    track: 'php',
  },
  {
    body: 'A Japanese X post lists a coordinated-disclosure timeline: Wiz finds the bug on 19 Aug, shows unauthenticated code execution on Drupal and WordPress on 20 and 21 Aug, and reports it to PHP on 24 Aug. PHP starts fixing on 21 Sep and Cloudflare builds defenses in early Oct. No primary source found.',
    date: '2026-08-19',
    dateLabel: '19 to 24 Aug',
    id: 'php-wiz-timeline',
    sources: [
      {
        kind: 'x',
        label: 'N@AION2 on X',
        url: 'https://x.com/Astlict/status/2112916052044906719',
      },
    ],
    status: 'unverified',
    subLabel: 'Wiz report to PHP',
    title: "Wiz's own timeline: found 19 Aug, reported to PHP 24 Aug",
    track: 'php',
  },
  {
    body: 'Amazon Threat Intelligence says its MadPot honeypots logged an exploitation attempt on 17 Oct. This conflicts with CISA, which had seen no exploitation on 21 Oct.',
    date: '2026-10-17',
    dateLabel: '17 Oct',
    id: 'php-amazon-first-hit',
    sources: [
      {
        kind: 'news',
        label: 'Wikipedia: PHP2Shell, Exploitation section',
        url: WIKI,
      },
    ],
    status: 'unverified',
    subLabel: 'earliest hit',
    title: 'Amazon sees a PHP2Shell attempt four days before disclosure',
    track: 'php',
  },
  {
    body: 'An anonymous Hacker News post, a post on X by watchTowr labs and a proof-of-concept video that Calif released by mistake all leaked details. PHP.net published an early notice. Sansec expected mass attacks within 15 minutes of release.',
    date: '2026-10-20',
    dateLabel: '20 Oct',
    id: 'php-leak',
    sources: [
      {
        kind: 'news',
        label: 'Wikipedia: PHP2Shell, Patches section',
        url: WIKI,
      },
    ],
    status: 'reported',
    subLabel: 'leak',
    title: 'News of the patch leaks before the embargo ends',
    track: 'php',
  },
  {
    body: 'Fixed releases are PHP 8.2.35, 8.3.36, 8.4.27 and 8.5.12. Source patches exist for 7.4, 8.0 and 8.1, but no official binaries because those branches are end of life. The GitHub advisories went up at 13:34 UTC, 26 minutes early. The @sagitz_ account (Wiz research, per the search result) announced PHP2Shell on X. Maintainers said updating is the only complete fix. Reuters reported government websites going dark while admins updated.',
    date: '2026-10-21',
    dateLabel: '21 Oct',
    id: 'php-patch',
    sources: [
      { kind: 'news', label: 'Wikipedia: PHP2Shell', url: WIKI },
      {
        kind: 'x',
        label: 'Wiz thread: "Today we disclose PHP2Shell"',
        url: 'https://x.com/sagitz_/status/2112901380080058778',
      },
      {
        kind: 'x',
        label: "Cloudflare's Dane Knecht on coordinated disclosure",
        url: 'https://x.com/dok2001/status/2112921277870866880',
      },
    ],
    status: 'reported',
    subLabel: 'patch and disclosure',
    title: 'Patches and full disclosure; sites go offline to update',
    track: 'php',
  },
  {
    body: 'watchTowr saw exploitation on its honeypots by 21 Oct. CISA said it had not seen any as of the same day. Cloudflare reported signs of early exploitation and put temporary firewall rules in place.',
    date: '2026-10-21',
    dateLabel: '21 Oct',
    id: 'php-exploitation',
    sources: [
      {
        kind: 'news',
        label: 'Wikipedia: PHP2Shell, Exploitation section',
        url: WIKI,
      },
    ],
    status: 'reported',
    subLabel: 'exploitation',
    title: 'Exploitation seen in the wild, disputed by CISA',
    track: 'php',
  },
  {
    body: 'SOCRadar found an exposed server tied to INC and The Gentlemen ransomware affiliates running a framework called Phantom. A human writes a victim-specific prompt and approves each step. The agent work ran through OpenCode with models hosted on OpenRouter. The log shows 8,257 messages over 133 sessions. When a model refused, the operator reworded the request as an authorized red-team test instead of switching models. Entry points were FortiClient EMS, SimpleHelp, cPanel and VPN gateways. The article does not link this to PHP2Shell.',
    date: '2026-10-23',
    dateLabel: '23 Oct',
    id: 'agent-phantom',
    sources: [
      { kind: 'news', label: 'The Hacker News, 23 Oct', url: THN_PHANTOM },
    ],
    status: 'reported',
    subLabel: 'agents attack',
    title: 'Ransomware affiliates run intrusions through coding agents',
    track: 'agent',
  },
  {
    body: 'A Japanese X write-up says it was reported on 23 Oct and advises setting session.upload_progress.enabled=0 until the next release. No primary advisory found.',
    date: '2026-10-23',
    dateLabel: '23 Oct',
    id: 'php-third-bug',
    sources: [
      {
        kind: 'x',
        label: 'N@AION2 on X (search result summary)',
        url: 'https://x.com/Astlict/status/2112916052044906719',
      },
    ],
    status: 'unverified',
    subLabel: 'third bug?',
    title:
      'A third PHP issue, CVE-2026-115560, reported to affect patched builds',
    track: 'php',
  },
  {
    body: 'Unit 42 described a European government target where an attacker reached password hashes and MFA secrets within two hours and tried Domain Admin escalation, with command output formatted for an AI model to read. Unit 42 then withdrew the claim that PHP2Shell was the entry point: it could not confirm how initial access happened. Separately, CYFIRMA reported a suspected North Korea-linked campaign scanning 216 unpatched hosts from 21 compromised nodes.',
    date: '2026-10-25',
    dateLabel: '25 Oct',
    id: 'agent-unit42',
    sources: [
      {
        kind: 'news',
        label: 'The Hacker News, 25 Oct (includes the retraction)',
        url: THN_UNIT42,
      },
    ],
    status: 'reported',
    subLabel: 'agentic post-exploit',
    title:
      'Unit 42 reported an agentic attacker on a PHP app, then retracted the PHP2Shell link',
    track: 'agent',
  },
  {
    body: 'Jaydip Modhwadia exploited PHP2Shell on an unpatched server in the online "Steal My Bitcoin" challenge, showing it works in practice.',
    date: '2026-10-25',
    dateLabel: '25 Oct',
    id: 'php-public-rce',
    sources: [
      {
        kind: 'news',
        label: 'Wikipedia: PHP2Shell, Exploitation section',
        url: WIKI,
      },
    ],
    status: 'reported',
    subLabel: 'public RCE',
    title: 'A researcher gets remote code execution in a public challenge',
    track: 'php',
  },
  {
    body: "Dream observed the attack on 25 Oct. It combined PHP2Shell with Fragnesia (CVE-2026-46300) against a firewall vendor's management server, including three systems in a US government-affiliated environment, then went after Active Directory. The exploit was a custom build tied to the firewall's PHP 8.0.30 and its session.upload_progress feature. Attribution to a China-nexus actor is Dream's assessment.",
    date: '2026-10-25',
    dateLabel: '25 Oct (reported 28 Oct)',
    id: 'agent-roots-25',
    sources: [
      { kind: 'news', label: 'The Hacker News, 28 Oct', url: THN_ROOTS_25 },
    ],
    status: 'reported',
    subLabel: '25 servers rooted',
    title:
      'AI-assisted attack chains PHP2Shell with a kernel bug to root 25 servers',
    track: 'agent',
  },
  {
    body: "The Washington Post story is based on Cathedral's draft report. Anthropic confirms access to a limited set of sales, HR and IT systems, says customer conversations, Claude output, source code and model weights were not reached, and says it cut off access the same day. Cathedral's draft mentions salary data and Slack discussion. The two accounts differ on scope. The Cathedral test ran through Anthropic's bug bounty program. The Post piece itself was not opened.",
    date: '2026-10-26',
    dateLabel: '26 Oct',
    id: 'agent-cathedral',
    sources: [
      {
        kind: 'news',
        label: 'Decrypt',
        url: 'https://decrypt.co/381860/ai-agents-hack-anthropic-business-systems-12-hours',
      },
      {
        kind: 'news',
        label: 'AI Weekly alert',
        url: 'https://aiweekly.co/alerts/cathedral-says-ai-agents-breached-anthropic-in-under-12-hours',
      },
    ],
    status: 'unverified',
    subLabel: 'Cathedral',
    title:
      "Cathedral says its AI agents reached Anthropic's business systems in under 12 hours",
    track: 'agent',
  },
  {
    body: "Versions 2.1.312 and 2.1.313 of Anthropic.claude-code, for macOS and Windows, carried a loader that tries to add an SSH key labeled svc-telemetry, enable SSH, open a reverse tunnel and drop persistence scripts, and reports host details to the attacker's server. Cursor says up to 5,000 users were affected, that Anthropic did not build these versions, and that uninstalling the extension may not remove the persistence. To check on macOS: grep -qs svc-telemetry ~/.ssh/authorized_keys",
    date: '2026-10-29',
    dateLabel: '29 Oct',
    id: 'ext-trojan',
    sources: [
      {
        kind: 'vendor',
        label: 'Cursor security notice, 29 Oct',
        url: CURSOR_NOTICE,
      },
      {
        kind: 'x',
        label: 'Florian Roth: window and builds',
        url: 'https://x.com/cyb3rops/status/2116080744871125428',
      },
    ],
    status: 'confirmed',
    subLabel: '09:27 to 20:35 UTC',
    title:
      "Trojanized Claude Code extension sits in Cursor's marketplace for about 11 hours",
    track: 'extension',
  },
  {
    body: "Cursor removed the malicious version, shut down the whole marketplace, audited other extensions and found none tampered with, rotated keys, rebuilt the marketplace and had the attacker's server taken offline with the hosting provider.",
    date: '2026-10-29',
    dateLabel: '29 Oct',
    id: 'ext-response',
    sources: [
      { kind: 'vendor', label: 'Cursor security notice', url: CURSOR_NOTICE },
    ],
    status: 'confirmed',
    subLabel: 'response',
    title: 'Cursor pulls the build, shuts the marketplace, rotates keys',
    track: 'extension',
  },
  {
    body: "StepSecurity updated its report after Anthropic's statement: a bad actor used access to Cursor's marketplace to publish a tampered copy, and Anthropic's systems and laptops were not compromised. Anthropic says 2.1.313 was never published to Open VSX, the Microsoft marketplace or its official hosts, and that it skipped to 2.1.314. StepSecurity also found the 2.1.312 build served by Open VSX is clean. Socket said early reports naming Open VSX, npm and Microsoft were inaccurate. The Hacker News relayed that Microsoft confirmed 2.1.313 never reached its marketplace and that how the attacker got publish access is still unclear.",
    date: '2026-10-30',
    dateLabel: '30 Oct',
    id: 'ext-scope',
    sources: [
      {
        kind: 'news',
        label: 'StepSecurity, updated 30 Oct',
        url: 'https://www.stepsecurity.io/blog/claude-code-extension-trojanized',
      },
      {
        kind: 'x',
        label: "Alex Albert, Anthropic: 'not an official extension'",
        url: 'https://x.com/alexalbert__/status/2116185803433071061',
      },
      {
        kind: 'x',
        label: 'Socket on the misinformation',
        url: 'https://x.com/SocketSecurity/status/2116223794117308872',
      },
      {
        kind: 'x',
        label: 'The Hacker News: Microsoft confirms',
        url: 'https://x.com/TheHackersNews/status/2116528634894905484',
      },
    ],
    status: 'reported',
    subLabel: 'scope corrected',
    title:
      'Anthropic says it was not compromised; early reports of other marketplaces were wrong',
    track: 'extension',
  },
];

export const CVE_INDEX: CveEntry[] = [
  {
    id: 'CVE-2026-109618',
    score: 'CVSS 4.0: 9.2 · 3.x: 9.8',
    state: 'Patched 21 Oct (PHP 8.2 to 8.5)',
    summary:
      'PHP2Shell memory-safety flaw, remote code execution, PHP 5.4 to 8.5',
  },
  {
    id: 'CVE-2026-109619',
    score: 'CVSS 4.0: 9.2 · 3.x: 8.1',
    state: 'Patched 21 Oct (PHP 8.2 to 8.5)',
    summary: 'PHP2Shell, second flaw in the pair',
  },
  {
    id: 'CVE-2026-46300',
    score: 'CVSS 7.8',
    state: 'Not checked',
    summary:
      '"Fragnesia", Linux kernel local privilege escalation, chained with PHP2Shell in the 25-server attack',
  },
  {
    id: 'CVE-2026-35616',
    score: 'Not listed',
    state: 'Marked actively exploited by The Hacker News',
    summary:
      'Fortinet FortiClient EMS authentication bypass, used by the Phantom ransomware framework',
  },
  {
    id: 'CVE-2024-57727',
    score: 'Not listed',
    state: 'Marked actively exploited by The Hacker News',
    summary: 'SimpleHelp path traversal, used by the same operators',
  },
  {
    id: 'CVE-2026-115560',
    score: 'Not listed',
    state: 'Unverified',
    summary: 'Third PHP issue said to affect patched versions',
    unverified: true,
  },
];

export const OPEN_QUESTIONS: string[] = [
  "How the attacker got publish access to Cursor's marketplace. Cursor's notice does not say, and The Hacker News says it is unclear.",
  'Who found PHP2Shell first and when. Calif and Wiz each claim an independent August discovery. The Wiz dates (19 and 24 Aug) come only from a Japanese X post.',
  'Whether exploitation began before 21 Oct. Amazon says 17 Oct, watchTowr says by 21 Oct, CISA said it had seen none on 21 Oct.',
  'The scale of the Cathedral breach of Anthropic. Cathedral and Anthropic describe different scopes.',
  'The fixed PHP versions for the end-of-life branches. Only source patches were issued for 7.4, 8.0 and 8.1.',
];

/**
 * The posts behind the timeline, in telling order. Links came from search
 * results and were not opened on X when the deck was compiled; a post that
 * cannot load shows its note and a link instead.
 */
export const TWEET_DECK: TweetDeckEntry[] = [
  {
    handle: 'sagitz_',
    id: '2112901380080058778',
    note: 'Wiz announces PHP2Shell, 21 Oct: pre-auth code execution on WordPress, Drupal and Joomla.',
    topicTitle: 'PHP2Shell',
    url: 'https://x.com/sagitz_/status/2112901380080058778',
  },
  {
    handle: 'sagitz_',
    id: '2112901387122332066',
    note: 'The Wiz thread says AI did most of the work finding it.',
    topicTitle: 'PHP2Shell',
    url: 'https://x.com/sagitz_/status/2112901387122332066',
  },
  {
    handle: 'sagitz_',
    id: '2112901390016434388',
    note: 'The Wiz thread on impact: PHP powers about 70% of the web.',
    topicTitle: 'PHP2Shell',
    url: 'https://x.com/sagitz_/status/2112901390016434388',
  },
  {
    handle: 'dok2001',
    id: '2112921277870866880',
    note: "Cloudflare's Dane Knecht on the coordinated disclosure.",
    topicTitle: 'PHP2Shell',
    url: 'https://x.com/dok2001/status/2112921277870866880',
  },
  {
    handle: 'cyb3rops',
    id: '2116080744871125428',
    note: 'The Cursor marketplace window and affected builds, 29 Oct.',
    topicTitle: 'Extension trojan',
    url: 'https://x.com/cyb3rops/status/2116080744871125428',
  },
  {
    handle: 'TheHackersNews',
    id: '2116133013839102310',
    note: 'What the malicious update did: SSH key, reverse tunnel, persistence.',
    topicTitle: 'Extension trojan',
    url: 'https://x.com/TheHackersNews/status/2116133013839102310',
  },
  {
    handle: 'alexalbert__',
    id: '2116185803433071061',
    note: 'Anthropic: a tampered copy it did not build or publish.',
    topicTitle: 'Extension trojan',
    url: 'https://x.com/alexalbert__/status/2116185803433071061',
  },
  {
    handle: 'SocketSecurity',
    id: '2116223794117308872',
    note: 'Socket on the misinformation about which marketplaces were hit.',
    topicTitle: 'Extension trojan',
    url: 'https://x.com/SocketSecurity/status/2116223794117308872',
  },
  {
    handle: 'TheHackersNews',
    id: '2116528634894905484',
    note: 'Microsoft confirms 2.1.313 never reached its marketplace.',
    topicTitle: 'Extension trojan',
    url: 'https://x.com/TheHackersNews/status/2116528634894905484',
  },
];
