import {
  MILESTONES,
  calculateMilestone,
  generateWhatsAppMessages,
  calculateNewStreakWithShield,
  calculateNewStreakByCycle,
  MAX_STREAK_SHIELDS,
  STREAK_DAYS_PER_SHIELD,
} from '../src/utils/gamification';

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
assert(m1.progressPercentage === 33, '1ª questão de 3 deve mostrar 33%');

// Aluno fez a 2ª questão
const m2 = calculateMilestone(2, 1);
assert(m2.target === 3, 'Meta da 2ª questão deve continuar 3');
assert(m2.remaining === 1, 'Resta 1 para bater 3');
assert(m2.progressPercentage === 67, '2ª questão de 3 deve mostrar 67%');

// Aluno desbloqueou 3 questões
const m3 = calculateMilestone(3, 2);
assert(m3.isMilestoneJustUnlocked === true, 'Deve indicar que marco acabou de ser desbloqueado');
assert(m3.unlockedTarget === 3, 'Marco desbloqueado deve ser 3');
assert(m3.nextTarget === 5, 'Próxima meta após 3 deve ser 5');
assert(m3.progressPercentage === 60, 'Ao desbloquear 3 com próxima meta 5, deve mostrar 60% (3/5)');
assert(
  Boolean(m3.nextMilestonePrompt?.includes('manter o embalo rumo às 5')),
  'Prompt do marco 3 deve convidar a manter o embalo'
);

// Aluno fez a 4ª questão
const m4 = calculateMilestone(4, 3);
assert(m4.target === 5, 'Meta atual da 4ª questão deve ser 5');
assert(m4.remaining === 1, 'Resta 1 para bater 5');
assert(m4.progressPercentage === 80, '4ª questão de 5 deve mostrar 80% (4/5)');

// Aluno fez a 8ª questão (caminho para o marco de 10)
const m8 = calculateMilestone(8, 7);
assert(m8.target === 10, 'Meta ao fazer 8 questões deve ser 10');
assert(m8.remaining === 2, 'Restam 2 questões para bater 10');
assert(m8.progressPercentage === 80, '8 questões de 10 deve mostrar exatamente 80% (8/10)');

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
    { nickname: 'Beatriz', streakDays: 5, unlockedMilestone: 5 },
    { nickname: 'Rodrigo', streakDays: 1 },
    { nickname: 'Ana', streakDays: 1 },
    { nickname: 'Mariana', streakDays: 2 },
    { nickname: 'Gabriel', streakDays: 4 },
    { nickname: 'Thiago', streakDays: 8 },
    { nickname: 'Bruna', streakDays: 8 },
  ],
  todayList: [
    { nickname: 'Carlos', streakDays: 4 },
  ],
  questionUrl: 'https://exemplo.com/q1',
  topicTitle: 'Geometria Espacial (ENEM)',
  cycleNumber: 2,
});

assert(messages.message1.includes('⚔️ *BOM DIA! MURAL DE ONTEM* 🎯'), 'Mensagem 1 deve ter título em *negrito* sem identificação de dia');
assert(messages.message1.includes('*8 mentes focadas mantiveram o ritmo firme*'), 'Mensagem 1 deve usar mentes focadas');
assert(messages.message1.includes('👏 Parabéns a quem manteve o ritmo firme!'), 'Mensagem 1 deve usar parabéns a quem');
assert(!messages.message1.includes('alunos'), 'Mensagem 1 não deve usar termo alunos');
assert(!messages.message1.includes('DIA #'), 'Mensagem 1 não deve conter identificador de dia');
assert(messages.message1.includes('🎯 *METAS BATIDAS ONTEM:*'), 'Mensagem 1 deve ter seção de metas batidas');
assert(messages.message1.includes('• *Beatriz* (Meta de 5 🏆)\n• *Lucas* (Meta de 3 🏆)'), 'Seção 1 deve estar em ordem alfabética');
assert(messages.message1.includes('🔥 *GARANTIRAM A 1ª QUESTÃO ONTEM:*'), 'Mensagem 1 deve ter seção de primeira questão');
assert(messages.message1.includes('• *Ana* (🔥 1º dia)\n• *Rodrigo* (🔥 1º dia)'), 'Seção 2 deve estar em ordem alfabética com (🔥 1º dia)');
assert(messages.message1.includes('⏳ *NA CARA DO GOL (Falta só 1 para a meta):*'), 'Mensagem 1 deve ter seção na cara do gol');
assert(messages.message1.includes('• *Gabriel* (Meta de 5 🎯)\n• *Mariana* (Meta de 3 🎯)'), 'Seção 3 deve estar em ordem alfabética');
assert(messages.message1.includes('⚡ *MANTIVERAM A OFENSIVA ACESA:*'), 'Mensagem 1 deve ter seção de ofensiva');
assert(messages.message1.includes('• *Bruna* (🔥 8 dias)\n• *Thiago* (🔥 8 dias)'), 'Seção 4 deve estar em ordem alfabética com marcadores');

assert(messages.message2.includes('🚀 *QUESTÃO DO DIA LIBERADA!*'), 'Mensagem 2 deve ter cabeçalho em *negrito* sem identificação de dia');
assert(messages.message2.includes('📌 ENEM — Matemática (com dicas guiadas se travar)'), 'Mensagem 2 deve conter ENEM — Matemática');
assert(messages.message2.includes('⚠️ *REGRA DO FOGO:*'), 'Mensagem 2 deve conter a seção Regra do Fogo');
assert(messages.message2.includes('Se pular o dia, *ZERA TUDO!*'), 'Mensagem 2 deve conter alerta de ZERA TUDO');
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
assert(messages.message3B.includes('Às 23h59 o sistema vira e quem não respondeu *ZERA A OFENSIVA*'), 'Mensagem 3B deve alertar que o sistema vira e zera a ofensiva');
assert(messages.message3B.includes('somar *+1 dia de ofensiva 🔥*'), 'Mensagem 3B deve conter ganho de ofensiva');
assert(messages.message3B.includes('👇 Quem ainda vai salvar a chama antes da meia-noite? Manda um 🔥!'), 'Mensagem 3B deve conter CTA de emoji');

// Teste 4: Regras do Protetor de Chama (Streak Shield)
console.log('\nTeste 4: Regras do Protetor de Chama (Streak Shield)');

// 4.1 Aluno novo (sem histórico)
const sNew = calculateNewStreakWithShield(undefined, 0, 1, 0);
assert(sNew.newStreak === 1, 'Aluno novo deve começar com ofensiva 1');
assert(sNew.newShields === 0, 'Aluno novo começa com 0 escudos');
assert(sNew.shieldWasUsed === false, 'Nenhum escudo usado para aluno novo');

// 4.2 Aluno faz dias consecutivos normais
const sDay2 = calculateNewStreakWithShield(1, 1, 2, 0);
assert(sDay2.newStreak === 2, 'Dia 2 consecutivo avança para streak 2');
assert(sDay2.newShields === 0, 'Ainda não atingiu 7 dias para escudo');

// 4.3 Aluno atinge 7 dias de ofensiva -> Conquista 1º Protetor
const sDay7 = calculateNewStreakWithShield(6, 6, 7, 0);
assert(sDay7.newStreak === 7, 'Atingiu 7 dias de ofensiva');
assert(sDay7.newShields === 1, 'Deve ganhar 1º Protetor ao atingir 7 dias');
assert(sDay7.earnedNewShield === true, 'Deve indicar que ganhou novo escudo');
assert(sDay7.shieldWasUsed === false, 'Escudo não foi usado');

// 4.4 Aluno atinge 14 dias de ofensiva com 1 escudo acumulado -> Conquista 2º Protetor
const sDay14 = calculateNewStreakWithShield(13, 13, 14, 1);
assert(sDay14.newStreak === 14, 'Atingiu 14 dias de ofensiva');
assert(sDay14.newShields === 2, 'Deve ganhar 2º Protetor ao atingir 14 dias');
assert(sDay14.earnedNewShield === true, 'Deve indicar ganho de escudo no dia 14');

// 4.5 Aluno atinge 21 dias de ofensiva já com 2 escudos (Teto Máximo = 2)
const sDay21 = calculateNewStreakWithShield(20, 20, 21, 2);
assert(sDay21.newStreak === 21, 'Atingiu 21 dias');
assert(sDay21.newShields === 2, 'Não deve ultrapassar o teto máximo de 2 escudos');
assert(sDay21.earnedNewShield === false, 'Não deve creditar acima do teto');

// 4.6 Aluno FALTOU 1 dia (pulou ciclo 5), mas TINHA 1 escudo (era ciclo 4, agora é ciclo 6)
const sSaved = calculateNewStreakWithShield(4, 4, 6, 1);
assert(sSaved.shieldWasUsed === true, 'Escudo deve ser acionado para salvar');
assert(sSaved.newStreak === 5, 'Ofensiva deve ser salva e incrementada para 5');
assert(sSaved.newShields === 0, 'Escudo deve ser consumido (1 - 1 = 0)');
assert(sSaved.usedInCycle === 5, 'Deve registrar que o escudo foi gasto no ciclo 5 faltante');

// 4.7 Aluno FALTOU 1 dia, mas NÃO TINHA escudo (era ciclo 4, agora é ciclo 6, 0 escudos)
const sLost = calculateNewStreakWithShield(4, 4, 6, 0);
assert(sLost.shieldWasUsed === false, 'Sem escudo para usar');
assert(sLost.newStreak === 1, 'Sem escudo, ofensiva zera e recomeça em 1');
assert(sLost.newShields === 0, 'Continua com 0 escudos');

// 4.8 Aluno FALTOU 2 dias inteiros (era ciclo 3, agora é ciclo 6), tendo apenas 1 escudo
const sDoubleMiss = calculateNewStreakWithShield(3, 3, 6, 1);
assert(sDoubleMiss.shieldWasUsed === false, '1 escudo não cobre 2 dias de falta');
assert(sDoubleMiss.newStreak === 1, 'Faltou 2 dias com apenas 1 escudo, ofensiva reinicia em 1');
assert(sDoubleMiss.newShields === 1, 'Mantém o escudo intacto para o futuro');

// 4.8b Aluno FALTOU 2 dias seguidos (era ciclo 3, agora é ciclo 6), e TINHA 2 escudos
const sTwoShieldsSaved = calculateNewStreakWithShield(3, 10, 6, 2);
assert(sTwoShieldsSaved.shieldWasUsed === true, '2 escudos devem salvar 2 dias de ausência');
assert(sTwoShieldsSaved.shieldsUsed === 2, 'Devem ser consumidos os 2 escudos');
assert(sTwoShieldsSaved.newStreak === 11, 'Ofensiva de 10 deve avançar para 11 salva');
assert(sTwoShieldsSaved.newShields === 0, '2 escudos foram gastos (2 - 2 = 0)');

// 4.9 Re-resolução do mesmo ciclo no mesmo dia
const sSameCycle = calculateNewStreakWithShield(5, 5, 5, 1);
assert(sSameCycle.newStreak === 5, 'Mesmo ciclo mantém a ofensiva');
assert(sSameCycle.newShields === 1, 'Mesmo ciclo mantém escudos');
assert(sSameCycle.shieldWasUsed === false, 'Nenhum escudo usado');

// 4.10 Retrocompatibilidade da função calculateNewStreakByCycle
assert(calculateNewStreakByCycle(4, 4, 6, 1) === 5, 'calculateNewStreakByCycle salva com escudo');
assert(calculateNewStreakByCycle(4, 4, 6, 0) === 1, 'calculateNewStreakByCycle zera sem escudo');
assert(calculateNewStreakByCycle(5, 5, 6) === 6, 'calculateNewStreakByCycle avança normalmente');

console.log('\n------------------------------------------------------');
console.log(' \x1b[32m✔ TODOS OS TESTES DE METAS E ESCUDOS PASSARAM COM SUCESSO!\x1b[0m\n');
