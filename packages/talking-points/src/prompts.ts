import type { TrendItem } from '@shipshitshow/types';

export function buildTrendResearchPrompt(trend: TrendItem): string {
  return [
    'Research this trend for Ship Sh*t Show and turn it into livestream prep.',
    `Title: ${trend.title}`,
    `Source: ${trend.source}`,
    `URL: ${trend.url}`,
    trend.summary ? `Summary: ${trend.summary}` : null,
    '',
    'Return:',
    '- why it matters now',
    '- 5 sharper related angles',
    '- livestream talking points',
    '- one contrarian hot take',
    '- a strong title/hook for the segment',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildSelectedTrendsResearchPrompt(trends: TrendItem[]): string {
  return [
    'Research these selected trends for Ship Sh*t Show and turn them into livestream prep.',
    '',
    ...trends
      .flatMap((item, index) => [
        `${index + 1}. ${item.title}`,
        `Source: ${item.source}`,
        `URL: ${item.url}`,
        item.summary ? `Summary: ${item.summary}` : null,
        '',
      ])
      .filter(Boolean),
    'Return:',
    '- which trends are strongest',
    '- how they connect',
    '- a recommended segment order',
    '- talking points per segment',
    '- one hot take per segment',
  ].join('\n');
}
