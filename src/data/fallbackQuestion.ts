import { QuestionData } from '../types';
import { renderLatexInHtml } from '../utils/mathRenderer';

export const INITIAL_QUESTION: QuestionData = {
  id: 8627,
  title: 'ENEM 2023 – Um tipo de semente necessita de bastante água nos dois primeiros meses após o plantio',
  exam: 'ENEM 2023',
  discipline: 'Matemática e suas Tecnologias',
  difficulty: 'Nível Fácil',
  sourceUrl: 'https://www.yesmatematica.com/enem-2023-um-tipo-de-semente-necessita-de-bastante-agua-nos-dois-primeiros-meses-apos-o-plantio/',
  enunciadoHtml: `
    <p>(ENEM 2023) Um tipo de semente necessita de bastante água nos dois primeiros meses após o plantio. Um produtor pretende estabelecer o melhor momento para o plantio desse tipo de semente, nos meses de outubro a março. Após consultar a previsão do índice mensal de precipitação de chuva (ImPC) da região onde ocorrerá o plantio, para o período chuvoso de 2020 – 2021, ele obteve os seguintes dados:</p>
    <ul class="wp-block-list">
      <li>outubro/2020: ImPC = 250 mm;</li>
      <li>novembro/2020: ImPC = 150 mm;</li>
      <li>dezembro/2020: ImPC = 200 mm;</li>
      <li>janeiro/2021: ImPC = 450 mm;</li>
      <li>fevereiro/2021: ImPC = 100 mm;</li>
      <li>março/2021: ImPC = 200 mm;</li>
    </ul>
    <p>Com base nessas previsões, ele precisa escolher dois meses consecutivos em que a média mensal de precipitação seja a maior possível.</p>
    <p class="font-medium text-stone-900 pt-1">No início de qual desses meses o produtor deverá plantar esse tipo de semente?</p>
  `,
  correctLetter: 'C',
  alternatives: [
    { letter: 'A', value: 'Outubro', isCorrect: false, explanation: 'Incorreto. A média de Outubro e Novembro é de 200 mm.' },
    { letter: 'B', value: 'Novembro', isCorrect: false, explanation: 'Incorreto. A média de Novembro e Dezembro é de 175 mm.' },
    { letter: 'C', value: 'Dezembro', isCorrect: true, explanation: 'Correto! A média de Dezembro/2020 e Janeiro/2021 é de 325 mm, a maior média entre todos os pares de meses consecutivos.' },
    { letter: 'D', value: 'Janeiro', isCorrect: false, explanation: 'Incorreto. A média de Janeiro e Fevereiro é de 275 mm.' },
    { letter: 'E', value: 'Fevereiro', isCorrect: false, explanation: 'Incorreto. A média de Fevereiro e Março é de 150 mm.' }
  ],
  steps: [
    {
      id: 'step-1',
      type: 'hint',
      stepNumber: 1,
      title: 'Dica 1',
      subtitle: 'Direcionamento para continuar o raciocínio',
      htmlContent: `
        <p>O produtor precisa escolher dois meses consecutivos em que a média mensal de precipitação seja a maior possível.</p>
        <p>Vamos começar analisando os meses de <strong>Outubro/2020</strong> e <strong>Novembro/2020</strong>:</p>
        <ul class="wp-block-list">
          <li>outubro/2020: ImPC = 250 mm;</li>
          <li>novembro/2020: ImPC = 150 mm;</li>
        </ul>
        <p class="font-medium text-stone-900 mt-2">Calcule a média de precipitação entre esses dois meses.</p>
      `
    },
    {
      id: 'step-2',
      type: 'hint-resolution',
      title: 'Resolução da Dica 1',
      subtitle: 'Conferência do passo 1',
      htmlContent: renderLatexInHtml(`
        <p>Média = \\( \\frac{250 + 150}{2} \\) = \\( \\frac{400}{2} \\) = <strong>200 mm</strong></p>
        <p class="text-stone-700">A média de precipitação nos meses de Outubro/2020 e Novembro/2020 foi de 200 mm.</p>
      `)
    },
    {
      id: 'step-3',
      type: 'hint',
      stepNumber: 2,
      title: 'Dica 2',
      subtitle: 'Direcionamento para continuar o raciocínio',
      htmlContent: `
        <p>Repita esse mesmo raciocínio calculando a média para os demais pares de meses consecutivos:</p>
        <ul class="wp-block-list">
          <li>Novembro/2020 e Dezembro/2020</li>
          <li>Dezembro/2020 e Janeiro/2021</li>
          <li>Janeiro/2021 e Fevereiro/2021</li>
          <li>Fevereiro/2021 e Março/2021</li>
        </ul>
      `
    },
    {
      id: 'step-4',
      type: 'hint-resolution',
      title: 'Resolução da Dica 2',
      subtitle: 'Conferência do passo 2',
      htmlContent: renderLatexInHtml(`
        <h3 class="wp-block-heading">Novembro/2020 – Dezembro/2020</h3>
        <ul class="wp-block-list">
          <li>novembro/2020: ImPC = 150 mm;</li>
          <li>dezembro/2020: ImPC = 200 mm;</li>
        </ul>
        <p>Média = \\( \\frac{150+200}{2} \\) = \\( \\frac{350}{2} \\) = <strong>175 mm</strong></p>

        <h3 class="wp-block-heading">Dezembro/2020 – Janeiro/2021</h3>
        <ul class="wp-block-list">
          <li>dezembro/2020: ImPC = 200 mm;</li>
          <li>janeiro/2021: ImPC = 450 mm;</li>
        </ul>
        <p>Média = \\( \\frac{200+450}{2} \\) = \\( \\frac{650}{2} \\) = <strong>325 mm</strong></p>

        <h3 class="wp-block-heading">Janeiro/2021 – Fevereiro/2021</h3>
        <ul class="wp-block-list">
          <li>janeiro/2021: ImPC = 450 mm;</li>
          <li>fevereiro/2021: ImPC = 100 mm;</li>
        </ul>
        <p>Média = \\( \\frac{450+100}{2} \\) = \\( \\frac{550}{2} \\) = <strong>275 mm</strong></p>

        <h3 class="wp-block-heading">Fevereiro/2021 – Março/2021</h3>
        <ul class="wp-block-list">
          <li>fevereiro/2021: ImPC = 100 mm;</li>
          <li>março/2021: ImPC = 200 mm;</li>
        </ul>
        <p>Média = \\( \\frac{100+200}{2} \\) = \\( \\frac{300}{2} \\) = <strong>150 mm</strong></p>
      `)
    },
    {
      id: 'step-5',
      type: 'hint',
      stepNumber: 3,
      title: 'Dica 3',
      subtitle: 'Direcionamento para continuar o raciocínio',
      htmlContent: `
        <p>A gente obteve as seguintes médias mensais para os meses consecutivos:</p>
        <figure class="wp-block-table">
          <table>
            <tbody>
              <tr><td>Meses</td><td>Média</td></tr>
              <tr><td>Out/20 – Nov/20</td><td>200 mm</td></tr>
              <tr><td>Nov/20 – Dez/20</td><td>175 mm</td></tr>
              <tr><td>Dez/20 – Jan/21</td><td>325 mm</td></tr>
              <tr><td>Jan/21 – Fev/21</td><td>275 mm</td></tr>
              <tr><td>Fev/21 – Mar/21</td><td>150 mm</td></tr>
            </tbody>
          </table>
        </figure>
        <p class="font-medium text-stone-900">Qual par de meses consecutivos tem a maior média?</p>
      `
    },
    {
      id: 'step-6',
      type: 'hint-resolution',
      title: 'Resolução da Dica 3',
      subtitle: 'Conferência do passo 3',
      htmlContent: `
        <p>A maior média é nos meses de <strong>Dez/20 – Jan/21 (325 mm)</strong>.</p>
        <p class="mt-2">Então <strong>o produtor deve plantar as sementes no início de Dezembro</strong>. Pois assim, ele irá aproveitar a maior média de chuvas ao longo dos meses de Dezembro/2020 e Janeiro/2021.</p>
      `
    },
    {
      id: 'step-7',
      type: 'resolution',
      title: 'Conclusão e Gabarito Oficial',
      subtitle: 'Alternativa C',
      htmlContent: `
        <div class="space-y-3">
          <p><strong>Alternativa C</strong></p>
          <div class="inline-block px-2.5 py-1 rounded bg-emerald-100/80 text-emerald-800 text-xs font-semibold">
            Nível Fácil
          </div>
          <p class="text-stone-700">
            A média de precipitação entre os meses consecutivos de Dezembro/2020 e Janeiro/2021 é de 325 mm, sendo a maior possível no período chuvoso. Dessa forma, o plantio deve ocorrer no início de <strong>Dezembro</strong>.
          </p>
        </div>
      `
    }
  ]
};
