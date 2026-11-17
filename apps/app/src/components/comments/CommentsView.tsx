'use client';

import {
  type CommentReplyDraftCapability,
  type ErrorResponse,
  isErrorResponse,
  type YouTubeCommentReply,
  type YouTubeCommentThread,
} from '@shipshitshow/types';
import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shipshitshow/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { fetchJson } from '@/lib/fetch-json';
import { filterComments, type ReplyFilter } from './comment-filters';

type DraftState = Record<string, string[]>;
type SendingState = Record<string, number | null>;
type MobileView = 'list' | 'detail';

interface ActionError {
  commentId: string;
  kind: 'draft' | 'send';
  error: ErrorResponse;
}

const PAGE_SIZE = 15;
// Matches the `lg:` breakpoint where list and reply panes sit side by side.
const SPLIT_LAYOUT_QUERY = '(min-width: 1024px)';
const FILTER_TRIGGER_CLASS = 'h-9 min-w-0 text-left text-xs';
const FILTER_CONTENT_CLASS = 'max-w-[min(28rem,calc(100vw-2rem))]';

const formatPublishedAt = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const buildYouTubeVideoUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

const buildYouTubeCommentUrl = (videoId: string, commentId: string) =>
  `${buildYouTubeVideoUrl(videoId)}&lc=${encodeURIComponent(commentId)}`;

const isSplitLayout = () => window.matchMedia(SPLIT_LAYOUT_QUERY).matches;

async function readErrorResponse(
  res: Response,
  fallback: string,
): Promise<ErrorResponse> {
  const data: unknown = await res.json().catch(() => null);
  return isErrorResponse(data)
    ? data
    : { error: `${fallback} (HTTP ${res.status})` };
}

interface CommentsResponse {
  fetchedAt: string;
  items: YouTubeCommentThread[];
}

const COMMENTS_KEY = ['comments'];
const DRAFT_CAPABILITY_KEY = ['comments', 'draft-capability'];
const NO_COMMENTS: YouTubeCommentThread[] = [];

export function CommentsView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState('all');
  const [videoFilter, setVideoFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>('needs_reply');
  const [draftsByComment, setDraftsByComment] = useState<DraftState>({});
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(null);
  const [sendingByComment, setSendingByComment] = useState<SendingState>({});
  const [actionError, setActionError] = useState<ActionError | null>(null);
  const [page, setPage] = useState(0);
  const [mobileViewState, setMobileView] = useState<MobileView>('list');
  const listRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<CommentsResponse>(
        '/api/comments?maxResults=100',
        'Failed to fetch comments',
        signal,
      ),
    queryKey: COMMENTS_KEY,
  });
  const comments = commentsQuery.data?.items ?? NO_COMMENTS;
  const fetchedAt = commentsQuery.data?.fetchedAt ?? null;
  const loading = commentsQuery.isPending;
  const refreshing = commentsQuery.isFetching && !loading;
  const error = commentsQuery.error?.message ?? null;
  const loadComments = () => commentsQuery.refetch();

  // An unknown capability keeps the action enabled; a failed POST explains why.
  const capabilityQuery = useQuery({
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch('/api/comments/draft', { signal });
        if (!res.ok) return null;
        return (await res.json()) as CommentReplyDraftCapability;
      } catch (failure) {
        if (signal.aborted) throw failure;
        return null;
      }
    },
    queryKey: DRAFT_CAPABILITY_KEY,
  });
  const draftCapability = capabilityQuery.data ?? null;
  const loadDraftCapability = () => capabilityQuery.refetch();

  const channelOptions = useMemo(
    () => Array.from(new Set(comments.map((item) => item.channelLabel))).sort(),
    [comments],
  );

  const videoOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of filterComments(comments, {
      channel: channelFilter,
      reply: 'all',
      video: 'all',
    })) {
      map.set(item.videoId, item.videoTitle);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [comments, channelFilter]);

  // A video that the channel filter hides counts as "all".
  const effectiveVideoFilter =
    videoFilter === 'all' ||
    videoOptions.some(([videoId]) => videoId === videoFilter)
      ? videoFilter
      : 'all';

  const visibleComments = useMemo(
    () =>
      filterComments(comments, {
        channel: channelFilter,
        reply: replyFilter,
        video: effectiveVideoFilter,
      }),
    [comments, channelFilter, replyFilter, effectiveVideoFilter],
  );

  const totalPages = Math.max(1, Math.ceil(visibleComments.length / PAGE_SIZE));
  const pagedComments = visibleComments.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const selectedComment = useMemo(
    () =>
      visibleComments.find((item) => item.commentId === selectedId) ??
      visibleComments[0] ??
      null,
    [selectedId, visibleComments],
  );

  // Without a visible comment there is no detail pane to show.
  const mobileView: MobileView = selectedComment ? mobileViewState : 'list';

  const openComment = useCallback((commentId: string) => {
    setSelectedId(commentId);
    setMobileView('detail');
    if (!isSplitLayout()) {
      requestAnimationFrame(() => backButtonRef.current?.focus());
    }
  }, []);

  const backToList = useCallback(() => {
    setMobileView('list');
    const commentId = selectedComment?.commentId;
    if (!commentId) return;
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(
          `[data-comment-id="${CSS.escape(commentId)}"]`,
        )
        ?.focus();
    });
  }, [selectedComment]);

  const handleGenerateDrafts = useCallback(
    async (comment: YouTubeCommentThread) => {
      setDraftLoadingId(comment.commentId);
      setActionError(null);
      try {
        const res = await fetch('/api/comments/draft', {
          body: JSON.stringify({
            authorDisplayName: comment.authorDisplayName,
            channelLabel: comment.channelLabel,
            commentText: comment.text,
            videoTitle: comment.videoTitle,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        if (!res.ok) {
          const failure = await readErrorResponse(
            res,
            'Failed to generate drafts',
          );
          if (failure.code === 'draft_not_configured') {
            loadDraftCapability();
          }
          setActionError({
            commentId: comment.commentId,
            error: failure,
            kind: 'draft',
          });
          return;
        }
        const data = await res.json();
        setDraftsByComment((prev) => ({
          ...prev,
          [comment.commentId]: data.drafts,
        }));
      } catch (e) {
        setActionError({
          commentId: comment.commentId,
          error: {
            error: e instanceof Error ? e.message : 'Failed to generate drafts',
          },
          kind: 'draft',
        });
      } finally {
        setDraftLoadingId(null);
      }
    },
    [loadDraftCapability],
  );

  const handleSendReply = useCallback(
    async (comment: YouTubeCommentThread, draft: string, index: number) => {
      setSendingByComment((prev) => ({ ...prev, [comment.commentId]: index }));
      setActionError(null);
      try {
        const res = await fetch('/api/comments/reply', {
          body: JSON.stringify({
            channelId: comment.channelId,
            parentCommentId: comment.commentId,
            text: draft,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        if (!res.ok) {
          setActionError({
            commentId: comment.commentId,
            error: await readErrorResponse(res, 'Failed to send reply'),
            kind: 'send',
          });
          return;
        }
        const reply: YouTubeCommentReply = await res.json();
        queryClient.setQueryData<CommentsResponse>(COMMENTS_KEY, (data) =>
          data
            ? {
                ...data,
                items: data.items.map((item) =>
                  item.commentId === comment.commentId
                    ? {
                        ...item,
                        hasChannelReply: true,
                        replies: [...item.replies, reply],
                        totalReplyCount: item.totalReplyCount + 1,
                      }
                    : item,
                ),
              }
            : data,
        );
      } catch (e) {
        setActionError({
          commentId: comment.commentId,
          error: {
            error: e instanceof Error ? e.message : 'Failed to send reply',
          },
          kind: 'send',
        });
      } finally {
        setSendingByComment((prev) => ({
          ...prev,
          [comment.commentId]: null,
        }));
      }
    },
    [],
  );

  const isDraftUnavailable = draftCapability?.available === false;
  const selectedError =
    actionError && actionError.commentId === selectedComment?.commentId
      ? actionError
      : null;

  return (
    <div className="flex h-full min-h-0">
      <section
        aria-label="Comments"
        className={cn(
          'min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6',
          mobileView === 'detail' && 'hidden lg:block',
        )}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            {loading
              ? 'Loading comments...'
              : refreshing
                ? 'Refreshing comments...'
                : `${visibleComments.length} comments loaded`}
            {fetchedAt
              ? ` · updated ${new Date(fetchedAt).toLocaleTimeString()}`
              : ''}
          </p>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <Select
              value={replyFilter}
              onValueChange={(value) => {
                setReplyFilter(value as ReplyFilter);
                setPage(0);
              }}
            >
              <SelectTrigger
                aria-label="Reply status"
                className={cn(
                  FILTER_TRIGGER_CLASS,
                  'grow basis-[calc(50%-0.25rem)] sm:w-36 sm:grow-0 sm:basis-auto',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={FILTER_CONTENT_CLASS}>
                <SelectItem value="needs_reply">Needs reply</SelectItem>
                <SelectItem value="all">All comments</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={channelFilter}
              onValueChange={(value) => {
                setChannelFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger
                aria-label="Channel"
                className={cn(
                  FILTER_TRIGGER_CLASS,
                  'grow basis-[calc(50%-0.25rem)] sm:w-36 sm:grow-0 sm:basis-auto',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={FILTER_CONTENT_CLASS}>
                <SelectItem value="all">All channels</SelectItem>
                {channelOptions.map((ch) => (
                  <SelectItem key={ch} value={ch}>
                    {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={effectiveVideoFilter}
              onValueChange={(value) => {
                setVideoFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger
                aria-label="Video"
                className={cn(
                  FILTER_TRIGGER_CLASS,
                  'flex-1 sm:w-[260px] sm:max-w-[320px] sm:flex-none',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={FILTER_CONTENT_CLASS}>
                <SelectItem value="all">All videos</SelectItem>
                {videoOptions.map(([videoId, videoTitle]) => (
                  <SelectItem key={videoId} value={videoId}>
                    {videoTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={loadComments}
              className="shrink-0 text-xs hover:border-accent-red"
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
          <div ref={listRef} className="space-y-3">
            {pagedComments.map((comment) => {
              const isSelected =
                selectedComment?.commentId === comment.commentId;
              return (
                <Button
                  key={comment.commentId}
                  data-comment-id={comment.commentId}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => openComment(comment.commentId)}
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
                    {comment.isOwnedComment && (
                      <span className="text-[10px] font-medium px-2 py-1 rounded bg-surface-elevated text-text-muted">
                        Channel post
                      </span>
                    )}
                    <span className="min-w-0 break-words text-[10px] text-text-muted">
                      {comment.videoTitle}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary font-medium">
                    {comment.authorDisplayName}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1 line-clamp-3 break-words">
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-1 py-3 mt-3">
            <Button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs text-text-secondary disabled:opacity-30"
            >
              Previous
            </Button>
            <span className="text-[11px] text-text-muted">
              {page + 1} / {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs text-text-secondary disabled:opacity-30"
            >
              Next
            </Button>
          </div>
        )}
      </section>

      <aside
        aria-label="Reply"
        className={cn(
          'min-h-0 min-w-0 overflow-y-auto border-surface-border p-4 lg:block lg:w-[400px] lg:flex-none lg:shrink-0 lg:border-l xl:w-[460px]',
          mobileView === 'list' ? 'hidden' : 'flex-1',
        )}
      >
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
            <Button
              ref={backButtonRef}
              onClick={backToList}
              variant="ghost"
              size="sm"
              className="-ml-2 text-xs lg:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              All comments
            </Button>
            <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                  Video
                </p>
                <a
                  href={buildYouTubeVideoUrl(selectedComment.videoId)}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words text-sm font-semibold text-text-primary transition-colors hover:text-accent-red hover:underline"
                >
                  {selectedComment.videoTitle}
                </a>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                  Comment
                </p>
                <p className="break-words text-xs text-text-secondary leading-relaxed">
                  {selectedComment.text}
                </p>
              </div>
              {selectedComment.isOwnedComment && (
                <p className="text-[10px] text-text-muted">
                  Posted by the show, so it is excluded from Needs reply.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-[10px] text-text-muted">
                  {selectedComment.authorDisplayName} ·{' '}
                  {formatPublishedAt(selectedComment.publishedAt)}
                </div>
                <Button
                  onClick={() => handleGenerateDrafts(selectedComment)}
                  disabled={
                    isDraftUnavailable ||
                    draftLoadingId === selectedComment.commentId
                  }
                  aria-describedby={
                    isDraftUnavailable ? 'draft-unavailable' : undefined
                  }
                  className="text-xs bg-accent-red/10 text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
                >
                  {draftLoadingId === selectedComment.commentId
                    ? 'Generating...'
                    : 'Generate drafts'}
                </Button>
              </div>
            </div>

            {isDraftUnavailable && (
              <div
                id="draft-unavailable"
                className="rounded-xl border border-surface-border bg-surface-elevated p-3 text-xs text-text-secondary"
              >
                <p className="font-medium text-text-primary">
                  Reply drafts are unavailable
                </p>
                <p className="mt-1">
                  The server is missing{' '}
                  {draftCapability.missing.map((name, index) => (
                    <span key={name}>
                      {index > 0 ? ', ' : ''}
                      <code className="text-text-primary">{name}</code>
                    </span>
                  ))}
                  . Set it in the deployment environment and redeploy. You can
                  still reply on YouTube directly.
                </p>
              </div>
            )}

            {selectedError && (
              <div
                role="alert"
                className="space-y-2 rounded-xl border border-accent-red/20 bg-accent-red/10 p-3 text-xs text-text-primary"
              >
                <p className="font-medium">{selectedError.error.error}</p>
                {selectedError.error.hint && (
                  <p className="text-text-secondary">
                    {selectedError.error.hint}
                  </p>
                )}
                {selectedError.kind === 'draft' &&
                  selectedError.error.code !== 'draft_not_configured' && (
                    <Button
                      onClick={() => handleGenerateDrafts(selectedComment)}
                      disabled={draftLoadingId === selectedComment.commentId}
                      variant="danger"
                      size="sm"
                    >
                      Retry
                    </Button>
                  )}
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
                        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
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
                        <p className="min-w-0 truncate text-xs font-medium text-text-primary">
                          {reply.authorDisplayName}
                        </p>
                        <span className="shrink-0 text-[10px] text-text-muted">
                          {formatPublishedAt(reply.publishedAt)}
                        </span>
                      </div>
                      <p className="break-words text-xs text-text-secondary leading-relaxed mt-2">
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
