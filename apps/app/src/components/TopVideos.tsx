'use client';

import type { VideoStats, VideoType } from '@shipshitshow/types';
import Image from 'next/image';
import { useMemo } from 'react';
import { formatNumber, formatWatchTime } from '@/lib/format';

interface TopVideosProps {
  videos: VideoStats[];
}

const TYPE_CONFIG: Record<VideoType, { label: string; badge: string }> = {
  livestream: { badge: 'bg-blue-500/20 text-blue-400', label: 'Livestreams' },
  short: { badge: 'bg-purple-500/20 text-purple-400', label: 'Shorts' },
  video: { badge: 'bg-accent-red/20 text-text-primary', label: 'Videos' },
};

const TYPES_ORDER: VideoType[] = ['video', 'short', 'livestream'];

function TopVideoCard({ video, rank }: { video: VideoStats; rank: number }) {
  return (
    <a
      href={`https://youtu.be/${video.video_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 group"
    >
      {/* Rank */}
      <div className="text-lg font-bold text-text-muted w-5 shrink-0 pt-1 text-right">
        {rank}
      </div>

      {/* Thumbnail */}
      <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-elevated">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px]">
            No thumb
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary font-medium line-clamp-2 group-hover:text-accent-red transition-colors">
          {video.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
          <span>{formatNumber(video.views)} views</span>
          <span>{formatNumber(video.likes)} likes</span>
          {video.watch_time_minutes > 0 && (
            <span>{formatWatchTime(video.watch_time_minutes)}</span>
          )}
        </div>
      </div>
    </a>
  );
}

export function TopVideos({ videos }: TopVideosProps) {
  const sections = useMemo(() => {
    const result: {
      type: VideoType;
      label: string;
      badge: string;
      videos: VideoStats[];
    }[] = [];

    for (const type of TYPES_ORDER) {
      const filtered = videos
        .filter((v) => v.video_type === type)
        .sort((a, b) => b.views - a.views)
        .slice(0, 3);

      if (filtered.length > 0) {
        result.push({ type, ...TYPE_CONFIG[type], videos: filtered });
      }
    }

    return result;
  }, [videos]);

  if (sections.length === 0) return null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl">
      <div className="px-5 pt-5 pb-3 border-b border-surface-border">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-widest">
          Best Performers
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-border">
        {sections.map((section) => (
          <div key={section.type} className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded ${section.badge}`}
              >
                {section.label.toUpperCase()}
              </span>
              <span className="text-[10px] text-text-muted">
                Top {section.videos.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {section.videos.map((v, i) => (
                <TopVideoCard key={v.video_id} video={v} rank={i + 1} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
