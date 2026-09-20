import { QuestionData, Alternative, PedagogicalStep } from '../types';
import { renderLatexInHtml } from './mathRenderer';

/**
 * Extracts clean slug or post ID from a Yes Matemática WordPress URL
 */
export function extractSlugOrIdFromUrl(inputUrl: string): { slug?: string; id?: string } {
  try {
    const trimmed = inputUrl.trim();
    if (!trimmed.includes('/') && !trimmed.includes('.')) {
      return { slug: trimmed };
    }

    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = url.pathname.replace(/^\/|\/$/g, '');
    const parts = pathname.split('/');
    const lastPart = parts[parts.length - 1] || '';

    const pParam = url.searchParams.get('p');
    if (pParam) {
      return { id: pParam };
    }

    return { slug: lastPart };
  } catch {
    return { slug: inputUrl.trim() };
  }
}

/**
 * Fetches a single post from Yes Matemática WordPress REST API
 */
export async function fetchWordPressPost(urlOrSlug: string): Promise<any> {
  const { slug, id } = extractSlugOrIdFromUrl(urlOrSlug);
  let endpoint = '';

  if (id) {
    endpoint = `https://www.yesmatematica.com/wp-json/wp/v2/posts/${id}`;
  } else if (slug) {
    endpoint = `https://www.yesmatematica.com/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`;
  } else {
    throw new Error('Link ou endereço inválido.');
  }

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Erro ao conectar ao blog Yes Matemática (${response.status})`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('Nenhuma questão encontrada com este link no blog.');
    }
    return data[0];
  }
  return data;
}

/**
 * Clean DOM-based parser for Yes Matemática WordPress posts.
 * Traverses native HTML elements, accurately detects alternatives, extracts math formulas,
 * and builds progressive pedagogical hints.
 */
export function parseWordPressPost(post: any): QuestionData {
  const rawTitle = post?.title?.rendered || 'Questão do Dia';
  const fullHtml = post?.content?.rendered || '';

  // Clean title entities
  const title = rawTitle
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&');

  // Infer Exam
  const examMatch = title.match(/(ENEM\s*\d{4}(?:\s*PPL)?)/i) || fullHtml.match(/\((ENEM\s*\d{4}(?:\s*PPL)?)\)/i);
  const exam = examMatch ? examMatch[1].toUpperCase() : 'ENEM';

  // Use DOMParser to parse HTML cleanly into nodes
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');

  // 1. Remove unwanted elements: Contact forms, opt-in/capture banners, scripts (preserve tables)
  const elementsToRemove = doc.querySelectorAll(
    '.wpcf7, .wp-block-contact-form-7, .capture, .uf, #uf-form-wrapper, [class*="capture"], [id*="capture"], script, style'
  );
  elementsToRemove.forEach((el) => el.remove());

  // Handle headings: filter promo headings, and truncate at social/comment cutoffs
  const allHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4'));
  let foundCutoff = false;
  for (const h of allHeadings) {
    const text = h.textContent?.trim().toLowerCase() || '';

    // Remove promo banners without stopping subsequent hints
    if (text.includes('projeto 850+') || text.includes('grupo de whatsapp')) {
      const banner = h.closest('figure, table, .wp-block-group, .capture, .uf') || h.closest('div');
      if (banner && banner !== doc.body) {
        banner.remove();
      } else {
        h.remove();
      }
      continue;
    }

    if (
      foundCutoff ||
      text.includes('comentário sobre a questão') ||
      text.includes('como foi a sua experiência') ||
      text.includes('resolução comentada') ||
      text.includes('provas resolvidas') ||
      text.includes('mais provas resolvidas') ||
      text.includes('prova amarela') ||
      text.includes('prova azul') ||
      text.includes('prova cinza') ||
      text.includes('prova rosa')
    ) {
      foundCutoff = true;
      let curr: Element | null = h;
      while (curr) {
        const next: Element | null = curr.nextElementSibling;
        curr.remove();
        curr = next;
      }
    }
  }

  // 2. Identify the correct answer letter with multi-strategy detection
  let correctLetter: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';
  const fullText = doc.body.textContent || '';

  // Strategy A: Scan HTML tags directly (robust against line breaks and formatting)
  const htmlPatterns = [
    /(?:resposta|gabarito)[\s\S]{0,300}?(?:alternativa|letra)\s*[:\-–]?\s*(?:<[^>]*>)?\s*([A-Ea-e])\b/i,
    /(?:resposta|gabarito)[\s\S]{0,300}?(?:alternativa|letra)\s*[:\-–]?\s*([A-Ea-e])\b/i,
    /(?:alternativa|letra)\s+correta\s*[:\-–]?\s*([A-Ea-e])\b/i,
    /<strong>\s*Alternativa\s*([A-Ea-e])\s*<\/strong>/i,
    /<strong>\s*Letra\s*([A-Ea-e])\s*<\/strong>/i,
    /(?:resposta|gabarito)\s*[:\-–]\s*(?:<[^>]*>)?\s*([A-Ea-e])\b/i
  ];

  for (const pat of htmlPatterns) {
    const match = fullHtml.match(pat);
    if (match && match[1]) {
      const candidate = match[1].toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(candidate)) {
        correctLetter = candidate as 'A' | 'B' | 'C' | 'D' | 'E';
        break;
      }
    }
  }

  // Strategy B: Multiline textContent scan if not found
  if (correctLetter === 'A') {
    const textPatterns = [
      /(?:resposta|gabarito)[\s\S]{0,200}?(?:alternativa|letra)?\s*[:\-–]?\s*([A-Ea-e])\b/i,
      /(?:alternativa|letra)\s+correta\s*[:\-–]?\s*([A-Ea-e])\b/i,
      /alternativa\s*([A-Ea-e])\b/i
    ];

    for (const pat of textPatterns) {
      const match = fullText.match(pat);
      if (match && match[1]) {
        const candidate = match[1].toUpperCase();
        if (['A', 'B', 'C', 'D', 'E'].includes(candidate)) {
          correctLetter = candidate as 'A' | 'B' | 'C' | 'D' | 'E';
          break;
        }
      }
    }
  }

  // 3. Segment the content into:
  // - Enunciado elements (everything before the first "Dicas e Resolução" or "Dica 1" heading)
  // - Step sections (grouped by subsequent headings)
  const childNodes = Array.from(doc.body.children);
  const enunciadoElements: Element[] = [];
  const sections: { title: string; elements: Element[] }[] = [];

  let currentSection: { title: string; elements: Element[] } | null = null;
  let hasStartedHints = false;

  for (const node of childNodes) {
    const tagName = node.tagName.toLowerCase();
    const isHeading = ['h1', 'h2', 'h3', 'h4'].includes(tagName);
    const headingText = isHeading ? node.textContent?.trim() || '' : '';
    const headingLower = headingText.toLowerCase();

    if (isHeading && (headingLower.includes('dica') || headingLower.includes('resposta') || headingLower.includes('conclusão'))) {
      hasStartedHints = true;
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headingText,
        elements: []
      };
      continue;
    }

    if (!hasStartedHints) {
      enunciadoElements.push(node);
    } else if (currentSection) {
      currentSection.elements.push(node);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // 4. Extract Alternatives from Enunciado
  // Must accurately match A), B., (C) but NOT Portuguese words like "A intensidade..."
  const alternatives: Alternative[] = [];
  const foundLetters = new Set<string>();
  const altRegex = /^(?:\(([A-Ea-e])\)|([A-Ea-e])(?:\)|\.|\s*[-–—]|\s+(?=[0-9\\(])))\s*(.*)$/;

  for (const el of enunciadoElements) {
    // Clone and replace <br> tags with newlines so textContent preserves line separation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = el.innerHTML.replace(/<br\s*[\/]?>/gi, '\n');
    const rawText = tempDiv.textContent || '';
    const lines = rawText.split('\n');
    for (const line of lines) {
      const match = line.trim().match(altRegex);
      if (match) {
        const letter = (match[1] || match[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        const rawVal = (match[3] || '').trim();
        if (!foundLetters.has(letter)) {
          foundLetters.add(letter);
          const renderedVal = renderLatexInHtml(rawVal || `Alternativa ${letter}`);
          alternatives.push({
            letter,
            value: renderedVal,
            isCorrect: letter === correctLetter,
            explanation: letter === correctLetter
              ? `Correto! A resposta é a alternativa ${letter}.`
              : `Alternativa incorreta.`
          });
        }
      }
    }
  }

  // Fallback alternatives if none parsed cleanly
  if (alternatives.length < 5) {
    alternatives.length = 0;
    (['A', 'B', 'C', 'D', 'E'] as const).forEach((letter) => {
      alternatives.push({
        letter,
        value: `Alternativa ${letter}`,
        isCorrect: letter === correctLetter,
        explanation: letter === correctLetter
          ? `Correto! A resposta é a alternativa ${letter}.`
          : `Alternativa incorreta.`
      });
    });
  }

  // 5. Build cleaned Enunciado HTML (excluding the elements that contain alternatives)
  const enunciadoContainer = document.createElement('div');
  enunciadoElements.forEach((el) => {
    const text = (el.textContent || '').trim();
    const isSingleAlt = altRegex.test(text);
    const hasMultipleAlts = (text.match(/[A-E](?:\)|\.|\s*[-–—])/g) || []).length >= 2;
    if (!isSingleAlt && !hasMultipleAlts) {
      enunciadoContainer.appendChild(el.cloneNode(true));
    }
  });
  const cleanedEnunciadoHtml = renderLatexInHtml(enunciadoContainer.innerHTML);

  // 6. Build Pedagogical Steps
  const steps: PedagogicalStep[] = [];
  let stepCounter = 1;

  for (const sec of sections) {
    const titleLower = sec.title.toLowerCase();

    // Skip the intro title "Dicas e Resolução"
    if (titleLower.includes('dicas e resolução')) {
      continue;
    }

    const container = document.createElement('div');
    sec.elements.forEach((el) => container.appendChild(el.cloneNode(true)));
    const htmlContent = renderLatexInHtml(container.innerHTML);

    if (titleLower.includes('resolução da dica') || titleLower.includes('resolucao da dica')) {
      const numMatch = sec.title.match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0], 10) : stepCounter;
      steps.push({
        id: `hint-res-${num}-${steps.length}`,
        type: 'hint-resolution',
        title: sec.title,
        subtitle: `Conferência do passo ${num}`,
        htmlContent
      });
    } else if (titleLower.startsWith('dica')) {
      const numMatch = sec.title.match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0], 10) : stepCounter++;
      steps.push({
        id: `hint-${num}-${steps.length}`,
        type: 'hint',
        stepNumber: num,
        title: sec.title,
        subtitle: `Direcionamento para continuar o raciocínio`,
        htmlContent
      });
    } else if (titleLower.includes('resposta') || titleLower.includes('conclusão')) {
      // Cross-check answer directly from this answer section
      const secText = container.textContent || '';
      const secMatch = secText.match(/(?:alternativa|letra)\s*([A-Ea-e])/i);
      if (secMatch) {
        correctLetter = secMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      }

      steps.push({
        id: `final-res-${steps.length}`,
        type: 'resolution',
        title: 'Conclusão e Gabarito Oficial',
        subtitle: `Alternativa ${correctLetter}`,
        htmlContent
      });
    } else {
      steps.push({
        id: `step-${steps.length}`,
        type: 'info',
        title: sec.title,
        htmlContent
      });
    }
  }

  // Ensure all alternatives have matching isCorrect and explanation
  alternatives.forEach((alt) => {
    alt.isCorrect = alt.letter === correctLetter;
    alt.explanation = alt.isCorrect
      ? `Correto! A resposta é a alternativa ${alt.letter}.`
      : `Alternativa incorreta.`;
  });

  // Infer difficulty if mentioned in post
  const diffMatch = fullHtml.match(/nível\s+(fácil|médio|medio|difícil|dificil)/i);
  const difficulty = diffMatch
    ? `Nível ${diffMatch[1].charAt(0).toUpperCase() + diffMatch[1].slice(1).toLowerCase().replace('medio', 'Médio').replace('dificil', 'Difícil')}`
    : 'Questão do Dia';

  return {
    id: post.id,
    title,
    exam,
    discipline: 'Matemática e suas Tecnologias',
    difficulty,
    enunciadoHtml: cleanedEnunciadoHtml,
    alternatives,
    correctLetter,
    steps,
    sourceUrl: post.link
  };
}
