export interface ChannelStats {
  channel_id: string;
  channel_title: string;
  subscriber_count: number;
  total_views: number;
  total_videos: number;
}

export type VideoType = 'video' | 'short' | 'livestream';
export type PerformancePlatform = 'youtube' | 'instagram' | 'tiktok' | 'x';

export interface VideoStats {
  video_id: string;
  title: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  impressions: number;
  ctr: number;
  watch_time_minutes: number;
  avg_view_duration_seconds: number;
  channel_id?: string;
  channel_label?: string; // "main" | "clips"
  platform?: PerformancePlatform;
  shares?: number;
  source_url?: string;
  video_type?: VideoType;
  thumbnail_url?: string;
}

export interface SocialPlatformStatus {
  connected: boolean;
  error?: string;
  /** X reads with an app-only bearer token, so it has no connect flow. */
  platform: Exclude<PerformancePlatform, 'youtube' | 'x'>;
}

export interface DailyMetric {
  day: string;
  views: number;
  watch_time_minutes: number;
  subscribers_gained: number;
  avg_view_duration_seconds: number;
  avg_view_percentage: number;
  likes: number;
}
export interface MultiChannelReport {
  channels: ChannelStats[];
  videos: VideoStats[];
  social_videos: VideoStats[];
  social_status: SocialPlatformStatus[];
  daily_metrics: DailyMetric[];
  per_channel: Record<
    string,
    {
      channel: ChannelStats;
      videos: VideoStats[];
      daily_metrics: DailyMetric[];
    }
  >;
  /**
   * Parts of the report that failed or are not available yet (a channel whose
   * token expired, reach data still pending). Shown instead of leaving blanks.
   */
  warnings?: string[];
}

export type ChannelFilter = 'all' | string;

export type DateRange = 7 | 30 | 90;

export interface YouTubeCommentReply {
  id: string;
  text: string;
  authorChannelId: string | null;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  publishedAt: string;
  updatedAt: string;
  likeCount: number;
}

export interface YouTubeCommentThread {
  id: string;
  commentId: string;
  channelId: string;
  channelLabel: string;
  videoId: string;
  videoTitle: string;
  text: string;
  authorDisplayName: string;
  authorProfileImageUrl: string | null;
  publishedAt: string;
  updatedAt: string;
  likeCount: number;
  totalReplyCount: number;
  hasChannelReply: boolean;
  /** Stable YouTube channel ID of the top-level comment's author. */
  authorChannelId?: string | null;
  /** Top-level comment written by one of the show's own channels. */
  isOwnedComment?: boolean;
  canReply: boolean;
  viewerRating: string;
  replies: YouTubeCommentReply[];
}

export interface YouTubeCommentListResponse {
  items: YouTubeCommentThread[];
  fetchedAt: string;
}

export interface CommentReplyDraftResponse {
  drafts: string[];
}

export interface CommentReplyDraftCapability {
  available: boolean;
  /** Server environment variables that must be set before drafts work. */
  missing: string[];
  model: string;
}
