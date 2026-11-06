import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RailLogo } from './RailLogo';

function toggleIcon(markup: string): string | undefined {
  return markup.match(/<span[^>]*data-rail-toggle-icon[^>]*>/)?.[0];
}

describe('RailLogo', () => {
  test('the logo collapses the sidebar instead of linking to the app', () => {
    const markup = renderToStaticMarkup(
      <RailLogo collapsed={false} onToggle={() => {}} />,
    );

    expect(markup).toStartWith('<button');
    expect(markup).toContain('aria-label="Collapse sidebar"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).not.toContain('<a');
    expect(markup).not.toContain('href=');
  });

  test('offers to expand once the sidebar is collapsed', () => {
    const markup = renderToStaticMarkup(
      <RailLogo collapsed onToggle={() => {}} />,
    );

    expect(markup).toContain('aria-label="Expand sidebar"');
    expect(markup).toContain('aria-expanded="false"');
  });

  test('shows the collapse icon only on hover or keyboard focus', () => {
    const icon = toggleIcon(
      renderToStaticMarkup(<RailLogo collapsed={false} onToggle={() => {}} />),
    );

    expect(icon).toContain(' opacity-0 ');
    expect(icon).toContain('group-hover:opacity-100');
    expect(icon).toContain('group-focus-visible:opacity-100');
  });

  test('stays a plain mark in the mobile drawer', () => {
    const markup = renderToStaticMarkup(<RailLogo collapsed={false} />);

    expect(markup).not.toContain('<button');
    expect(toggleIcon(markup)).toBeUndefined();
  });
});
