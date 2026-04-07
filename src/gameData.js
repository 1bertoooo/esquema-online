// Esquemas Solo
export const SOLO_SCHEMES = [
  { name: "Bico por fora", reward: 2, players: 1, flavor: "Trampo honesto." },
  { name: "Uber no fim de semana", reward: 2, players: 1, flavor: "Madrugada no volante." },
  { name: "Rifa no trabalho", reward: 2, players: 1, flavor: "Rifinha sagrada." },
  { name: "Venda de brigadeiro", reward: 3, players: 1, flavor: "O melhor da rua." },
  { name: "Freela de madrugada", reward: 3, players: 1, flavor: "Café e código." },
];

// Esquemas Dupla
export const DUO_SCHEMES = [
  { name: "Vaquinha", reward: 8, players: 2, traitorBonus: 6, faithfulPenalty: 2 },
  { name: "Esquema do FGTS", reward: 10, players: 2, traitorBonus: 8, faithfulPenalty: 3 },
  { name: "Golpe do Pix", reward: 12, players: 2, traitorBonus: 9, faithfulPenalty: 3 },
  { name: "Rolo de terreno", reward: 10, players: 2, traitorBonus: 7, faithfulPenalty: 2 },
  { name: "Conta laranja", reward: 8, players: 2, traitorBonus: 6, faithfulPenalty: 2 },
  { name: "Seguro falso", reward: 14, players: 2, traitorBonus: 10, faithfulPenalty: 4 },
  { name: "Cópia de cartão", reward: 16, players: 2, traitorBonus: 12, faithfulPenalty: 5 },
];

// Esquemas Trio
export const TRIO_SCHEMES = [
  { name: "Licitação fantasma", reward: 18, players: 3, traitorBonus: 10, faithfulPenalty: 3 },
  { name: "Pirâmide financeira", reward: 21, players: 3, traitorBonus: 13, faithfulPenalty: 4 },
  { name: "Nota fria", reward: 18, players: 3, traitorBonus: 11, faithfulPenalty: 3 },
  { name: "Lavagem de dinheiro", reward: 27, players: 3, traitorBonus: 16, faithfulPenalty: 5 },
  { name: "Desvio de obra", reward: 24, players: 3, traitorBonus: 14, faithfulPenalty: 4 },
  { name: "Superfaturamento", reward: 27, players: 3, traitorBonus: 18, faithfulPenalty: 6 },
  { name: "Fraude no INSS", reward: 21, players: 3, traitorBonus: 12, faithfulPenalty: 4 },
];

// Quantas cópias de cada esquema no baralho de 108
const SOLO_COUNTS = [5, 5, 4, 4, 4]; // = 22
const DUO_COUNTS = [8, 7, 6, 7, 7, 6, 7]; // = 48
const TRIO_COUNTS = [7, 6, 6, 5, 6, 4, 4]; // = 38

// Cartas de Jeitinho
export const JEITINHO_TYPES = [
  { id: "grampo", name: "Grampo", desc: "Antes da revelação: veja a decisão de 1 participante.", copies: 5 },
  { id: "delacao", name: "Delação Premiada", desc: "Se você cumpriu e foi traído: recupere o que perdeu + R$2 do traidor.", copies: 3 },
  { id: "laranja", name: "Laranja", desc: "Entre num esquema sem convite. Recebe no mínimo R$1.", copies: 4 },
  { id: "propina", name: "Propina", desc: "Pague R$2 pra ver a decisão de alguém. Ele pode trocar pagando R$1.", copies: 4 },
  { id: "falcatrua", name: "Falcatrua", desc: "Coloque Cumprir e Trair. Após ver o resultado, escolha qual era a sua.", copies: 2 },
  { id: "sindicato", name: "Sindicato", desc: "Force o esquema a exigir +1 participante.", copies: 2 },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(playerCount) {
  const cardsNeeded = playerCount * 6 * 3;
  const all = [];
  SOLO_SCHEMES.forEach((s, i) => {
    for (let j = 0; j < SOLO_COUNTS[i]; j++) all.push({ ...s, uid: `s${i}-${j}` });
  });
  DUO_SCHEMES.forEach((s, i) => {
    for (let j = 0; j < DUO_COUNTS[i]; j++) all.push({ ...s, uid: `d${i}-${j}` });
  });
  TRIO_SCHEMES.forEach((s, i) => {
    for (let j = 0; j < TRIO_COUNTS[i]; j++) all.push({ ...s, uid: `t${i}-${j}` });
  });
  return shuffle(all).slice(0, cardsNeeded);
}

export function buildJeitinhoDeck() {
  const deck = [];
  JEITINHO_TYPES.forEach(c => {
    for (let i = 0; i < c.copies; i++) deck.push({ ...c, uid: `${c.id}-${i}` });
  });
  return shuffle(deck);
}

export function genRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
