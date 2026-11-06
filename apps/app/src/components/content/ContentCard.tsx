import { Badge, cn } from '@shipshitshow/ui';
import { ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ContentItem, ContentType } from '@/lib/content-library';
import { formatNumber } from '@/lib/format';
import { formatLivestreamDate } from '@/lib/livestreams-ui';
import { formatCount, formatDuration } from '@/lib/video-stats';

const KIND: Record<ContentType, string> = {
  livestream: 'Live',
  short: 'Short',
  video: 'Video',
};

function ScoreChip({ score }: { score: number }) {
  return (
    <span
      title="Transcript score"
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold',
        score >= 8
          ? 'border-green-500/20 bg-green-500/10 text-green-400'
          : score >= 6
            ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
            : 'border-red-500/20 bg-red-500/10 text-red-400',
      )}
    >
      {score}/10
    </span>
  );
}

/**
 * One livestream, video or Short: the livestream card the app already had,
 * with the length on the thumbnail and views and likes under the title.
 */
export function ContentCard({ item }: { item: ContentItem }) {
  const { stat } = item;
  const short = item.type === 'short';
  const duration = stat ? formatDuration(stat.durationSeconds) : '';
  const privacy =
    stat?.privacy && stat.privacy !== 'public' ? stat.privacy : null;
  const hasThumbnail = item.thumbnailUrl !== '/icon.svg';
  const className =
    'group self-start overflow-hidden rounded-2xl border border-surface-border bg-surface-card transition-colors outline-none hover:border-accent-red/40 focus-visible:ring-2 focus-visible:ring-accent-red/40';

  const body = (
    <>
      <div
        className={cn(
          'relative overflow-hidden bg-surface-elevated',
          short ? 'aspect-[9/16]' : 'aspect-video',
        )}
      >
        {hasThumbnail ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes={
              short
                ? '(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw'
                : '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw'
            }
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Image src="/icon.svg" alt="" width={48} height={48} />
          </div>
        )}
        <span className="absolute left-2 top-2 flex gap-1">
          <Badge
            variant="overlay"
            className={cn(
              'text-[10px] font-normal',
              item.type === 'livestream'
                ? 'text-accent-red'
                : 'text-text-secondary',
            )}
          >
            {item.upcoming ? 'Upcoming' : KIND[item.type]}
          </Badge>
          {privacy ? (
            <Badge
              variant="overlay"
              className="text-[10px] font-normal capitalize text-text-secondary"
            >
              {privacy}
            </Badge>
          ) : null}
        </span>
        {duration ? (
          <Badge
            variant="overlay"
            className="absolute bottom-2 right-2 text-[11px] text-white"
          >
            {duration}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.date ? (
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                {formatLivestreamDate(item.date)}
              </p>
            ) : null}
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-text-primary transition-colors group-hover:text-accent-red">
              {item.title}
            </h3>
          </div>
          {item.transcriptScore !== undefined ? (
            <ScoreChip score={item.transcriptScore} />
          ) : null}
        </div>
        {stat ? (
          <div className="flex items-center gap-3 text-[11px] tabular-nums text-text-muted">
            <span>
              {formatCount(stat.views)} {stat.views === 1 ? 'view' : 'views'}
            </span>
            {stat.likes !== undefined ? (
              <span
                className="inline-flex items-center gap-1"
                title={`${stat.likes.toLocaleString('en')} likes`}
              >
                <ThumbsUp aria-hidden="true" className="size-[11px]" />
                {formatCount(stat.likes)}
                <span className="sr-only">likes</span>
              </span>
            ) : null}
          </div>
        ) : null}
        {item.upcoming ? null : item.transcriptWords !== undefined ? (
          <p className="text-[10px] text-text-muted">
            {formatNumber(item.transcriptWords)} words
          </p>
        ) : (
          <p className="text-[10px] text-text-muted/50">No transcript</p>
        )}
      </div>
    </>
  );

  return item.external ? (
    <a href={item.href} target="_blank" rel="noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={item.href} className={className}>
      {body}
    </Link>
  );
}
