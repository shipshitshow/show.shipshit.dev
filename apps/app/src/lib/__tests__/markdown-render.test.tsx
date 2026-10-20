import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownBody } from '../markdown-render';

function render(body: string): string {
  return renderToStaticMarkup(<MarkdownBody body={body} />);
}

describe('MarkdownBody (#72)', () => {
  test('renders a pipe table with a header row and aligned cells', () => {
    const html = render(
      [
        'Intro line.',
        '',
        '| Views | Channel |',
        '|---:|---|',
        '| 63K | [Matthew Berman](https://youtube.com/@matthew_berman) |',
        '| 52K | AI at **Meta** |',
        '',
        'After.',
      ].join('\n'),
    );

    expect(html).toContain('<table');
    expect(html).toContain('<th scope="col"');
    expect(html.match(/<tr/g)).toHaveLength(3);
    expect(html).toContain('text-align:right');
    expect(html).toContain('href="https://youtube.com/@matthew_berman"');
    expect(html).toContain('<strong><span>Meta</span></strong>');
    expect(html).not.toContain('|---');
    expect(html).toContain('Intro line.');
    expect(html).toContain('After.');
  });

  test('keeps pipe lines without a separator row as text', () => {
    const html = render('| not | a table |');
    expect(html).not.toContain('<table');
    expect(html).toContain('| not | a table |');
  });

  test('renders numbered lists as separate items instead of one paragraph', () => {
    const html = render(
      '1. Vincent’s usage screenshot\n2. The launch post\n10. The close',
    );
    expect(html).toContain('>1.</span>');
    expect(html).toContain('>2.</span>');
    expect(html).toContain('>10.</span>');
    expect(html).not.toContain('screenshot 2.');
  });

  test('indents nested bullets and accepts star bullets', () => {
    const html = render('- Parent\n  - Child\n* Star');
    expect(html).toContain('pl-5');
    expect(html).toContain('pl-10');
    expect(html).toContain('Star');
    expect(html).not.toContain('* Star');
  });

  test('renders a horizontal rule instead of literal dashes', () => {
    const html = render('Above\n\n---\n\nBelow');
    expect(html).toContain('<hr');
    expect(html).not.toContain('>---<');
  });

  test('renders italics, and links inside bold text', () => {
    const html = render(
      'They are not *smarter*, they are _less dumb_. **Read [the post](https://example.com/a)**',
    );
    expect(html).toContain('<em><span>smarter</span></em>');
    expect(html).toContain('<em><span>less dumb</span></em>');
    expect(html).toMatch(
      /<strong><span>Read <\/span><a href="https:\/\/example.com\/a"/,
    );
  });

  test('does not italicise snake_case or multiplication', () => {
    const html = render('Use muse_wonder_full and 2*3*4.');
    expect(html).not.toContain('<em>');
    expect(html).toContain('muse_wonder_full');
  });

  test('keeps sentence punctuation out of bare links', () => {
    const html = render('Source: https://example.com/report. Next sentence.');
    expect(html).toContain('href="https://example.com/report"');
    expect(html).toContain('</a>.');
  });
});
