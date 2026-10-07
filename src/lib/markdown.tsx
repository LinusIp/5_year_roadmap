/**
 * A small Markdown renderer for notes, returning React elements.
 *
 * It never builds an HTML string, so nothing typed into a note can inject markup or script: text only ever
 * reaches the page as React text nodes. Links are limited to http(s) and mailto. It covers what notes need —
 * headings, paragraphs, lists, block quotes, fenced code, bold, italic, inline code and links — and nothing
 * else, which is why it is 150 lines rather than a dependency.
 */
import type { ReactNode } from 'react';

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

type Inline = { kind: 'text'; text: string } | { kind: 'code'; text: string } | { kind: 'strong' | 'em'; children: Inline[] } | { kind: 'link'; href: string; children: Inline[] };

/** Parses inline Markdown into a small tree. Unmatched markers stay as literal text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = '';
  const flush = (): void => {
    if (buffer) out.push({ kind: 'text', text: buffer });
    buffer = '';
  };

  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);

    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      out.push({ kind: 'code', text: code[1]! });
      i += code[0].length;
      continue;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      flush();
      const href = link[2]!;
      if (SAFE_LINK.test(href)) out.push({ kind: 'link', href, children: parseInline(link[1]!) });
      else out.push({ kind: 'text', text: link[1]! });
      i += link[0].length;
      continue;
    }

    const strong = /^\*\*([^*]+)\*\*/.exec(rest) ?? /^__([^_]+)__/.exec(rest);
    if (strong) {
      flush();
      out.push({ kind: 'strong', children: parseInline(strong[1]!) });
      i += strong[0].length;
      continue;
    }

    const em = /^\*([^*\s][^*]*)\*/.exec(rest) ?? /^_([^_\s][^_]*)_(?![a-z0-9])/i.exec(rest);
    if (em && (i === 0 || !/[a-z0-9]/i.test(text[i - 1]!))) {
      flush();
      out.push({ kind: 'em', children: parseInline(em[1]!) });
      i += em[0].length;
      continue;
    }

    // A bare URL becomes a link too.
    const bare = /^https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/.exec(rest);
    if (bare && (i === 0 || /\s|\(/.test(text[i - 1]!))) {
      flush();
      out.push({ kind: 'link', href: bare[0], children: [{ kind: 'text', text: bare[0] }] });
      i += bare[0].length;
      continue;
    }

    buffer += text[i];
    i++;
  }
  flush();
  return out;
}

function renderInline(nodes: Inline[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = keyPrefix + '.' + index;
    switch (node.kind) {
      case 'text':
        return node.text;
      case 'code':
        return (
          <code key={key} className="rounded-button bg-line px-1 font-mono">
            {node.text}
          </code>
        );
      case 'strong':
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case 'em':
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case 'link':
        return (
          <a key={key} href={node.href} target="_blank" rel="noreferrer noopener" className="text-accent underline underline-offset-2">
            {renderInline(node.children, key)}
          </a>
        );
    }
  });
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) body.push(lines[i++]!);
      i++; // the closing fence, if any
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() });
      i++;
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*([-*+]|\d+[.)])\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) body.push(lines[i++]!.replace(/^>\s?/, ''));
      blocks.push({ kind: 'quote', text: body.join(' ') });
      continue;
    }
    const body: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,4}\s|```|>\s?|\s*([-*+]|\d+[.)])\s+)/.test(lines[i]!)) body.push(lines[i++]!.trim());
    blocks.push({ kind: 'paragraph', text: body.join(' ') });
  }
  return blocks;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={'space-y-2 ' + (className ?? '')}>
      {blocks.map((block, index) => {
        const key = 'b' + index;
        switch (block.kind) {
          case 'heading': {
            const size = block.level <= 2 ? 'text-base' : 'text-sm';
            return (
              <p key={key} role="heading" aria-level={Math.min(6, block.level + 2)} className={'font-semibold text-ink ' + size}>
                {renderInline(parseInline(block.text), key)}
              </p>
            );
          }
          case 'paragraph':
            return <p key={key}>{renderInline(parseInline(block.text), key)}</p>;
          case 'quote':
            return (
              <blockquote key={key} className="border-l-2 border-line pl-3 text-ink2">
                {renderInline(parseInline(block.text), key)}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={key} className="overflow-x-auto rounded-button bg-line p-3 font-mono">
                {block.text}
              </pre>
            );
          case 'list': {
            const items = block.items.map((item, j) => <li key={key + '.' + j}>{renderInline(parseInline(item), key + '.' + j)}</li>);
            return block.ordered ? (
              <ol key={key} className="list-decimal space-y-0.5 pl-5">
                {items}
              </ol>
            ) : (
              <ul key={key} className="list-disc space-y-0.5 pl-5">
                {items}
              </ul>
            );
          }
        }
      })}
    </div>
  );
}
