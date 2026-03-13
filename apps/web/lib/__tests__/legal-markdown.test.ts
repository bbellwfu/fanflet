import { describe, it, expect } from 'vitest'
import { markdownToHtml, inlineFormat } from '../legal-markdown'

describe('inlineFormat', () => {
  it('converts bold markdown to strong tags', () => {
    expect(inlineFormat('Hello **world**')).toBe('Hello <strong>world</strong>')
  })

  it('converts italic markdown to em tags', () => {
    expect(inlineFormat('Hello *world*')).toBe('Hello <em>world</em>')
  })

  it('converts markdown links to anchor tags', () => {
    expect(inlineFormat('[Click here](https://example.com)')).toBe(
      '<a href="https://example.com">Click here</a>'
    )
  })

  it('converts inline code to code tags', () => {
    expect(inlineFormat('Use `console.log`')).toBe('Use <code>console.log</code>')
  })

  it('handles multiple inline formats in one line', () => {
    const result = inlineFormat('**bold** and *italic* and `code`')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  it('returns plain text unchanged', () => {
    expect(inlineFormat('Just plain text')).toBe('Just plain text')
  })
})

describe('markdownToHtml', () => {
  it('converts h2 headings', () => {
    expect(markdownToHtml('## Title')).toContain('<h2>Title</h2>')
  })

  it('converts h3 headings', () => {
    expect(markdownToHtml('### Subtitle')).toContain('<h3>Subtitle</h3>')
  })

  it('converts h4 headings', () => {
    expect(markdownToHtml('#### Section')).toContain('<h4>Section</h4>')
  })

  it('wraps loose text in paragraphs', () => {
    expect(markdownToHtml('Some text here')).toContain('<p>Some text here</p>')
  })

  it('converts unordered lists', () => {
    const md = '- Item A\n- Item B\n- Item C'
    const html = markdownToHtml(md)
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Item A</li>')
    expect(html).toContain('<li>Item B</li>')
    expect(html).toContain('<li>Item C</li>')
    expect(html).toContain('</ul>')
  })

  it('converts ordered lists', () => {
    const md = '1. First\n2. Second\n3. Third'
    const html = markdownToHtml(md)
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>First</li>')
    expect(html).toContain('<li>Third</li>')
    expect(html).toContain('</ol>')
  })

  it('converts blockquotes', () => {
    const md = '> This is a quote'
    const html = markdownToHtml(md)
    expect(html).toContain('<blockquote>')
    expect(html).toContain('This is a quote')
    expect(html).toContain('</blockquote>')
  })

  it('converts tables', () => {
    const md = '| Name | Value |\n| --- | --- |\n| A | 1 |\n| B | 2 |'
    const html = markdownToHtml(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<th>Name</th>')
    expect(html).toContain('<td>1</td>')
    expect(html).toContain('</table>')
  })

  it('applies inline formatting within list items', () => {
    const md = '- **Bold item**\n- *Italic item*'
    const html = markdownToHtml(md)
    expect(html).toContain('<li><strong>Bold item</strong></li>')
    expect(html).toContain('<li><em>Italic item</em></li>')
  })

  it('handles empty input', () => {
    expect(markdownToHtml('')).toBe('')
  })

  it('collapses excessive blank lines', () => {
    const md = 'Paragraph one\n\n\n\n\nParagraph two'
    const html = markdownToHtml(md)
    expect(html).not.toContain('\n\n\n')
  })
})
