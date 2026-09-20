import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseWordPressPost, WordPressRawPost } from '../src/utils/wordpressParser';

// Setup DOM in Node test runner
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Node = dom.window.Node;

function loadFixture(filename: string): WordPressRawPost {
  const filePath = path.resolve('./tests/fixtures', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  \x1b[31m✖\x1b[0m ${name}`);
    console.error(`    Erro: ${err.message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('  TESTES UNITÁRIOS DO PARSER WORDPRESS (OFFLINE)');
console.log('======================================================\n');

// ----------------------------------------------------
// CASO 1: Post de Geometria 2023 (Imagens + H2s normais)
// ----------------------------------------------------
console.log('Caso 1: Post de Geometria (ENEM 2023 PPL - Salão de Festas)');
const post1 = loadFixture('post-geometria-2023.json');
const q1 = parseWordPressPost(post1);

runTest('Deve detectar o exame como ENEM 2023 PPL', () => {
  assert.equal(q1.exam, 'ENEM 2023 PPL');
});

runTest('Deve extrair exatamente 5 alternativas (A, B, C, D, E)', () => {
  assert.equal(q1.alternatives.length, 5);
  assert.deepEqual(q1.alternatives.map(a => a.letter), ['A', 'B', 'C', 'D', 'E']);
});

runTest('Deve extrair os valores corretos das alternativas', () => {
  assert.equal(q1.alternatives[0].value, '3,25');
  assert.equal(q1.alternatives[3].value, '2,35');
});

runTest('Deve identificar a letra D como o gabarito oficial', () => {
  assert.equal(q1.correctLetter, 'D');
  const correctAlt = q1.alternatives.find(a => a.isCorrect);
  assert.equal(correctAlt?.letter, 'D');
});

runTest('Deve extrair 11 passos pedagógicos (5 pares dica/resolução + conclusão)', () => {
  assert.equal(q1.steps.length, 11);
  assert.equal(q1.steps[0].type, 'hint');
  assert.equal(q1.steps[1].type, 'hint-resolution');
  assert.equal(q1.steps[10].type, 'resolution');
});

runTest('O enunciado não deve conter as alternativas nem as dicas', () => {
  assert.ok(!q1.enunciadoHtml.includes('Dica 1'));
  assert.ok(q1.enunciadoHtml.includes('paralelepípedo reto retângulo'));
});

// ----------------------------------------------------
// CASO 2: Post de Probabilidade 2023 (LaTeX e Frações)
// ----------------------------------------------------
console.log('\nCaso 2: Post de Probabilidade & LaTeX (ENEM 2023 PPL - Computadores)');
const post2 = loadFixture('post-formulas-2023.json');
const q2 = parseWordPressPost(post2);

runTest('Deve extrair 5 alternativas com fórmulas KaTeX renderizadas', () => {
  assert.equal(q2.alternatives.length, 5);
  q2.alternatives.forEach(alt => {
    assert.ok(alt.value.includes('katex'), `Alternativa ${alt.letter} deve conter marcação KaTeX`);
  });
});

runTest('Deve identificar a letra B como o gabarito oficial', () => {
  assert.equal(q2.correctLetter, 'B');
  const correctAlt = q2.alternatives.find(a => a.isCorrect);
  assert.equal(correctAlt?.letter, 'B');
});

runTest('Deve extrair 8 passos com renderização matemática', () => {
  assert.equal(q2.steps.length, 8);
  assert.ok(q2.steps[2].htmlContent.includes('katex') || q2.steps[2].htmlContent.includes('math'));
});

// ----------------------------------------------------
// CASO 3: Post de 2018 com Vídeos do YouTube em <p>
// ----------------------------------------------------
console.log('\nCaso 3: Post de 2018 com Vídeos do YouTube (ENEM 2018 - Praça Circular)');
const post3 = loadFixture('post-video-2018.json');
const q3 = parseWordPressPost(post3);

runTest('Deve extrair 5 alternativas com o símbolo Pi em KaTeX', () => {
  assert.equal(q3.alternatives.length, 5);
  assert.ok(q3.alternatives[0].value.includes('4'));
  assert.ok(q3.alternatives[0].value.includes('katex'));
});

runTest('Deve identificar a letra D como o gabarito oficial', () => {
  assert.equal(q3.correctLetter, 'D');
  const correctAlt = q3.alternatives.find(a => a.isCorrect);
  assert.equal(correctAlt?.letter, 'D');
});

runTest('Deve fatiar os passos mesmo estando dentro de parágrafos <p>', () => {
  assert.equal(q3.steps.length, 6);
  assert.equal(q3.steps[0].title, 'Dica 1');
  assert.equal(q3.steps[1].title, 'Dica 2');
  assert.equal(q3.steps[2].title, 'Dica 3');
  assert.equal(q3.steps[3].title, 'Dica 4');
  assert.equal(q3.steps[4].title, 'Dica 4 Resolução');
});

runTest('Deve conter iframe/vídeo do YouTube embutido nos passos', () => {
  assert.ok(q3.steps[0].htmlContent.includes('youtube.com/embed') || q3.steps[0].htmlContent.includes('iframe'));
  assert.ok(q3.steps[1].htmlContent.includes('youtube.com/embed') || q3.steps[1].htmlContent.includes('iframe'));
  assert.ok(q3.steps[4].htmlContent.includes('youtube.com/embed') || q3.steps[4].htmlContent.includes('iframe'));
});

// ----------------------------------------------------
// CASO 4: Remoção de Legendas de Imagens (SEO)
// ----------------------------------------------------
console.log('Caso 4: Remoção de Legendas de Imagens (SEO)');
const mockPostWithCaptions: WordPressRawPost = {
  id: 9999,
  content: {
    rendered: `
      <p>Enunciado com imagem e legenda.</p>
      <figure class="wp-block-image">
        <img src="https://example.com/grafico.png" alt="Grafico da Questao" />
        <figcaption class="wp-element-caption">Figura 1: Gráfico auxiliar para SEO no Google</figcaption>
      </figure>
      <div class="wp-caption">
        <img src="https://example.com/figura2.png" />
        <p class="wp-caption-text">Legenda de rodapé descartável</p>
      </div>
      <p>A 1<br>B 2<br>C 3<br>D 4<br>E 5</p>
      <h2>Dica 1</h2>
      <figure class="wp-block-image">
        <img src="https://example.com/passo1.png" />
        <figcaption>Legenda técnica que não deve aparecer</figcaption>
      </figure>
      <p>Texto da dica 1</p>
      <h2>Resposta</h2>
      <p>Alternativa A</p>
    `
  }
};
const q4 = parseWordPressPost(mockPostWithCaptions);

runTest('Deve remover figcaption e legendas de imagem do enunciado', () => {
  assert.ok(!q4.enunciadoHtml.includes('Figura 1: Gráfico auxiliar'));
  assert.ok(!q4.enunciadoHtml.includes('Legenda de rodapé descartável'));
  assert.ok(!q4.enunciadoHtml.includes('figcaption'));
  assert.ok(!q4.enunciadoHtml.includes('wp-caption-text'));
  assert.ok(q4.enunciadoHtml.includes('grafico.png'));
  assert.ok(q4.enunciadoHtml.includes('figura2.png'));
});

runTest('Deve remover figcaption dos passos/dicas', () => {
  const stepWithImg = q4.steps.find(s => s.htmlContent.includes('passo1.png'));
  assert.ok(stepWithImg);
  assert.ok(!stepWithImg.htmlContent.includes('Legenda técnica que não deve aparecer'));
  assert.ok(!stepWithImg.htmlContent.includes('figcaption'));
});

// ----------------------------------------------------
// Resumo dos Resultados
// ----------------------------------------------------
console.log('\n------------------------------------------------------');
if (failed === 0) {
  console.log(`\x1b[32m✔ TODOS OS ${passed} TESTES PASSARAM COM SUCESSO!\x1b[0m\n`);
  process.exit(0);
} else {
  console.error(`\x1b[31m✖ ${failed} TESTE(S) FALHARAM. (${passed} passaram)\x1b[0m\n`);
  process.exit(1);
}
