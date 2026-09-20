import katex from 'katex';

/**
 * Parses raw text or HTML containing LaTeX expressions:
 * \( ... \) -> inline math
 * \[ ... \] -> display math
 * $$ ... $$ -> display math
 * and replaces them with clean KaTeX rendered HTML.
 */
export function renderLatexInHtml(html: string): string {
  if (!html) return '';

  let processed = html;

  // 1. Replace display math \[ ... \]
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => {
    try {
      return `<span class="katex-display-block my-2 inline-block">${katex.renderToString(tex.trim(), {
        throwOnError: false,
        displayMode: true
      })}</span>`;
    } catch {
      return tex;
    }
  });

  // 2. Replace display math $$ ... $$
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      return `<span class="katex-display-block my-2 inline-block">${katex.renderToString(tex.trim(), {
        throwOnError: false,
        displayMode: true
      })}</span>`;
    } catch {
      return tex;
    }
  });

  // 3. Replace inline math \( ... \)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        throwOnError: false,
        displayMode: false
      });
    } catch {
      return tex;
    }
  });

  return processed;
}
