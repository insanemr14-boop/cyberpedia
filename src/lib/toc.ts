import type { MarkdownHeading } from 'astro';

export interface TocNode extends MarkdownHeading {
  children: TocNode[];
}

/**
 * Turns Astro's flat heading list into a two-level tree for the table of
 * contents. Only h2 and h3 are included — deeper levels make the TOC noisy
 * and h1 is the article title, which is not part of the body.
 */
export function buildToc(headings: MarkdownHeading[]): TocNode[] {
  const tree: TocNode[] = [];

  for (const heading of headings) {
    if (heading.depth < 2 || heading.depth > 3) continue;

    const node: TocNode = { ...heading, children: [] };

    if (heading.depth === 2 || tree.length === 0) {
      tree.push(node);
    } else {
      tree[tree.length - 1].children.push(node);
    }
  }

  return tree;
}
