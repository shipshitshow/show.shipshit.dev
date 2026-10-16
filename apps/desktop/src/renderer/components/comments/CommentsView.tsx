import type {
  YouTubeCommentReply,
  YouTubeCommentThread,
} from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CopyButton } from '../CopyButton';

type DraftState = Record<string, string[]>;
type SendingState = Record<string, number | null>;
type ReplyFilter = 'needs_reply' | 'all';

const formatPublishedAt = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const buildYouTubeVideoUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

const buildYouTubeCommentUrl = (videoId: string, commentId: string) =>
  `${buildYouTubeVideoUrl(videoId)}&lc=${encodeURIComponent(commentId)}`;

export function CommentsView() {
  const [comments, setComments] = useState<YouTubeCommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState('all');
  const [videoFilter, setVideoFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>('needs_reply');
  const [draftsByComment, setDraftsByComment] = useState<DraftState>({});
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(null);
  const [sendingByComment, setSendingByComment] = useState<SendingState>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.comments.list({
        maxResults: 100,
      });
      setComments(data.items);
      setFetchedAt(data.fetchedAt);
      setSelectedId((prev) => {
        if (prev && data.items.some((item) => item.commentId === prev))
          return prev;
        return data.items[0]?.commentId ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const channelOptions = useMemo(
    () => Array.from(new Set(comments.map((item) => item.channelLabel))).sort(),
    [comments],
  );

  const filteredByChannel = useMemo(() => {
    if (channelFilter === 'all') return comments;
    return comments.filter((item) => item.channelLabel === channelFilter);
  }, [comments, channelFilter]);

  const videoOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of filteredByChannel) {
      map.set(item.videoId, item.videoTitle);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [filteredByChannel]);

  useEffect(() => {
    if (videoFilter === 'all') return;
    if (!videoOptions.some(([videoId]) => videoId === videoFilter)) {
      setVideoFilter('all');
    }
  }, [videoFilter, videoOptions]);

  const visibleComments = useMemo(() => {
    const byReplyStatus =
      replyFilter === 'needs_reply'
        ? filteredByChannel.filter((item) => !item.hasChannelReply)
        : filteredByChannel;

    if (videoFilter === 'all') return byReplyStatus;
    return byReplyStatus.filter((item) => item.videoId === videoFilter);
  }, [filteredByChannel, replyFilter, videoFilter]);

  const selectedComment = useMemo(
    () =>
      visibleComments.find((item) => item.commentId === selectedId) ??
      visibleComments[0] ??
      null,
    [selectedId, visibleComments],
  );

  useEffect(() => {
    if (!selectedComment) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== selectedComment.commentId) {
      setSelectedId(selectedComment.commentId);
    }
  }, [selectedComment, selectedId]);

  const handleGenerateDrafts = useCallback(
    async (comment: YouTubeCommentThread) => {
      setDraftLoadingId(comment.commentId);
      setActionError(null);
      try {
        const data = await window.electronAPI.comments.draftReply({
          authorDisplayName: comment.authorDisplayName,
          channelLabel: comment.channelLabel,
          commentText: comment.text,
          videoTitle: comment.videoTitle,
        });
        setDraftsByComment((prev) => ({
          ...prev,
          [comment.commentId]: data.drafts,
        }));
      } catch (e) {
        setActionError(
          e instanceof Error ? e.message : 'Failed to generate drafts',
        );
      } finally {
        setDraftLoadingId(null);
      }
    },
    [],
  );

  const handleSendReply = useCallback(
    async (comment: YouTubeCommentThread, draft: string, index: number) => {
      setSendingByComment((prev) => ({ ...prev, [comment.commentId]: index }));
      setActionError(null);
      try {
        const reply: YouTubeCommentReply =
          await window.electronAPI.comments.reply(
            comment.commentId,
            comment.channelId,
            draft,
          );
        setComments((prev) =>
          prev.map((item) =>
            item.commentId === comment.commentId
              ? {
                  ...item,
                  hasChannelReply: true,
                  replies: [...item.replies, reply],
                  totalReplyCount: item.totalReplyCount + 1,
                }
              : item,
          ),
        );
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to send reply');
      } finally {
        setSendingByComment((prev) => ({
          ...prev,
          [comment.commentId]: null,
        }));
      }
    },
    [],
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <p className="text-xs text-text-muted">
            {loading
              ? 'Loading comments...'
              : `${visibleComments.length} comments loaded`}
            {fetchedAt
              ? ` · updated ${new Date(fetchedAt).toLocaleTimeString()}`
              : ''}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value as ReplyFilter)}
              className="h-9 rounded-md border border-surface-border bg-surface-card px-3 text-xs text-text-primary"
            >
              <option value="needs_reply">Needs reply</option>
              <option value="all">All comments</option>
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-9 rounded-md border border-surface-border bg-surface-card px-3 text-xs text-text-primary"
            >
              <option value="all">All channels</option>
              {channelOptions.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            <select
              value={videoFilter}
              onChange={(e) => setVideoFilter(e.target.value)}
              className="h-9 max-w-[320px] rounded-md border border-surface-border bg-surface-card px-3 text-xs text-text-primary"
            >
              <option value="all">All videos</option>
              {videoOptions.map(([videoId, videoTitle]) => (
                <option key={videoId} value={videoId}>
                  {videoTitle}
                </option>
              ))}
            </select>
            <Button
              onClick={loadComments}
              className="text-xs hover:border-accent-red"
            >
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-accent-red text-4xl">!</div>
            <p className="text-text-secondary text-sm">{error}</p>
            <Button
              onClick={loadComments}
              className="text-xs hover:border-accent-red"
            >
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="bg-surface-card border border-surface-border rounded-xl h-28"
              />
            ))}
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-text-secondary text-sm">No comments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleComments.map((comment) => {
              const isSelected =
                selectedComment?.commentId === comment.commentId;
              return (
                <Button
                  key={comment.commentId}
                  onClick={() => setSelectedId(comment.commentId)}
                  variant="ghost"
                  className={`h-auto w-full flex-col items-stretch justify-start whitespace-normal rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'bg-accent-red/5 border-accent-red/30 hover:bg-accent-red/5'
                      : 'bg-surface-card border-surface-border hover:border-surface-border/80 hover:bg-surface-card'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-accent-red/15 text-text-primary uppercase">
                      {comment.channelLabel}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {comment.videoTitle}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary font-medium">
                    {comment.authorDisplayName}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1 line-clamp-3">
                    {comment.text}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
                    <span>{formatPublishedAt(comment.publishedAt)}</span>
                    <span>{comment.likeCount} likes</span>
                    <span>{comment.totalReplyCount} replies</span>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <aside className="w-[460px] shrink-0 border-l border-surface-border overflow-y-auto p-4">
        {!selectedComment ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-muted text-center">
              Select a comment to generate
              <br />
              reply drafts and send one
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                  Video
                </p>
                <a
                  href={buildYouTubeVideoUrl(selectedComment.videoId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-text-primary transition-colors hover:text-accent-red hover:underline"
                >
                  {selectedComment.videoTitle}
                </a>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                  Comment
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {selectedComment.text}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] text-text-muted">
                  {selectedComment.authorDisplayName} ·{' '}
                  {formatPublishedAt(selectedComment.publishedAt)}
                </div>
                <Button
                  onClick={() => handleGenerateDrafts(selectedComment)}
                  disabled={draftLoadingId === selectedComment.commentId}
                  className="text-xs bg-accent-red/10 text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
                >
                  {draftLoadingId === selectedComment.commentId
                    ? 'Generating...'
                    : 'Generate drafts'}
                </Button>
              </div>
            </div>

            {actionError && (
              <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-3 text-xs text-text-primary">
                {actionError}
              </div>
            )}

            {(draftsByComment[selectedComment.commentId] ?? []).length > 0 && (
              <div className="space-y-3">
                {(draftsByComment[selectedComment.commentId] ?? []).map(
                  (draft, index) => {
                    const sendingIndex =
                      sendingByComment[selectedComment.commentId];
                    return (
                      <div
                        key={`${selectedComment.commentId}-${index}`}
                        className="bg-surface-elevated border border-surface-border rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-text-muted">
                            Draft {index + 1}
                          </span>
                          <CopyButton text={draft} />
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {draft}
                        </p>
                        <div className="mt-4">
                          <Button
                            onClick={() =>
                              handleSendReply(selectedComment, draft, index)
                            }
                            disabled={sendingIndex === index}
                            variant="accent"
                            className="w-full text-xs"
                          >
                            {sendingIndex === index
                              ? 'Sending...'
                              : 'Send this reply'}
                          </Button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {selectedComment.replies.length > 0 && (
              <div className="bg-surface-card border border-surface-border rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-3">
                  Existing replies
                </p>
                <div className="space-y-3">
                  {selectedComment.replies.map((reply) => (
                    <a
                      key={reply.id}
                      href={buildYouTubeCommentUrl(
                        selectedComment.videoId,
                        reply.id,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-surface-border bg-surface-elevated p-3 transition-colors hover:border-accent-red/40 hover:bg-surface-elevated/80"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-text-primary">
                          {reply.authorDisplayName}
                        </p>
                        <span className="text-[10px] text-text-muted">
                          {formatPublishedAt(reply.publishedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed mt-2">
                        {reply.text}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
