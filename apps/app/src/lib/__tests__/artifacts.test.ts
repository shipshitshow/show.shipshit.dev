import { describe, expect, test } from 'bun:test';
import {
  CVE_INDEX,
  STATUS_LABELS,
  TIMELINE_EVENTS,
  TRACK_LABELS,
  TWEET_DECK,
} from '@/lib/artifacts/agent-security-2026-10';
import {
  ARTIFACTS,
  getArtifact,
  getArtifactsForStream,
} from '@/lib/artifacts/registry';
import { VIBE_EDITING_TWEET_DECK } from '@/lib/artifacts/vibe-editing-2026-11';

describe('artifacts registry', () => {
  test('slugs are unique and resolve to their entry', () => {
    const slugs = ARTIFACTS.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const artifact of ARTIFACTS) {
      expect(getArtifact(artifact.slug)).toBe(artifact);
      expect(artifact.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(getArtifact('missing')).toBeUndefined();
  });

  test('attaches artifacts to livestream dates', () => {
    for (const artifact of ARTIFACTS) {
      for (const date of artifact.streams) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(getArtifactsForStream(date)).toContain(artifact);
      }
    }
    expect(getArtifactsForStream('2020-01-07')).toEqual([]);
  });

  test('has the security timeline plus one tweet slideshow per story', () => {
    expect(ARTIFACTS.map(({ slug }) => slug).sort()).toEqual([
      'agent-security-timeline',
      'agent-security-tweets',
      'vibe-editing-tweets',
    ]);
  });
});

describe('agent security timeline', () => {
  test('events are in date order with unique ids', () => {
    const dates = TIMELINE_EVENTS.map(({ date }) => date);
    expect([...dates].sort()).toEqual(dates);
    const ids = TIMELINE_EVENTS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every event has a known track, a known status and https sources', () => {
    for (const event of TIMELINE_EVENTS) {
      expect(Object.keys(TRACK_LABELS)).toContain(event.track);
      expect(Object.keys(STATUS_LABELS)).toContain(event.status);
      expect(event.sources.length).toBeGreaterThan(0);
      for (const source of event.sources) {
        expect(source.url.startsWith('https://')).toBe(true);
      }
    }
  });

  test('a confirmed event cites a vendor notice', () => {
    for (const event of TIMELINE_EVENTS.filter(
      ({ status }) => status === 'confirmed',
    )) {
      expect(event.sources.some(({ kind }) => kind === 'vendor')).toBe(true);
    }
  });

  test('CVE ids are well formed', () => {
    for (const cve of CVE_INDEX) {
      expect(cve.id).toMatch(/^CVE-\d{4}-\d{4,}$/);
    }
  });
});

describe('agent security tweet deck', () => {
  test('entries are unique X status links that match their id and handle', () => {
    const ids = TWEET_DECK.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of TWEET_DECK) {
      expect(entry.id).toMatch(/^\d+$/);
      expect(entry.url).toBe(
        `https://x.com/${entry.handle}/status/${entry.id}`,
      );
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });
});

describe('vibe editing tweet deck', () => {
  test('entries are unique X status links that match their id and handle', () => {
    const ids = VIBE_EDITING_TWEET_DECK.map(({ id }) => id);
    expect(ids.length).toBe(12);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of VIBE_EDITING_TWEET_DECK) {
      expect(entry.id).toMatch(/^\d+$/);
      expect(entry.url).toBe(
        `https://x.com/${entry.handle}/status/${entry.id}`,
      );
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });
});
