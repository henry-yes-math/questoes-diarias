import { MILESTONES, calculateMilestone, generateWhatsAppMessages } from '../src/utils/gamification';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  }
}

console.log('======================================================');
console.log('  TESTES UNITÁRIOS DE GAMIFICAÇÃO & METAS');
console.log('======================================================');

// Teste 1: Sequência de Marcos
console.log('\nTeste 1: Verificação da sequência de marcos');
assert(MILESTONES[0] === 3, 'Primeiro marco deve ser 3');
assert(MILESTONES[1] === 5, 'Segundo marco deve ser 5');
assert(MILESTONES[2] === 7, 'Terceiro marco deve ser 7');
assert(MILESTONES[3] === 10, 'Quarto marco deve ser 10');
assert(MILESTONES[4] === 15, 'Quinto marco deve ser 15');
assert(MILESTONES[5] === 20, 'Sexto marco deve ser 20');
assert(MILESTONES[6] === 25, 'Sétimo marco deve ser 25');
assert(MILESTONES[7] === 30, 'Oitavo marco deve ser 30');
assert(MILESTONES[8] === 35, 'Nono marco deve ser 35');
assert(MILESTONES[9] === 40, 'Décimo marco deve ser 40');
assert(MILESTONES[10] === 45, 'Décimo primeiro marco deve ser 45');
assert(MILESTONES[11] === 50, 'Décimo segundo marco deve ser 50');

// Teste 2: Cálculos de transição
console.log('\nTeste 2: Transição e desbloqueio de marcos');

// Aluno fez a 1ª questão
const m1 = calculateMilestone(1, 0);
assert(m1.isFirstQuestion === true, '1ª questão deve ser identificada como isFirstQuestion');
assert(m1.target === 3, 'Meta da 1ª questão deve ser 3');
assert(m1.remaining === 2, 'Restam 2 para a meta de 3');

// Aluno fez a 2ª questão
const m2 = calculateMilestone(2, 1);
assert(m2.target === 3, 'Meta da 2ª questão deve continuar 3');
assert(m2.remaining === 1, 'Resta 1 para bater 3');

// Aluno desbloqueou 3 questões
const m3 = calculateMilestone(3, 2);
assert(m3.isMilestoneJustUnlocked === true, 'Deve indicar que marco acabou de ser desbloqueado');
assert(m3.unlockedTarget === 3, 'Marco desbloqueado deve ser 3');
assert(m3.nextTarget === 5, 'Próxima meta após 3 deve ser 5');
assert(
  Boolean(m3.nextMilestonePrompt?.includes('manter o embalo rumo às 5')),
  'Prompt do marco 3 deve convidar a manter o embalo'
);

// Aluno fez a 4ª questão
const m4 = calculateMilestone(4, 3);
assert(m4.target === 5, 'Meta atual da 4ª questão deve ser 5');
assert(m4.remaining === 1, 'Resta 1 para bater 5');

// Aluno desbloqueou 5 questões
const m5 = calculateMilestone(5, 4);
assert(m5.isMilestoneJustUnlocked === true, 'Deve indicar desbloqueio ao atingir 5');
assert(m5.unlockedTarget === 5, 'Marco desbloqueado deve ser 5');
assert(m5.nextTarget === 7, 'Próxima meta após 5 deve ser 7');
assert(
  Boolean(m5.nextMilestonePrompt?.includes('buscar a meta de 7')),
  'Prompt do marco 5 deve incentivar a meta de 7'
);

// Aluno desbloqueou 7 questões
const m7 = calculateMilestone(7, 6);
assert(m7.unlockedTarget === 7, 'Marco desbloqueado deve ser 7');
assert(m7.nextTarget === 10, 'Próxima meta após 7 deve ser 10');
assert(
  !m7.celebrationMessage?.includes('invicta'),
  'Mensagem do marco 7 não deve conter "invicta"'
);
assert(
  Boolean(m7.celebrationMessage?.includes('consistência incrível')),
  'Mensagem do marco 7 deve valorizar consistência'
);

// Aluno desbloqueou 10 questões
const m10 = calculateMilestone(10, 9);
assert(m10.unlockedTarget === 10, 'Marco desbloqueado deve ser 10');
assert(m10.nextTarget === 15, 'Próxima meta após 10 deve ser 15');
assert(
  Boolean(m10.celebrationMessage?.includes('dois dígitos')),
  'Mensagem do marco 10 deve celebrar os dois dígitos'
);

// Aluno desbloqueou 40 questões
const m40 = calculateMilestone(40, 39);
assert(m40.unlockedTarget === 40, 'Marco desbloqueado deve ser 40');
assert(m40.nextTarget === 45, 'Próxima meta após 40 deve ser 45');

// Teste 3: Mensagens de WhatsApp com formatação nativa em negrito
console.log('\nTeste 3: Mensagens do WhatsApp com formatação *negrito*');
const messages = generateWhatsAppMessages({
  yesterdayList: [
    { nickname: 'Lucas', streakDays: 3, unlockedMilestone: 3 },
    { nickname: 'Maria', streakDays: 1 },
  ],
  todayList: [
    { nickname: 'Carlos', streakDays: 4 },
  ],
  questionUrl: 'https://exemplo.com/q1',
  topicTitle: 'Geometria Espacial (ENEM)',
  cycleNumber: 2,
});

assert(messages.message1.includes('⚔️ *BOM DIA! MURAL DE ONTEM* 🎯'), 'Mensagem 1 deve ter título em *negrito* sem identificação de dia');
assert(messages.message1.includes('*2 mentes focadas mantiveram o ritmo firme*'), 'Mensagem 1 deve usar mentes focadas');
assert(messages.message1.includes('👏 Parabéns a quem manteve o ritmo firme!'), 'Mensagem 1 deve usar parabéns a quem');
assert(!messages.message1.includes('alunos'), 'Mensagem 1 não deve usar termo alunos');
assert(!messages.message1.includes('DIA #'), 'Mensagem 1 não deve conter identificador de dia');
assert(messages.message1.includes('01. *Lucas* (🔥 3 dias) 🎖️ *Marco de 3 Questões!*'), 'Mensagem 1 deve destacar apelido e marco em *negrito*');

assert(messages.message2.includes('🚀 *QUESTÃO DO DIA LIBERADA!*'), 'Mensagem 2 deve ter cabeçalho em *negrito* sem identificação de dia');
assert(messages.message2.includes('📌 ENEM — Matemática (com dicas guiadas se travar)'), 'Mensagem 2 deve conter ENEM — Matemática');
assert(messages.message2.includes('⚠️ *REGRA DO FOGO:*'), 'Mensagem 2 deve conter a seção Regra do Fogo');
assert(messages.message2.includes('Quem vai ser a 1ª pessoa a inaugurar o Mural de hoje? 👀'), 'Mensagem 2 deve usar 1ª pessoa a inaugurar');
assert(messages.message2.includes('*Quem tá chegando agora:*'), 'Mensagem 2 deve acolher quem está chegando');
assert(messages.message2.includes('🔗 *FAÇA AGORA (3 a 5 min):*'), 'Mensagem 2 deve destacar link de ação em *negrito*');
assert(messages.message2.includes('👇 Vai manter sua chama acesa? Manda um 🔥!'), 'Mensagem 2 deve convidar a mandar o emoji de fogo');

assert(messages.message3A.includes('🔥 *QUEM JÁ SALVOU A OFENSIVA HOJE:* 🔥'), 'Mensagem 3A deve listar quem já salvou a ofensiva');
assert(messages.message3A.includes('*1 fera já garantiu a presença*'), 'Mensagem 3A deve usar fera(s)');
assert(!messages.message3A.includes('guerreiros'), 'Mensagem 3A não deve usar termo guerreiros');
assert(!messages.message3A.includes('DIA #'), 'Mensagem 3A não deve conter identificador de dia');
assert(messages.message3B.includes('🌙 *TURMA DA NOITE: AINDA DÁ TEMPO!*'), 'Mensagem 3B deve destacar chamada da noite em *negrito*');
assert(messages.message3B.includes('⚠️ *PRAZO: ATÉ A MEIA-NOITE (23h59)*'), 'Mensagem 3B deve conter aviso explícito de prazo até meia-noite');
assert(messages.message3B.includes('*ZERA A OFENSIVA*'), 'Mensagem 3B deve conter aviso de que zera a ofensiva');
assert(messages.message3B.includes('somar *+1 dia de ofensiva 🔥*'), 'Mensagem 3B deve conter ganho de ofensiva');
assert(messages.message3B.includes('👇 Quem ainda vai salvar a chama antes da meia-noite? Manda um 🔥!'), 'Mensagem 3B deve conter CTA de emoji');

console.log('\n------------------------------------------------------');
console.log(' \x1b[32m✔ TODOS OS TESTES DE METAS PASSARAM COM SUCESSO!\x1b[0m\n');
