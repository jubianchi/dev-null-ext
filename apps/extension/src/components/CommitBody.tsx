import type { BodyMention, BodySegment } from '@devnull-github/client';
import type { ComponentChild } from 'preact';
import { type GitHubLinkTarget, gitHubLinkTo } from '../lib/github/links.ts';
import { withoutTrailingPunctuation } from '../lib/urls.ts';
import { Octicon } from './Octicon.tsx';

const TOKEN_PATTERN = /(https?:\/\/[^\s<>]+)|(?<![\w@])@([A-Za-z0-9][A-Za-z0-9-]*)/g;
const WORDMARK_PATTERN = /(?<![\p{L}\p{M}\p{N}_./-])(\/dev\/null)(?![\p{L}\p{M}\p{N}_/-])/u;
const HIGHLIGHT_CLASS =/^hl-[a-z]+(-[a-z]+)*$/;

/**
 * A commit body as dev-null.sh draws it (CommitBody): prose with its line breaks, links and mentions, `> ` quotes,
 * inline code, and highlighted code blocks.
 */
export function CommitBody({
  segments,
  mentions,
  interactive = true,
}: {
  segments: BodySegment[];
  mentions: BodyMention[];
  /** False inside a link, such as a quoted commit's card: links and mentions are drawn, not clickable. */
  interactive?: boolean;
}) {
  const known = new Map(mentions.map((mention) => [mention.handle.toLowerCase(), mention.handle]));
  const link = interactive ? Link : Static;

  return (
    <div data-commit-body class="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          return (
            <code key={index} class="rounded-sm bg-canvas-muted px-1 py-0.5 font-mono text-[0.875em]">
              {segment.code}
            </code>
          );
        }
        if (segment.type === 'block') return <CodeBlock key={index} segment={segment} />;
        return <Prose key={index} text={segment.text} known={known} link={link} />;
      })}
    </div>
  );
}

interface LinkProps {
  href: string;
  class: string;
  children: ComponentChild;
  title?: string;
  label?: string;
}

type LinkComponent = (props: LinkProps) => ComponentChild;

function Link({ href, class: className, children, title, label }: LinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc" class={className} title={title} aria-label={label}>
      {children}
    </a>
  );
}

function Static({ class: className, children, title }: LinkProps) {
  return (
    <span class={className} title={title}>
      {children}
    </span>
  );
}

/**
 * A GitHub link as GitHub writes it, as dev-null.sh draws it (ForgeLink): the mark, the owner muted, the repository and
 * what in it. The whole URL stays in the text, at no size, so copying the commit keeps the link.
 */
function GitHubLink({ url, target, Anchor }: { url: string; target: GitHubLinkTarget; Anchor: LinkComponent }) {
  const { owner, repository, item } = target;
  const name = repository === null ? owner : `${owner}/${repository}`;

  return (
    <Anchor href={url} title={url} label={`${name}${item ? ` ${item.description}` : ''} on GitHub`} class="text-fg-accent hover:underline">
      <span class="text-[0px]">{url}</span>
      <span aria-hidden="true" class="select-none font-mono text-[0.92em] [overflow-wrap:anywhere]">
        {/* The mark never wraps onto a line of its own. */}
        <span class={`whitespace-nowrap ${repository === null ? '' : 'text-fg-muted'}`}>
          <Octicon name="mark-github" class="mr-[0.2em] size-[1.15em] align-[-0.25em] text-fg" />
          {owner.charAt(0)}
        </span>
        {repository === null ? (
          owner.slice(1)
        ) : (
          <>
            <span class="text-fg-muted">{owner.slice(1)}/</span>
            {repository}
            {item?.suffix}
          </>
        )}
      </span>
    </Anchor>
  );
}

function Prose({ text, known, link }: { text: string; known: Map<string, string>; link: LinkComponent }) {
  return (
    <>
      {quotes(text).map((chunk, index) =>
        chunk.quote ? (
          <blockquote key={index} class="my-1 border-l-2 border-lane-5 pl-3">
            {linkify(chunk.text, known, link)}
          </blockquote>
        ) : (
          linkify(chunk.text, known, link)
        ),
      )}
    </>
  );
}

/** Consecutive lines starting with `>` become one quote, without their marker. */
function quotes(text: string): Array<{ quote: boolean; text: string }> {
  const chunks: Array<{ quote: boolean; lines: string[] }> = [];
  for (const line of text.split('\n')) {
    const quote = line.startsWith('>');
    const content = quote ? line.replace(/^> ?/, '') : line;
    const last = chunks.at(-1);
    if (last && last.quote === quote) last.lines.push(content);
    else chunks.push({ quote, lines: [content] });
  }

  return chunks.map(({ quote, lines }) => ({ quote, text: lines.join('\n') }));
}

function linkify(text: string, known: Map<string, string>, Anchor: LinkComponent): ComponentChild[] {
  const parts: ComponentChild[] = [];
  let last = 0;

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const [found, raw, handle] = match;
    const url = raw ? withoutTrailingPunctuation(raw) : undefined;
    const token = url ?? found;
    const mentioned = handle ? known.get(handle.toLowerCase()) : undefined;
    if (!url && !mentioned) continue;

    parts.push(...wordmarks(text.slice(last, match.index)));
    const gitHub = url ? gitHubLinkTo(url) : null;
    parts.push(
      url && gitHub ? (
        <GitHubLink url={url} target={gitHub} Anchor={Anchor} />
      ) : url ? (
        <Anchor href={url} class="text-fg-accent [overflow-wrap:anywhere] hover:underline">
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </Anchor>
      ) : (
        <Anchor href={`https://dev-null.sh/@${mentioned}`} class="font-medium text-fg-accent hover:underline">
          {token}
        </Anchor>
      ),
    );
    last = match.index + token.length;
  }
  parts.push(...wordmarks(text.slice(last)));

  return parts;
}

/** /dev/null as its wordmark, as dev-null.sh draws it in prose (withWordmarks, AppWordmark): the second slash hollow. */
function wordmarks(text: string): ComponentChild[] {
  return text.split(WORDMARK_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <span title="/dev/null" class="whitespace-nowrap font-semibold tracking-tight">
        <span>
          /dev<span class="text-transparent [-webkit-text-stroke:max(1px,0.035em)_var(--color-lane-0)]">/</span>null
        </span>
      </span>
    ) : (
      part
    ),
  );
}

function CodeBlock({ segment }: { segment: Extract<BodySegment, { type: 'block' }> }) {
  const name = segment.filename ?? segment.language;

  return (
    <figure class="my-2 overflow-hidden rounded-md border border-border">
      {name && <figcaption class="border-b border-border bg-canvas-muted px-3 py-1 font-mono text-xs text-fg-muted">{name}</figcaption>}
      <pre class="m-0 overflow-x-auto bg-canvas-muted px-3 py-2.5 font-mono text-[13px] leading-normal">{highlighted(segment.html)}</pre>
    </figure>
  );
}

/**
 * The highlighter's HTML, rebuilt from text and `hl-*` spans only. /dev/null escapes it already; this page is
 * github.com, so nothing else from it is trusted. A template's content is inert: nothing in it runs or loads.
 */
function highlighted(html: string): ComponentChild[] {
  const template = document.createElement('template');
  template.innerHTML = html;

  const rebuild = (node: Node): ComponentChild[] =>
    [...node.childNodes].flatMap((child): ComponentChild[] => {
      if (child.nodeType === Node.TEXT_NODE) return [child.textContent ?? ''];
      if (!(child instanceof Element) || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return [];

      const children = rebuild(child);
      const className = child.getAttribute('class') ?? '';
      return child.tagName === 'SPAN' && HIGHLIGHT_CLASS.test(className) ? [<span class={className}>{children}</span>] : children;
    });

  return rebuild(template.content);
}
