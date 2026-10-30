import {
  MILESTONES,
  calculateMilestone,
  generateWhatsAppMessages,
  calculateNewStreakWithShield,
  calculateNewStreakByCycle,
  MAX_STREAK_SHIELDS,
  QUESTIONS_PER_SHIELD,
  getQuestionsUntilNextShield,
  generateGroupShareWhatsAppUrl,
  DEFAULT_WHATSAPP_GROUP_URL,
  resolveWhatsappGroupUrl,
  syncSelectedLetterWithCompletion,
  hasStudentCompletedCurrentQuestion,
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
assert(messages.message1.includes('• *Beatriz* (Meta 5 🏆)\n• *Lucas* (Meta 3 🏆)'), 'Seção 1 deve estar em ordem alfabética');
assert(messages.message1.includes('🔥 *GARANTIRAM A 1ª QUESTÃO ONTEM:*'), 'Mensagem 1 deve ter seção de primeira questão');
assert(messages.message1.includes('• *Ana* (🔥 1º dia)\n• *Rodrigo* (🔥 1º dia)'), 'Seção 2 deve estar em ordem alfabética com (🔥 1º dia)');
assert(messages.message1.includes('⏳ *NA CARA DO GOL (Falta só 1 para a meta):*'), 'Mensagem 1 deve ter seção na cara do gol');
assert(messages.message1.includes('• *Gabriel* (Meta 5 🎯)\n• *Mariana* (Meta 3 🎯)'), 'Seção 3 deve estar em ordem alfabética');
assert(messages.message1.includes('⚡ *MANTIVERAM A OFENSIVA ACESA:*'), 'Mensagem 1 deve ter seção de ofensiva');
assert(messages.message1.includes('• *Bruna* (🔥 8 dias)\n• *Thiago* (🔥 8 dias)'), 'Seção 4 deve estar em ordem alfabética com marcadores');
assert(messages.message1.includes('https://tinyurl.com/enem-questoes-diarias'), 'Mensagem 1 deve incluir o link de convite do grupo no rodapé');

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
assert(messages.messageInviteA.includes('ajudar amigos a treinar Matemática todo dia, é só encaminhar a mensagem abaixo pra eles ou pro seu grupo de estudos! 👇'), 'Mensagem de convite Parte 1 deve conter o pedido para a turma');
assert(messages.messageInviteB.includes('Link para entrar:\nhttps://tinyurl.com/enem-questoes-diarias'), 'Mensagem de convite Parte 2 deve conter a chamada espontânea e o link');

// Teste 4: Regras do Protetor de Chama (Streak Shield) - A cada 6 questões resolvidas
console.log('\nTeste 4: Regras do Protetor de Chama (Streak Shield - 2ª questão e a cada 6 questões)');

assert(QUESTIONS_PER_SHIELD === 6, 'Constante QUESTIONS_PER_SHIELD deve ser 6');
assert(MAX_STREAK_SHIELDS === 2, 'Teto máximo MAX_STREAK_SHIELDS deve ser 2');

// 4.1 Aluno novo (sem histórico) na 1ª questão
const sNew = calculateNewStreakWithShield(undefined, 0, 1, 0, 1);
assert(sNew.newStreak === 1, 'Aluno novo deve começar com ofensiva 1');
assert(sNew.newShields === 0, 'Aluno novo começa com 0 escudos na 1ª questão');
assert(sNew.shieldWasUsed === false, 'Nenhum escudo usado para aluno novo');

// 4.2 Aluno faz 3ª questão consecutiva (já tendo 1 escudo da 2ª questão)
const sDay3 = calculateNewStreakWithShield(2, 2, 3, 1, 3);
assert(sDay3.newStreak === 3, 'Dia 3 consecutivo avança para streak 3');
assert(sDay3.newShields === 1, 'Mantém 1 escudo na 3ª questão');
assert(sDay3.earnedNewShield === false, 'Não ganha escudo na 3ª questão');

// 4.3 Aluno atinge 6 questões resolvidas -> Conquista novo Protetor
const sQuestion6 = calculateNewStreakWithShield(5, 5, 6, 0, 6);
assert(sQuestion6.newStreak === 6, 'Atingiu 6 dias de ofensiva');
assert(sQuestion6.newShields === 1, 'Deve ganhar Protetor ao atingir 6 questões resolvidas');
assert(sQuestion6.earnedNewShield === true, 'Deve indicar que ganhou novo escudo na 6ª questão');
assert(sQuestion6.shieldWasUsed === false, 'Escudo não foi usado');

// 4.3b Aluno atinge 6 questões resolvidas MESMO SEM SER EM DIAS CONSECUTIVOS (pulou ciclos sem escudo)
const sQuestion6NonConsecutive = calculateNewStreakWithShield(2, 2, 10, 0, 6);
assert(sQuestion6NonConsecutive.newStreak === 1, 'Ofensiva reinicia em 1 pois pulou ciclos sem escudo');
assert(sQuestion6NonConsecutive.newShields === 1, 'Ganha +1 escudo na 6ª questão mesmo sem dias consecutivos');
assert(sQuestion6NonConsecutive.earnedNewShield === true, 'earnedNewShield deve ser true na 6ª questão não consecutiva');

// 4.4 Aluno atinge 12 questões resolvidas com 1 escudo acumulado -> Conquista 2º Protetor
const sQuestion12 = calculateNewStreakWithShield(11, 11, 12, 1, 12);
assert(sQuestion12.newStreak === 12, 'Atingiu 12 dias de ofensiva');
assert(sQuestion12.newShields === 2, 'Deve ganhar 2º Protetor ao atingir 12 questões');
assert(sQuestion12.earnedNewShield === true, 'Deve indicar ganho de escudo na 12ª questão');

// 4.5 Aluno atinge 18 questões resolvidas já com 2 escudos (Teto Máximo = 2)
const sQuestion18 = calculateNewStreakWithShield(17, 17, 18, 2, 18);
assert(sQuestion18.newStreak === 18, 'Atingiu 18 dias');
assert(sQuestion18.newShields === 2, 'Não deve ultrapassar o teto máximo de 2 escudos');
assert(sQuestion18.earnedNewShield === false, 'Não deve creditar acima do teto');

// 4.6 Aluno FALTOU 1 dia (pulou ciclo 5), mas TINHA 1 escudo (era ciclo 4, agora é ciclo 6, 5ª questão)
const sSaved = calculateNewStreakWithShield(4, 4, 6, 1, 5);
assert(sSaved.shieldWasUsed === true, 'Escudo deve ser acionado para salvar');
assert(sSaved.newStreak === 5, 'Ofensiva deve ser salva e incrementada para 5');
assert(sSaved.newShields === 0, 'Escudo deve ser consumido (1 - 1 = 0)');
assert(sSaved.usedInCycle === 5, 'Deve registrar que o escudo foi gasto no ciclo 5 faltante');

// 4.6b Aluno FALTOU 1 dia (usou 1 escudo) E hoje completa exatamente sua 6ª questão -> usa 1 escudo e ganha +1 na mesma submissão!
const sSavedAndRecharged = calculateNewStreakWithShield(5, 5, 7, 1, 6);
assert(sSavedAndRecharged.shieldWasUsed === true, 'Escudo deve ser usado para cobrir a falta');
assert(sSavedAndRecharged.newStreak === 6, 'Ofensiva avança para 6');
assert(sSavedAndRecharged.earnedNewShield === true, 'Deve ganhar +1 escudo por completar a 6ª questão');
assert(sSavedAndRecharged.newShields === 1, 'Saldo final deve ser 1 (1 usado -> 0 + 1 ganho = 1)');

// 4.7 Aluno FALTOU 1 dia, mas NÃO TINHA escudo (era ciclo 4, agora é ciclo 6, 0 escudos, 5ª questão)
const sLost = calculateNewStreakWithShield(4, 4, 6, 0, 5);
assert(sLost.shieldWasUsed === false, 'Sem escudo para usar');
assert(sLost.newStreak === 1, 'Sem escudo, ofensiva zera e recomeça em 1');
assert(sLost.newShields === 0, 'Continua com 0 escudos');

// 4.8 Aluno FALTOU 2 dias inteiros (era ciclo 3, agora é ciclo 6), tendo apenas 1 escudo (4ª questão)
const sDoubleMiss = calculateNewStreakWithShield(3, 3, 6, 1, 4);
assert(sDoubleMiss.shieldWasUsed === false, '1 escudo não cobre 2 dias de falta');
assert(sDoubleMiss.newStreak === 1, 'Faltou 2 dias com apenas 1 escudo, ofensiva reinicia em 1');
assert(sDoubleMiss.newShields === 1, 'Mantém o escudo intacto para o futuro');

// 4.8b Aluno FALTOU 2 dias seguidos (era ciclo 3, agora é ciclo 6), e TINHA 2 escudos (11ª questão)
const sTwoShieldsSaved = calculateNewStreakWithShield(3, 10, 6, 2, 11);
assert(sTwoShieldsSaved.shieldWasUsed === true, '2 escudos devem salvar 2 dias de ausência');
assert(sTwoShieldsSaved.shieldsUsed === 2, 'Devem ser consumidos os 2 escudos');
assert(sTwoShieldsSaved.newStreak === 11, 'Ofensiva de 10 deve avançar para 11 salva');
assert(sTwoShieldsSaved.newShields === 0, '2 escudos foram gastos (2 - 2 = 0)');

// 4.9 Re-resolução do mesmo ciclo no mesmo dia
const sSameCycle = calculateNewStreakWithShield(5, 5, 5, 1, 5);
assert(sSameCycle.newStreak === 5, 'Mesmo ciclo mantém a ofensiva');
assert(sSameCycle.newShields === 1, 'Mesmo ciclo mantém escudos');
assert(sSameCycle.shieldWasUsed === false, 'Nenhum escudo usado');

// 4.10 Retrocompatibilidade da função calculateNewStreakByCycle
assert(calculateNewStreakByCycle(4, 4, 6, 1, 5) === 5, 'calculateNewStreakByCycle salva com escudo');
assert(calculateNewStreakByCycle(4, 4, 6, 0, 5) === 1, 'calculateNewStreakByCycle zera sem escudo');
assert(calculateNewStreakByCycle(5, 5, 6, 0, 6) === 6, 'calculateNewStreakByCycle avança normalmente');

// 4.11 Cálculo de quantas questões faltam para o próximo escudo (getQuestionsUntilNextShield)
assert(getQuestionsUntilNextShield(0, 0).nextShieldTarget === 2 && getQuestionsUntilNextShield(0, 0).remainingQuestions === 2, 'Com 0 questões, faltam 2 para o 1º escudo (meta 2)');
assert(getQuestionsUntilNextShield(1, 0).nextShieldTarget === 2 && getQuestionsUntilNextShield(1, 0).remainingQuestions === 1, 'Com 1 questão, falta 1 para o 1º escudo (meta 2)');
assert(getQuestionsUntilNextShield(2, 1).nextShieldTarget === 6 && getQuestionsUntilNextShield(2, 1).remainingQuestions === 4, 'Com 2 questões e 1 escudo, faltam 4 para o próximo escudo (meta 6)');
assert(getQuestionsUntilNextShield(5, 1).nextShieldTarget === 6 && getQuestionsUntilNextShield(5, 1).remainingQuestions === 1, 'Com 5 questões e 1 escudo, falta 1 para o próximo escudo (meta 6)');
assert(getQuestionsUntilNextShield(6, 1).nextShieldTarget === 12 && getQuestionsUntilNextShield(6, 1).remainingQuestions === 6, 'Com 6 questões e 1 escudo, faltam 6 para o próximo escudo (meta 12)');
assert(getQuestionsUntilNextShield(6, 2).remainingQuestions === 0, 'Com 2 escudos (teto), remainingQuestions deve ser 0');

// ====================================================
// TESTE 5: Concessão do 1º Escudo na 2ª Questão (Onboarding)
// ====================================================
console.log('\nTeste 5: Concessão do 1º Escudo na 2ª Questão Feita');

// 5.1 Aluno completando a 1ª questão (newTotal: 1) -> sem escudo
const q1Res = calculateNewStreakWithShield(undefined, 0, 1, 0, 1);
assert(q1Res.newShields === 0, '1ª questão não deve conceder escudo');
assert(q1Res.earnedNewShield === false, 'earnedNewShield deve ser false na 1ª questão');

// 5.2 Aluno completando a 2ª questão consecutiva (newTotal: 2, 0 escudos prévios) -> ganha 1º escudo
const q2Res = calculateNewStreakWithShield(1, 1, 2, 0, 2);
assert(q2Res.newShields === 1, '2ª questão deve conceder o 1º escudo de ofensiva');
assert(q2Res.earnedNewShield === true, 'earnedNewShield deve ser true na 2ª questão');
assert(q2Res.newStreak === 2, 'Ofensiva avança para 2 dias normalmente');

// 5.3 Aluno completando a 2ª questão tendo faltado ciclos (não consecutivo) -> ganha escudo mesmo assim
const q2LateRes = calculateNewStreakWithShield(1, 1, 5, 0, 2);
assert(q2LateRes.newShields === 1, '2ª questão deve conceder escudo mesmo se não for ciclo consecutivo');
assert(q2LateRes.earnedNewShield === true, 'earnedNewShield deve ser true na 2ª questão não consecutiva');

// 5.4 Aluno que já tinha 1 escudo por convite/amigo ao fazer a 2ª questão -> atinge 2 escudos (teto)
const q2WithInviteShield = calculateNewStreakWithShield(1, 1, 2, 1, 2);
assert(q2WithInviteShield.newShields === 2, 'Deve acumular o 2º escudo somado ao escudo de convite');
assert(q2WithInviteShield.earnedNewShield === true, 'earnedNewShield deve ser true ao acumular');

// 5.5 Aluno que já tinha 2 escudos (teto máximo) ao fazer a 2ª questão -> não ultrapassa teto
const q2MaxShields = calculateNewStreakWithShield(1, 1, 2, 2, 2);
assert(q2MaxShields.newShields === 2, 'Não deve ultrapassar o teto máximo de 2 escudos');

// 5.6 Aluno completando a 3ª questão (newTotal: 3) -> não ganha novo escudo de 2ª questão
const q3Res = calculateNewStreakWithShield(2, 2, 3, 1, 3);
assert(q3Res.newShields === 1, '3ª questão não deve conceder novo escudo');
assert(q3Res.earnedNewShield === false, 'earnedNewShield deve ser false na 3ª questão');

// ====================================================
// TESTE 6: Compartilhamento nos Grupos de Estudo do WhatsApp
// ====================================================
console.log('\nTeste 6: Compartilhamento nos Grupos de Estudo do WhatsApp');

const customGroupUrl = 'https://chat.whatsapp.com/Jaw0218SuCz6tMC7pez9UT';
const shareUrlCustom = generateGroupShareWhatsAppUrl(customGroupUrl);

assert(
  shareUrlCustom.startsWith('https://api.whatsapp.com/send?text='),
  'Deve gerar URL com protocolo correto da API do WhatsApp'
);

const decodedCustom = decodeURIComponent(shareUrlCustom.replace('https://api.whatsapp.com/send?text=', ''));
assert(
  decodedCustom.includes('Tô participando desse grupo de Matemática pro ENEM e tá valendo muito a pena.'),
  'Deve conter a abertura espontânea na voz do aluno ("Tô participando desse grupo...")'
);
assert(
  decodedCustom.includes('Todo dia a gente resolve 1 questão que tem alto peso no TRI, com dicas passo a passo se precisar.'),
  'Deve conter o miolo destacando 1 questão com alto peso no TRI e dicas passo a passo se precisar'
);
assert(
  decodedCustom.includes(`Link para entrar:\n${customGroupUrl}`),
  'Deve incluir o fechamento Link para entrar com o link oficial do grupo do WhatsApp'
);

// Fallback quando não há URL customizada ou ela está em branco
const shareUrlFallback = generateGroupShareWhatsAppUrl();
const decodedFallback = decodeURIComponent(shareUrlFallback.replace('https://api.whatsapp.com/send?text=', ''));
assert(
  decodedFallback.includes(`Link para entrar:\n${DEFAULT_WHATSAPP_GROUP_URL}`),
  'Deve usar fallback seguro para DEFAULT_WHATSAPP_GROUP_URL quando não informada'
);

const shareUrlEmpty = generateGroupShareWhatsAppUrl('   ');
const decodedEmpty = decodeURIComponent(shareUrlEmpty.replace('https://api.whatsapp.com/send?text=', ''));
assert(
  decodedEmpty.includes(`Link para entrar:\n${DEFAULT_WHATSAPP_GROUP_URL}`),
  'Deve usar fallback seguro quando URL passada for apenas espaços vazios'
);

assert(
  resolveWhatsappGroupUrl('https://chat.whatsapp.com/EDd67eYyB8w8iQ414JgQhO') === DEFAULT_WHATSAPP_GROUP_URL,
  'Deve atualizar automaticamente o link antigo legado para o link curto oficial (tinyurl)'
);
assert(
  resolveWhatsappGroupUrl(customGroupUrl) === customGroupUrl,
  'Deve respeitar um novo link personalizado salvo no Painel do Professor'
);

// ====================================================
// TESTE 7: Regras de Exibição Contextual (Clean Code & UX)
// ====================================================
console.log('\nTeste 7: Regras de Exibição Contextual do Card de Compartilhamento (desde o 1º dia)');

interface CardVisibilityDecision {
  showFirstDayProgressTrail: boolean;
  showShareCard: boolean;
}

function resolvePostQuestionCardVisibility(
  hasCompletedToday: boolean,
  isFirstQuestion: boolean
): CardVisibilityDecision {
  return {
    showFirstDayProgressTrail: Boolean(hasCompletedToday && isFirstQuestion),
    showShareCard: Boolean(hasCompletedToday),
  };
}

// 7.1 Aluno no 1º dia (1ª Questão concluída hoje):
const newbieState = resolvePostQuestionCardVisibility(true, true);
assert(newbieState.showFirstDayProgressTrail === true, 'Aluno no 1º dia deve ver a trilha das 3 primeiras questões na Comemoração');
assert(newbieState.showShareCard === true, 'Aluno no 1º dia já deve ver o balãozinho de compartilhamento após concluir');

// 7.2 Aluno Veterano (Questão subsequente concluída hoje):
const veteranState = resolvePostQuestionCardVisibility(true, false);
assert(veteranState.showFirstDayProgressTrail === false, 'Veterano não vê a trilha exclusiva da 1ª questão');
assert(veteranState.showShareCard === true, 'Veterano concluindo hoje deve ver o balãozinho de compartilhamento');

// 7.3 Aluno que ainda não completou a questão de hoje (protege leitura do enunciado):
const pendingState = resolvePostQuestionCardVisibility(false, false);
assert(pendingState.showFirstDayProgressTrail === false, 'Aluno que não concluiu hoje não deve ver trilha pós-questão');
assert(pendingState.showShareCard === false, 'Aluno que não concluiu hoje NÃO deve ver card de compartilhamento durante a leitura');

// ====================================================
// TESTE 8: Sincronização de Alternativa Marcada vs Conclusão do Ciclo (Caso Belle)
// ====================================================
console.log('\nTeste 8: Prevenção de Questão Marcada Indevidamente (Sync de Ciclo)');

// 8.1 Aluna abre o app no novo dia: tinha alternativa correta marcada por cache residual, mas hasCompletedToday = false
const staleCleared = syncSelectedLetterWithCompletion({
  selectedLetter: 'C',
  correctLetter: 'C',
  hasCompletedToday: false,
  pendingSubmissionSync: false,
  isSubmitting: false,
  isNickModalOpen: false,
});
assert(
  staleCleared === null,
  'Deve limpar selectedLetter (retornar null) quando a alternativa certa estava marcada mas hasCompletedToday é false'
);

// 8.2 Aluna já concluiu a questão de hoje (hasCompletedToday = true): deve restaurar a alternativa correta
const restoredCompleted = syncSelectedLetterWithCompletion({
  selectedLetter: null,
  correctLetter: 'D',
  hasCompletedToday: true,
  pendingSubmissionSync: false,
  isSubmitting: false,
  isNickModalOpen: false,
});
assert(
  restoredCompleted === 'D',
  'Deve restaurar a alternativa correta quando hasCompletedToday é true'
);

// 8.3 Aluna respondeu offline e tem sincronização pendente (pendingSubmissionSync = true): deve manter alternativa correta
const restoredPendingSync = syncSelectedLetterWithCompletion({
  selectedLetter: null,
  correctLetter: 'A',
  hasCompletedToday: false,
  pendingSubmissionSync: true,
  isSubmitting: false,
  isNickModalOpen: false,
});
assert(
  restoredPendingSync === 'A',
  'Deve manter/restaurar a alternativa correta quando pendingSubmissionSync é true'
);

// 8.4 Aluna acabou de clicar em Verificar Resposta e está enviando (isSubmitting = true): não deve limpar
const submittingKeep = syncSelectedLetterWithCompletion({
  selectedLetter: 'B',
  correctLetter: 'B',
  hasCompletedToday: false,
  pendingSubmissionSync: false,
  isSubmitting: true,
  isNickModalOpen: false,
});
assert(
  submittingKeep === 'B',
  'Deve preservar a alternativa correta enquanto isSubmitting é true'
);

// 8.5 Aluna sem apelido clicou na alternativa correta e abriu o modal de identificação (isNickModalOpen = true): mantém até salvar
const nickModalKeep = syncSelectedLetterWithCompletion({
  selectedLetter: 'E',
  correctLetter: 'E',
  hasCompletedToday: false,
  pendingSubmissionSync: false,
  isSubmitting: false,
  isNickModalOpen: true,
});
assert(
  nickModalKeep === 'E',
  'Deve preservar a alternativa correta enquanto o modal de apelido está aberto'
);

// 8.6 Aluna marcou uma alternativa INCORRETA durante o estudo (hasCompletedToday = false): deve preservar o feedback de erro
const wrongAttemptKeep = syncSelectedLetterWithCompletion({
  selectedLetter: 'A',
  correctLetter: 'C',
  hasCompletedToday: false,
  pendingSubmissionSync: false,
  isSubmitting: false,
  isNickModalOpen: false,
});
assert(
  wrongAttemptKeep === 'A',
  'Deve preservar alternativa incorreta selecionada pela aluna para exibir feedback pedagógico'
);

// 8.7 Verificação cruzada por questionId + cycleNumber (hasStudentCompletedCurrentQuestion):
// Cenário: Professor trocou para a questão nova ("2002"), mas o ciclo ainda é o 10 (ou a submissão do ciclo 10 era da questão "1001")
const sameCycleNewQuestion = hasStudentCompletedCurrentQuestion({
  isCycleLoaded: true,
  currentCycleNumber: 10,
  currentQuestionId: '2002',
  mySubmission: { cycleNumber: 10, questionId: '1001' },
  profile: { lastCompletedCycle: 10, lastCompletedQuestionId: '1001' },
});
assert(
  sameCycleNewQuestion === false,
  'NÃO deve considerar concluída se a questão ativa (2002) for diferente da questão respondida no ciclo (1001)'
);

// 8.8 Cenário: Ciclo ainda não carregou do servidor (isCycleLoaded = false)
const cycleNotLoadedYet = hasStudentCompletedCurrentQuestion({
  isCycleLoaded: false,
  currentCycleNumber: 10,
  currentQuestionId: '1001',
  mySubmission: { cycleNumber: 10, questionId: '1001' },
  profile: { lastCompletedCycle: 10, lastCompletedQuestionId: '1001' },
});
assert(
  cycleNotLoadedYet === false,
  'NÃO deve considerar concluída enquanto o ciclo oficial não for confirmado pelo servidor'
);

// 8.9 Cenário: Aluna realmente concluiu a questão ativa ("2002") no ciclo ativo (11)
const completedCurrentQuestionAndCycle = hasStudentCompletedCurrentQuestion({
  isCycleLoaded: true,
  currentCycleNumber: 11,
  currentQuestionId: '2002',
  mySubmission: { cycleNumber: 11, questionId: '2002' },
  profile: { lastCompletedCycle: 11, lastCompletedQuestionId: '2002' },
});
assert(
  completedCurrentQuestionAndCycle === true,
  'Deve considerar concluída quando ciclo e questionId correspondem à questão ativa de hoje'
);

console.log('\n------------------------------------------------------');
console.log(' \x1b[32m✔ TODOS OS TESTES DE METAS E ESCUDOS PASSARAM COM SUCESSO!\x1b[0m\n');
