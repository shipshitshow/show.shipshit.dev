import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrendFilters } from './TrendFilters';

function render() {
  return renderToStaticMarkup(
    <TrendFilters
      active="all"
      onChange={() => {}}
      counts={{ all: 9, hackernews: 6, reddit: 3, youtube: 0 }}
    />,
  );
}

describe('TrendFilters', () => {
  test('the source filter is one dropdown, not a chip row', () => {
    const markup = render();
    expect(markup).toContain('aria-label="Source"');
    expect(markup).toContain('role="combobox"');
    expect(markup).not.toContain('data-source-logo');
  });
});
