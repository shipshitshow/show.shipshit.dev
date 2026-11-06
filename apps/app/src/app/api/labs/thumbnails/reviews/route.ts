import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import {
  applyThumbnailDecision,
  currentThumbnail,
  ThumbnailConflict,
  type ThumbnailItem,
} from '@/lib/thumbnail-lab';
import { thumbnailError, thumbnailHeaders } from '@/lib/thumbnail-lab-http';
import {
  listThumbnailItems,
  saveThumbnailItems,
} from '@/lib/thumbnail-lab-store';
export async function GET() {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const items = await listThumbnailItems();
    const decisions = items.flatMap((item) => {
      const v = currentThumbnail(item);
      // Rejections stay in the Lab; the exchange format only carries approvals and revisions.
      if (v.review.status === 'pending' || v.review.status === 'rejected')
        return [];
      return [
        {
          assetHash: v.assetHash,
          feedback: v.review.status === 'revise' ? v.review.feedback : '',
          id: item.id,
          itemRevision: item.revision,
          prompt: v.review.status === 'revise' ? v.review.prompt : v.prompt,
          revision: v.legacyRevision ?? v.id,
          status: v.review.status,
          title: item.title,
        },
      ];
    });
    return NextResponse.json(
      {
        appId: 'shipshitshow-thumbnail-review',
        catalogueId: 'shipshitshow-thumbnails',
        decisions,
        schemaVersion: 1,
        submittedAt: new Date().toISOString(),
      },
      {
        headers: {
          ...thumbnailHeaders,
          'Content-Disposition':
            'attachment; filename="shipshitshow-thumbnail-feedback.json"',
        },
      },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
export async function POST(request: Request) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('appId' in body) ||
      body.appId !== 'shipshitshow-thumbnail-review' ||
      !('schemaVersion' in body) ||
      body.schemaVersion !== 1 ||
      !('catalogueId' in body) ||
      (body.catalogueId !== 'shipshitshow-thumbnails' &&
        body.catalogueId !== '2026-11-04') ||
      !('decisions' in body) ||
      !Array.isArray(body.decisions) ||
      body.decisions.length > 1000
    )
      throw new Error('This is not a valid thumbnail review export.');
    const items = await listThumbnailItems(),
      updates: Array<{ item: ThumbnailItem; expectedRevision: number }> = [];
    const seen = new Set<string>();
    for (const d of body.decisions) {
      if (
        !d ||
        typeof d !== 'object' ||
        !('id' in d) ||
        typeof d.id !== 'string' ||
        !('revision' in d) ||
        typeof d.revision !== 'string' ||
        !('assetHash' in d) ||
        typeof d.assetHash !== 'string' ||
        !('status' in d) ||
        (d.status !== 'approved' && d.status !== 'revise')
      )
        throw new Error('Invalid review decision.');
      if (seen.has(d.id)) throw new Error('Duplicate video ID in review.');
      seen.add(d.id);
      const item = items.find((item) => item.id === d.id);
      if (!item) throw new Error('Unknown video: ' + d.id);
      const v = currentThumbnail(item);
      if (
        v.assetHash !== d.assetHash ||
        (v.legacyRevision ?? v.id) !== d.revision
      )
        throw new ThumbnailConflict(
          'The export refers to an older version: ' + d.id,
        );
      if (v.review.status === 'approved') {
        if (d.status !== 'approved')
          throw new ThumbnailConflict(
            'Cannot revise an approved version: ' + d.id,
          );
        continue;
      }
      let feedback = '';
      if (d.status === 'revise') {
        if (
          !('feedback' in d) ||
          typeof d.feedback !== 'string' ||
          !d.feedback.trim() ||
          d.feedback.length > 4000
        )
          throw new Error('Invalid revision feedback.');
        feedback = d.feedback.trim();
        if (v.review.status === 'revise' && v.review.feedback === feedback)
          continue;
      }
      if (
        'itemRevision' in d
          ? !Number.isSafeInteger(d.itemRevision) ||
            d.itemRevision !== item.revision
          : item.revision !== 0
      )
        throw new ThumbnailConflict(
          'The review changed since this export: ' + d.id,
        );
      const decision =
        d.status === 'approved'
          ? ({
              action: 'approve',
              revision: item.revision,
              versionId: v.id,
            } satisfies import('@/lib/thumbnail-lab').ThumbnailDecision)
          : ({
              action: 'revise',
              feedback,
              revision: item.revision,
              versionId: v.id,
            } satisfies import('@/lib/thumbnail-lab').ThumbnailDecision);
      updates.push({
        expectedRevision: item.revision,
        item: applyThumbnailDecision(
          item,
          decision,
          producer.userId,
          new Date().toISOString(),
        ),
      });
    }
    await saveThumbnailItems(updates);
    return NextResponse.json(
      { updated: updates.length },
      { headers: thumbnailHeaders },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
