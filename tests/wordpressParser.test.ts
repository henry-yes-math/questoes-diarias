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
// CASO 5: Remoção das cores de cadernos de prova (Prova Amarela, Cinza, Azul, Rosa)
// ----------------------------------------------------
console.log('\nCaso 5: Remoção de referências de cores de caderno de prova');

const mockPostWithColorBooklets = {
  id: 8627,
  title: { rendered: 'ENEM 2023 – Um tipo de semente necessita de bastante água' },
  content: {
    rendered: `
      <p>Um tipo de semente necessita de bastante água nos dois primeiros meses após o plantio.</p>
      <p>No início de qual desses meses o produtor deverá plantar esse tipo de semente?</p>
      <p>Questão 140 Prova Amarela, Questão 177 Prova Cinza, Questão 170 Prova Azul, Questão 146 Prova Rosa</p>
      <p>A) Outubro<br>B) Novembro<br>C) Dezembro<br>D) Janeiro<br>E) Fevereiro</p>
      <h2>Dicas e Resolução</h2>
      <p>Dica inicial</p>
      <h2>Dica 1</h2>
      <p>Texto da dica 1</p>
      <h2>Resposta</h2>
      <p>Alternativa C</p>
    `
  }
};
const q5 = parseWordPressPost(mockPostWithColorBooklets);

runTest('Deve remover parágrafo de cores de caderno isolado do enunciado', () => {
  assert.ok(!q5.enunciadoHtml.includes('Prova Amarela'));
  assert.ok(!q5.enunciadoHtml.includes('Prova Cinza'));
  assert.ok(!q5.enunciadoHtml.includes('Prova Azul'));
  assert.ok(!q5.enunciadoHtml.includes('Prova Rosa'));
  assert.ok(!q5.enunciadoHtml.includes('Questão 140'));
  assert.ok(q5.enunciadoHtml.includes('No início de qual desses meses o produtor deverá plantar'));
});

const mockPostWithColorsInlineAndBr = {
  id: 8628,
  title: { rendered: 'ENEM 2023 – Questão com cores com quebra de linha' },
  content: {
    rendered: `
      <p>Uma urna tem 5 bolas amarelas, 3 azuis e 2 rosas.<br>No início de qual desses meses o produtor deverá plantar?<br>Questão 140 Prova Amarela, Questão 177 Prova Cinza, Questão 170 Prova Azul, Questão 146 Prova Rosa</p>
      <p>A 10<br>B 20<br>C 30<br>D 40<br>E 50</p>
      <h2>Resposta</h2>
      <p>Alternativa A</p>
    `
  }
};
const q6 = parseWordPressPost(mockPostWithColorsInlineAndBr);

runTest('Deve remover as cores de prova com <br> e preservar o texto da pergunta e dados de probabilidade', () => {
  assert.ok(!q6.enunciadoHtml.includes('Prova Amarela'));
  assert.ok(!q6.enunciadoHtml.includes('Questão 140'));
  assert.ok(q6.enunciadoHtml.includes('No início de qual desses meses o produtor deverá plantar?'));
  // Bolas amarelas e azuis são parte do problema de probabilidade e DEVEM ser preservadas!
  assert.ok(q6.enunciadoHtml.includes('5 bolas amarelas, 3 azuis e 2 rosas'));
});

// ----------------------------------------------------
// CASO 6: Post com Conclusão em parágrafo e tabela de captura (Castelo de Liechtenstein)
// ----------------------------------------------------
console.log('\nCaso 6: Post com Conclusão em parágrafo e tabela de captura');
const mockPostLiechtenstein: WordPressRawPost = {
  id: 8511,
  title: { rendered: 'ENEM 2021 &#8211; Um parque temático brasileiro construiu uma réplica em miniatura do castelo de Liechtenstein' },
  content: {
    rendered: `
      <p>(ENEM 2021) Um parque temático brasileiro construiu uma réplica em miniatura do castelo de Liechtenstein.</p>
      <figure class="wp-block-image size-full"><img src="https://example.com/castelo.png" alt="castelo" /></figure>
      <p>O castelo possui uma ponte de 38,4 m de comprimento e 1,68 m de largura.</p>
      <p>A escala utilizada para fazer a réplica é</p>
      <p>A 1 : 576<br>B 1 : 240<br>C 1 : 24<br>D 1 : 4,2<br>E 1 : 2,4</p>
      <h2>Dicas e Resolução</h2>
      <p>IMPORTANTE: Tente resolver a questão por alguns minutos antes de consultar as dicas.</p>
      <h2>Dica 1</h2>
      <p>Converter metros para centímetros.</p>
      <h2>Resolução da Dica 1</h2>
      <p>38,4 m = 3840 cm e 1,68 m = 168 cm.</p>
      <h2>Dica 2</h2>
      <p>Dividir os valores correspondentes.</p>
      <h2>Resolução da Dica 2</h2>
      <p>3840 ÷ 160 = 24. A largura: 168 ÷ 7 = 24.</p>
      <p>Conclusão: <strong>a escala é de 1 : 24</strong></p>
      <figure class="wp-block-table"><table><tbody><tr><td><div class="capture uf"><a href="#">QUERO ENTRAR</a></div></td></tr></tbody></table></figure>
      <h2>Resposta</h2>
      <p>Alternativa C</p>
      <p>Essa questão é de nível fácil</p>
    `
  }
};
const q7 = parseWordPressPost(mockPostLiechtenstein);

runTest('Deve extrair 5 passos coesos sem passos vazios de captura', () => {
  assert.equal(q7.steps.length, 5);
  assert.equal(q7.steps[0].type, 'hint');
  assert.equal(q7.steps[1].type, 'hint-resolution');
  assert.equal(q7.steps[2].type, 'hint');
  assert.equal(q7.steps[3].type, 'hint-resolution');
  assert.equal(q7.steps[4].type, 'resolution');
});

runTest('Deve manter a frase de conclusão dentro da Resolução da Dica 2', () => {
  assert.ok(q7.steps[3].htmlContent.includes('Conclusão: <strong>a escala é de 1 : 24</strong>'));
});

runTest('Deve extrair a alternativa C como correta e remover alternativas do enunciado', () => {
  assert.equal(q7.correctLetter, 'C');
  assert.equal(q7.alternatives.length, 5);
  assert.equal(q7.alternatives[2].letter, 'C');
  assert.ok(q7.alternatives[2].isCorrect);
  assert.ok(!q7.enunciadoHtml.includes('A 1 : 576'));
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
