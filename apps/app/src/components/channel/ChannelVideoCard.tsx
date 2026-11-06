import { Badge } from '@shipshitshow/ui';
import { ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  formatAge,
  formatCount,
  formatDuration,
  type VideoStat,
} from '@/lib/video-stats';

export interface ChannelVideo {
  /** Verb in front of the age, as the channel page does: "Streamed". */
  agePrefix?: string;
  date: string;
  href: string;
  key: string;
  /** Small extra fact after the likes, for example a transcript score. */
  note?: string;
  stat?: VideoStat;
  thumbnailUrl: string;
  title: string;
}

function Dot() {
  return (
    <span aria-hidden="true" className="text-text-muted/60">
      ·
    </span>
  );
}

/**
 * One tile in the channel grid: thumbnail with the length in the corner, a
 * two-line title, then views, age and likes. Only the layout pattern of the
 * YouTube channel page; nothing of its branding.
 */
export function ChannelVideoCard({
  video,
  now,
}: {
  video: ChannelVideo;
  now: Date;
}) {
  const { stat } = video;
  const duration = stat ? formatDuration(stat.durationSeconds) : '';
  const age = formatAge(stat?.publishedAt ?? `${video.date}T00:00:00Z`, now);
  const hasThumbnail = video.thumbnailUrl !== '/icon.svg';

  return (
    <Link
      href={video.href}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent-red/40"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-elevated">
        {hasThumbnail ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Image src="/icon.svg" alt="" width={48} height={48} />
          </div>
        )}
        {duration ? (
          <Badge variant="overlay" className="absolute right-1.5 bottom-1.5">
            {duration}
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm leading-snug font-semibold text-text-primary group-hover:text-accent-red">
        {video.title}
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-muted">
        {stat ? (
          <>
            <span>
              {formatCount(stat.views)} {stat.views === 1 ? 'view' : 'views'}
            </span>
            <Dot />
          </>
        ) : null}
        {age ? (
          <span>
            {video.agePrefix ? `${video.agePrefix} ` : ''}
            {age}
          </span>
        ) : null}
        {stat?.likes !== undefined ? (
          <>
            <Dot />
            <span
              className="inline-flex items-center gap-1"
              title={`${stat.likes.toLocaleString('en')} likes`}
            >
              <ThumbsUp aria-hidden="true" className="size-3" />
              {formatCount(stat.likes)}
              <span className="sr-only">likes</span>
            </span>
          </>
        ) : null}
        {video.note ? (
          <>
            <Dot />
            <span>{video.note}</span>
          </>
        ) : null}
      </p>
    </Link>
  );
}
