export interface ChannelConfig {
  id: string;
  label: string;
  refreshToken: string;
}

export interface YouTubeAuthStatus {
  connected: boolean;
  status: 'connected' | 'missing_credentials' | 'reauth_required';
  channelLabelsNeedingAuth: string[];
}

export interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
}

export interface YouTubeVideoItem {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
    subscriberCount?: string;
    videoCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  liveStreamingDetails?: {
    concurrentViewers?: string;
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
  status?: {
    privacyStatus?: string;
  };
}

export interface YouTubeChannelItem {
  snippet?: {
    title?: string;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

export interface YouTubeCommentReplyItem {
  id?: string;
  snippet?: {
    textDisplay?: string;
    textOriginal?: string;
    authorDisplayName?: string;
    authorChannelId?: { value?: string };
    authorProfileImageUrl?: string;
    publishedAt?: string;
    updatedAt?: string;
    likeCount?: number;
  };
}

export interface YouTubeCommentThreadItem {
  id: string;
  snippet?: {
    videoId?: string;
    channelId?: string;
    canReply?: boolean;
    totalReplyCount?: number;
    topLevelComment?: {
      id?: string;
      snippet?: {
        textDisplay?: string;
        textOriginal?: string;
        authorDisplayName?: string;
        authorChannelId?: { value?: string };
        authorProfileImageUrl?: string;
        publishedAt?: string;
        updatedAt?: string;
        likeCount?: number;
        viewerRating?: string;
      };
    };
  };
  replies?: {
    comments?: YouTubeCommentReplyItem[];
  };
}

export interface YouTubeAnalyticsResponse {
  rows?: Array<Array<string | number>>;
}
