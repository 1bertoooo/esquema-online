import { useState, useEffect, useRef, useCallback } from "react";
import { createRoom, getRoom, setRoom, onRoomChange } from "./firebase.js";
import { buildDeck, buildJeitinhoDeck, genRoomCode } from "./gameData.js";

// --- Colors ---
const C = {
  bg: "#0b1f14", bg2: "#10291a", bg3: "#183824",
  gold: "#ffcc00", goldDim: "rgba(255,204,0,.15)", goldBrd: "rgba(255,204,0,.25)",
  green: "#4ade80", greenDim: "rgba(74,222,128,.12)",
  red: "#f87171", redDim: "rgba(248,113,113,.12)",
  blue: "#60a5fa", orange: "#fb923c", purple: "#a78bfa",
  cream: "#f0ead6", creamD: "rgba(240,234,214,.5)",
  brd: "rgba(255,255,255,.06)",
};

const btn = {
  border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Nunito',sans-serif",
  fontWeight: 700, fontSize: 15, padding: "12px 24px", transition: "all .15s",
  minHeight: 48, WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
};

const playerColors = [C.gold, C.green, C.blue, C.orange, C.purple, C.red];

// --- Unique player ID ---
function getPlayerId() {
  let id = localStorage.getItem("esquema-pid");
  if (!id) { id = "p" + Math.random().toString(36).slice(2, 10); localStorage.setItem("esquema-pid", id); }
  return id;
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [game, setGame] = useState(null);
  const [err, setErr] = useState("");
  const pid = useRef(getPlayerId()).current;
  const unsub = useRef(null);

  const listen = useCallback((roomCode) => {
    if (unsub.current) unsub.current();
    unsub.current = onRoomChange(roomCode, (data) => {
      setGame(data);
      if (data.phase !== "lobby") setScreen("game");
    });
  }, []);

  useEffect(() => { return () => { if (unsub.current) unsub.current(); }; }, []);

  const save = async (g) => {
    await setRoom(g.code, g);
  };

  // --- HOME ---
  if (screen === "home") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, color: C.cream }}>
        <h1 style={{ fontFamily: "'Passion One'", fontSize: "clamp(3.5rem,12vw,6rem)", color: C.gold, letterSpacing: ".06em", textShadow: "3px 3px 0 #a07c00", textAlign: "center" }}>ESQUEMA</h1>
        <p style={{ fontFamily: "'Lilita One'", color: C.green, letterSpacing: ".15em", textTransform: "uppercase", fontSize: "clamp(.8rem,2.5vw,1.1rem)", marginTop: 4 }}>O jogo da malandragem</p>

        <div style={{ marginTop: 40, width: "100%", maxWidth: 340 }}>
          <input value={name} onChange={e => { setName(e.target.value); setErr(""); }} placeholder="Seu nome" maxLength={12}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${C.goldBrd}`, background: C.bg2, color: C.cream, fontSize: 16, fontWeight: 600, fontFamily: "'Nunito'", outline: "none", marginBottom: 12 }} />

          <button onClick={async () => {
            if (!name.trim()) { setErr("Digite seu nome!"); return; }
            const c = genRoomCode();
            const g = {
              code: c, phase: "lobby", hostId: pid,
              players: [{ id: pid, name: name.trim(), money: 5, jeitinhos: [], betrayedCount: 0 }],
              deck: [], jeitinhoDeck: [], currentRound: 0, bossIndex: 0,
              revealed: [], chosenScheme: null, participants: [], splits: {},
              decisions: {}, acceptances: {}, roundResult: null,
            };
            await createRoom(c, g);
            setCode(c); setGame(g); setScreen("lobby");
            listen(c);
          }} style={{ ...btn, width: "100%", background: C.gold, color: C.bg, fontSize: 17, marginBottom: 10 }}>
            Criar sala
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 10px" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
            <span style={{ color: C.creamD, fontSize: 13 }}>ou entre numa sala</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); }} placeholder="Código" maxLength={4}
              style={{ flex: 1, padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${C.goldBrd}`, background: C.bg2, color: C.gold, fontSize: 20, fontFamily: "'Passion One'", letterSpacing: ".15em", textAlign: "center", outline: "none", textTransform: "uppercase" }} />
            <button onClick={async () => {
              if (!name.trim()) { setErr("Digite seu nome!"); return; }
              const c = code.trim().toUpperCase();
              if (c.length !== 4) { setErr("Código deve ter 4 letras!"); return; }
              const g = await getRoom(c);
              if (!g) { setErr("Sala não encontrada!"); return; }
              if (g.phase !== "lobby") { setErr("Jogo já começou!"); return; }
              if (g.players.length >= 6) { setErr("Sala cheia!"); return; }
              if (!g.players.find(p => p.id === pid)) {
                g.players.push({ id: pid, name: name.trim(), money: 5, jeitinhos: [], betrayedCount: 0 });
                await save(g);
              }
              setCode(c); setGame(g); setScreen("lobby");
              listen(c);
            }} style={{ ...btn, background: C.bg2, color: C.gold, border: `1.5px solid ${C.goldBrd}`, padding: "12px 20px" }}>
              Entrar
            </button>
          </div>
          {err && <p style={{ color: C.red, fontSize: 13, marginTop: 10, textAlign: "center" }}>{err}</p>}
        </div>
        <p style={{ color: "rgba(240,234,214,.2)", fontSize: 12, marginTop: 50 }}>3–6 jogadores · 40–60 min</p>
      </div>
    );
  }

  // --- LOBBY ---
  if (screen === "lobby" && game) {
    const isHost = game.hostId === pid;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, padding: 20, color: C.cream }}>
        <div style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: C.creamD, fontSize: 13, marginBottom: 4 }}>Código da sala</p>
          <h2 style={{ fontFamily: "'Passion One'", fontSize: 52, color: C.gold, letterSpacing: ".2em", textShadow: "2px 2px 0 #a07c00" }}>{game.code}</h2>
          <p style={{ color: C.creamD, fontSize: 13, marginTop: 4, marginBottom: 30 }}>Mande esse código pros amigos!</p>

          <div style={{ background: C.bg2, border: `1px solid ${C.brd}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
            <p style={{ color: C.creamD, fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Jogadores ({game.players.length}/6)</p>
            {game.players.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < game.players.length - 1 ? `1px solid ${C.brd}` : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: playerColors[i], display: "flex", alignItems: "center", justifyContent: "center", color: C.bg, fontWeight: 800, fontSize: 14 }}>{p.name[0].toUpperCase()}</div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                {p.id === game.hostId && <span style={{ marginLeft: "auto", fontSize: 11, color: C.gold, background: C.goldDim, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>ANFITRIÃO</span>}
                {p.id === pid && p.id !== game.hostId && <span style={{ marginLeft: "auto", fontSize: 11, color: C.green, opacity: .6 }}>Você</span>}
              </div>
            ))}
          </div>

          {isHost && game.players.length >= 3 ? (
            <button onClick={async () => {
              const g = { ...game };
              const pc = g.players.length;
              g.deck = buildDeck(pc);
              g.jeitinhoDeck = buildJeitinhoDeck();
              g.players = g.players.map(p => {
                const j1 = g.jeitinhoDeck.pop();
                const j2 = g.jeitinhoDeck.pop();
                return { ...p, jeitinhos: [j1, j2].filter(Boolean) };
              });
              g.phase = "reveal";
              g.currentRound = 1;
              g.bossIndex = 0;
              g.revealed = g.deck.splice(0, 3);
              await save(g);
            }} style={{ ...btn, width: "100%", background: C.green, color: C.bg, fontSize: 17 }}>
              Iniciar jogo ({game.players.length} jogadores)
            </button>
          ) : isHost ? (
            <p style={{ color: C.creamD, fontSize: 14 }}>Aguardando mais jogadores... (mínimo 3)</p>
          ) : (
            <p style={{ color: C.creamD, fontSize: 14 }}>Aguardando o anfitrião iniciar...</p>
          )}
        </div>
      </div>
    );
  }

  // --- GAME ---
  if (screen === "game" && game) {
    const me = game.players.find(p => p.id === pid);
    const boss = game.players[game.bossIndex];
    const isBoss = boss?.id === pid;
    const totalRounds = game.players.length * 6;
    const scheme = game.chosenScheme;

    if (!me) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.creamD }}>Carregando...</div>;

    // Jeitinho panel state
    const [showJ, setShowJ] = useState(false);
    const myJeitinhos = me.jeitinhos || [];

    const canUseGrampo = game.phase === "decision" && (game.participants || []).includes(pid) && !(game.decisions || {})[pid];
    const canUseDelacao = game.phase === "result" && game.roundResult?.type === "traitor" && game.roundResult.tid !== pid && (game.participants || []).includes(pid) && (game.decisions || {})[pid] === "cumprir" && !game.usedDelacao;
    const canUseFalcatrua = game.phase === "decision" && (game.participants || []).includes(pid) && !(game.decisions || {})[pid];
    const canUseSindicato = game.phase === "reveal" && !isBoss;
    const canUseLaranja = game.phase === "invite" && !(game.participants || []).includes(pid);
    const canUsePropina = game.phase === "decision" && (game.participants || []).includes(pid) && !(game.decisions || {})[pid];

    const canUse = (card) => {
      if (card.id === "grampo") return canUseGrampo;
      if (card.id === "delacao") return canUseDelacao;
      if (card.id === "falcatrua") return canUseFalcatrua;
      if (card.id === "sindicato") return canUseSindicato;
      if (card.id === "laranja") return canUseLaranja;
      if (card.id === "propina") return canUsePropina;
      return false;
    };

    const useJeitinho = async (card) => {
      const g = { ...game };
      const mi = g.players.findIndex(p => p.id === pid);

      if (card.id === "grampo") {
        // Pick a random other participant to spy on
        const others = (g.participants || []).filter(id => id !== pid && (g.decisions || {})[id]);
        if (others.length > 0) {
          const targetId = others[Math.floor(Math.random() * others.length)];
          const targetPlayer = g.players.find(p => p.id === targetId);
          const targetDec = g.decisions[targetId];
          alert(`🔍 GRAMPO: ${targetPlayer.name} vai ${targetDec === "trair" ? "TRAIR ✗" : "CUMPRIR ✓"}!`);
        } else {
          // No one decided yet, let them pick who to spy
          const otherParts = (g.participants || []).filter(id => id !== pid);
          if (otherParts.length === 1) {
            g.grampoTarget = otherParts[0];
            g.grampoUser = pid;
          } else {
            // For simplicity, spy on first other participant
            g.grampoTarget = otherParts[0];
            g.grampoUser = pid;
          }
          alert(`🔍 GRAMPO ativado! Quando ${g.players.find(p => p.id === g.grampoTarget)?.name} decidir, você verá a decisão.`);
        }
      }

      if (card.id === "delacao") {
        const traitorId = g.roundResult.tid;
        const ti = g.players.findIndex(p => p.id === traitorId);
        const penalty = g.chosenScheme.faithfulPenalty;
        // Recover what was lost
        g.players[mi].money += penalty;
        // Take R$2 from traitor
        const take = Math.min(2, g.players[ti].money);
        g.players[ti].money -= take;
        g.players[mi].money += take;
        g.usedDelacao = true;
        alert(`⚖️ DELAÇÃO PREMIADA! Você recuperou R$${penalty} e tirou R$${take} de ${g.players[ti].name}!`);
      }

      if (card.id === "falcatrua") {
        // Place both decisions — will resolve after reveal
        g.decisions[pid] = "falcatrua";
        g.falcatruaUser = pid;
        alert("🃏 FALCATRUA ativada! Após a revelação, você escolherá Cumprir ou Trair.");
      }

      if (card.id === "sindicato") {
        if (g.chosenScheme) {
          g.chosenScheme.players = Math.min(3, g.chosenScheme.players + 1);
          alert(`👷 SINDICATO! O esquema agora exige ${g.chosenScheme.players} participantes!`);
        } else {
          alert("👷 SINDICATO! O próximo esquema escolhido vai exigir +1 participante.");
          g.sindicatoActive = true;
        }
      }

      if (card.id === "laranja") {
        g.participants = [...(g.participants || []), pid];
        g.splits[pid] = 1;
        alert("🍊 LARANJA! Você entrou no esquema! Recebe no mínimo R$1.");
      }

      if (card.id === "propina") {
        if (me.money >= 2) {
          g.players[mi].money -= 2;
          const others = (g.participants || []).filter(id => id !== pid);
          if (others.length > 0) {
            const targetId = others[0];
            const targetPlayer = g.players.find(p => p.id === targetId);
            const targetTi = g.players.findIndex(p => p.id === targetId);
            g.players[targetTi].money += 2;
            const dec = (g.decisions || {})[targetId];
            if (dec) {
              alert(`💰 PROPINA! Você pagou R$2 para ${targetPlayer.name}. Decisão dele: ${dec === "trair" ? "TRAIR ✗" : "CUMPRIR ✓"}. (Ele pode trocar pagando R$1)`);
            } else {
              alert(`💰 PROPINA! Você pagou R$2 para ${targetPlayer.name}. Ele ainda não decidiu — quando decidir, a decisão será visível pra você.`);
              g.propinaTarget = targetId;
              g.propinaUser = pid;
            }
          }
        } else {
          alert("Você não tem R$2 pra pagar a propina!");
          return;
        }
      }

      // Remove used card from player's hand
      const cardIdx = g.players[mi].jeitinhos.findIndex(j => j.uid === card.uid);
      if (cardIdx !== -1) g.players[mi].jeitinhos.splice(cardIdx, 1);

      await save(g);
      setShowJ(false);
    };

    const JeitinhoPanel = () => {
      if (!showJ) return null;
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowJ(false)}>
          <div style={{ background: C.bg2, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 500, maxHeight: "70vh", overflow: "auto", padding: "16px 16px 30px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Passion One'", fontSize: 20, color: C.green }}>Seus Jeitinhos ({myJeitinhos.length})</h3>
              <button onClick={() => setShowJ(false)} style={{ ...btn, padding: "6px 12px", background: "transparent", color: C.creamD, fontSize: 20, border: "none", minHeight: 36 }}>✕</button>
            </div>
            {myJeitinhos.length === 0 && <p style={{ color: C.creamD, fontSize: 14 }}>Você não tem cartas de Jeitinho. Ganhe uma sendo traído!</p>}
            {myJeitinhos.map((card, i) => {
              const usable = canUse(card);
              return (
                <div key={card.uid || i} style={{ background: usable ? "rgba(74,222,128,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${usable ? "rgba(74,222,128,.25)" : C.brd}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "'Lilita One'", fontSize: 15, color: usable ? C.green : C.cream }}>{card.name}</div>
                      <div style={{ fontSize: 12, color: C.creamD, marginTop: 2 }}>{card.desc}</div>
                    </div>
                    {usable && (
                      <button onClick={() => useJeitinho(card)}
                        style={{ ...btn, padding: "8px 16px", background: C.green, color: C.bg, fontSize: 13, marginLeft: 10, minHeight: 36, whiteSpace: "nowrap" }}>
                        Usar
                      </button>
                    )}
                  </div>
                  {!usable && <div style={{ fontSize: 11, color: "rgba(240,234,214,.3)", marginTop: 4 }}>Não pode usar agora</div>}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const Header = () => (
      <div style={{ background: C.bg3, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.brd}` }}>
        <div>
          <span style={{ fontFamily: "'Passion One'", color: C.gold, fontSize: 18 }}>ESQUEMA</span>
          <span style={{ color: C.creamD, fontSize: 12, marginLeft: 8 }}>Rodada {game.currentRound}/{totalRounds}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Passion One'", color: C.green, fontSize: 20 }}>R${me.money}</span>
          <button onClick={() => setShowJ(true)}
            style={{ ...btn, padding: "4px 10px", minHeight: 32, background: myJeitinhos.length > 0 ? C.greenDim : "rgba(255,255,255,.04)", color: myJeitinhos.length > 0 ? C.green : C.creamD, border: `1px solid ${myJeitinhos.length > 0 ? "rgba(74,222,128,.3)" : C.brd}`, fontSize: 12, borderRadius: 6 }}>
            🃏 {myJeitinhos.length}
          </button>
        </div>
      </div>
    );

    const SchemeCard = ({ s, onClick, selected }) => {
      const solo = s.players === 1, trio = s.players === 3;
      const bg = solo ? "rgba(180,154,100,.1)" : trio ? "rgba(232,120,40,.1)" : "rgba(255,200,0,.08)";
      const bc = solo ? "rgba(180,154,100,.3)" : trio ? "rgba(232,120,40,.3)" : "rgba(255,200,0,.25)";
      const tc = solo ? "#dcc898" : trio ? "#ffb060" : "#ffe066";
      const label = solo ? "Solo" : trio ? "Trio" : "Dupla";
      return (
        <div onClick={onClick} style={{ background: bg, border: `1.5px solid ${selected ? C.gold : bc}`, borderRadius: 12, padding: "14px 16px", cursor: onClick ? "pointer" : "default", transition: "all .15s", boxShadow: selected ? `0 0 0 2px ${C.gold}` : "none" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.creamD, marginBottom: 2 }}>{label}</div>
          <div style={{ fontFamily: "'Lilita One'", fontSize: 17, color: tc }}>{s.name}</div>
          <div style={{ fontFamily: "'Passion One'", fontSize: 26, color: tc, marginTop: 4 }}>R${s.reward}</div>
          {!solo && <div style={{ fontSize: 11, color: C.creamD, marginTop: 4 }}>Traidor: R${s.traitorBonus} · Fiel: -R${s.faithfulPenalty}</div>}
          {solo && <div style={{ fontSize: 11, color: C.creamD, marginTop: 4 }}>{s.flavor}</div>}
        </div>
      );
    };

    const nextRound = async () => {
      const g = { ...game };
      g.currentRound++;
      g.bossIndex = (g.currentRound - 1) % g.players.length;
      if (g.currentRound > totalRounds) {
        g.phase = "gameover";
      } else {
        g.phase = "reveal";
        g.revealed = g.deck.splice(0, 3);
        g.chosenScheme = null; g.participants = []; g.splits = {};
        g.decisions = {}; g.roundResult = null; g.acceptances = {};
      }
      await save(g);
    };

    // REVEAL
    if (game.phase === "reveal") {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
          <Header />
          <JeitinhoPanel />
          <JeitinhoPanel />
          <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ color: C.creamD, fontSize: 13 }}>Patrão da rodada</p>
              <p style={{ fontFamily: "'Lilita One'", fontSize: 22, color: C.gold }}>{boss.name}{isBoss ? " (você!)" : ""}</p>
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>3 esquemas revelados:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {(game.revealed || []).map((s, i) => (
                <SchemeCard key={i} s={s} onClick={isBoss ? async () => {
                  const g = { ...game };
                  g.chosenScheme = s;
                  if (s.players === 1) {
                    const pi = g.players.findIndex(p => p.id === pid);
                    g.players[pi].money += s.reward;
                    g.phase = "solo-result";
                  } else {
                    g.phase = "invite";
                    g.participants = [pid];
                    g.splits = {}; g.decisions = {}; g.acceptances = {};
                  }
                  await save(g);
                } : undefined} />
              ))}
            </div>
            {isBoss ? <p style={{ color: C.creamD, fontSize: 13, textAlign: "center" }}>Toque no esquema que quer fazer</p>
              : <p style={{ color: C.creamD, fontSize: 14, textAlign: "center" }}>Aguardando {boss.name} escolher...</p>}
          </div>
        </div>
      );
    }

    // SOLO RESULT
    if (game.phase === "solo-result") {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
          <Header />
          <JeitinhoPanel />
          <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "'Lilita One'", fontSize: 20, color: C.gold }}>{boss.name} fez solo</p>
            <SchemeCard s={scheme} />
            <p style={{ color: C.green, fontSize: 18, fontWeight: 800, marginTop: 16 }}>+R${scheme.reward}</p>
            {isBoss && <button onClick={nextRound} style={{ ...btn, background: C.gold, color: C.bg, marginTop: 20, width: "100%" }}>Próxima rodada</button>}
            {!isBoss && <p style={{ color: C.creamD, fontSize: 13, marginTop: 16 }}>Aguardando...</p>}
          </div>
        </div>
      );
    }

    // INVITE
    if (game.phase === "invite") {
      const needed = scheme.players;
      const parts = game.participants || [];
      if (isBoss) {
        const others = game.players.filter(p => p.id !== pid);
        const bossSplit = scheme.reward - Object.entries(game.splits || {}).filter(([k]) => k !== pid).reduce((a, [, v]) => a + v, 0);
        return (
          <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
            <Header />
          <JeitinhoPanel />
            <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
              <SchemeCard s={scheme} />
              <p style={{ fontWeight: 700, fontSize: 14, marginTop: 16, marginBottom: 10 }}>Convide {needed - 1} jogador{needed > 2 ? "es" : ""} e defina a divisão:</p>
              {others.map(p => {
                const isSel = parts.includes(p.id);
                const split = (game.splits || {})[p.id] || 0;
                return (
                  <div key={p.id} style={{ background: C.bg2, border: `1px solid ${isSel ? C.goldBrd : C.brd}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isSel ? 8 : 0 }}>
                      <span style={{ fontWeight: 700, color: isSel ? C.gold : C.cream }}>{p.name}</span>
                      <button onClick={async () => {
                        const g = { ...game };
                        if (!g.splits) g.splits = {};
                        if (isSel) {
                          g.participants = g.participants.filter(id => id !== p.id);
                          delete g.splits[p.id];
                        } else if (g.participants.length < needed) {
                          g.participants.push(p.id);
                          g.splits[p.id] = Math.floor(scheme.reward / needed);
                        }
                        await save(g);
                      }} style={{ ...btn, padding: "6px 14px", fontSize: 13, background: isSel ? C.redDim : C.greenDim, color: isSel ? C.red : C.green, border: "none" }}>
                        {isSel ? "Remover" : "Convidar"}
                      </button>
                    </div>
                    {isSel && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: C.creamD, fontSize: 13 }}>Parte:</span>
                        <button onClick={async () => { const g = { ...game }; g.splits[p.id] = Math.max(1, (g.splits[p.id] || 1) - 1); await save(g); }}
                          style={{ ...btn, padding: "4px 14px", fontSize: 18, background: C.bg3, color: C.cream, border: `1px solid ${C.brd}` }}>−</button>
                        <span style={{ fontFamily: "'Passion One'", fontSize: 24, color: C.gold, minWidth: 50, textAlign: "center" }}>R${split}</span>
                        <button onClick={async () => { const g = { ...game }; g.splits[p.id] = Math.min(scheme.reward - 1, (g.splits[p.id] || 1) + 1); await save(g); }}
                          style={{ ...btn, padding: "4px 14px", fontSize: 18, background: C.bg3, color: C.cream, border: `1px solid ${C.brd}` }}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {parts.length === needed && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: C.creamD, fontSize: 13, marginBottom: 6 }}>Sua parte: <strong style={{ color: C.gold }}>R${bossSplit}</strong></p>
                  <button onClick={async () => {
                    const g = { ...game };
                    g.splits[pid] = scheme.reward - Object.entries(g.splits).filter(([k]) => k !== pid).reduce((a, [, v]) => a + v, 0);
                    g.phase = "awaiting";
                    g.acceptances = { [pid]: true };
                    await save(g);
                  }} style={{ ...btn, width: "100%", background: C.gold, color: C.bg, fontSize: 16 }}>Enviar proposta</button>
                </div>
              )}
            </div>
          </div>
        );
      }
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
          <Header />
          <JeitinhoPanel />
          <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "'Lilita One'", fontSize: 20, color: C.gold }}>{boss.name} está montando o time</p>
            <SchemeCard s={scheme} />
            <p style={{ color: C.creamD, fontSize: 14, marginTop: 16 }}>Negociem por voz/WhatsApp enquanto {boss.name} define a divisão...</p>
          </div>
        </div>
      );
    }

    // AWAITING ACCEPT
    if (game.phase === "awaiting") {
      const isPart = (game.participants || []).includes(pid);
      const accepted = (game.acceptances || {})[pid];
      const allAccepted = (game.participants || []).every(id => (game.acceptances || {})[id]);

      if (allAccepted && isBoss) {
        setTimeout(async () => { const g = { ...game }; g.phase = "decision"; g.decisions = {}; await save(g); }, 300);
      }

      if (isPart && !accepted && !isBoss) {
        return (
          <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
            <Header />
          <JeitinhoPanel />
            <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
              <p style={{ fontFamily: "'Lilita One'", fontSize: 20, color: C.gold }}>{boss.name} te convidou!</p>
              <SchemeCard s={scheme} />
              <p style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>Sua parte: <span style={{ color: C.gold, fontFamily: "'Passion One'", fontSize: 26 }}>R${(game.splits || {})[pid] || 0}</span></p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={async () => { const g = { ...game }; g.acceptances = { ...g.acceptances, [pid]: true }; await save(g); }}
                  style={{ ...btn, flex: 1, background: C.green, color: C.bg, fontSize: 16 }}>Aceitar</button>
                <button onClick={async () => {
                  const g = { ...game };
                  g.participants = g.participants.filter(id => id !== pid);
                  delete g.splits[pid]; g.phase = "invite"; g.acceptances = {};
                  await save(g);
                }} style={{ ...btn, flex: 1, background: C.redDim, color: C.red, fontSize: 16, border: `1px solid rgba(248,113,113,.3)` }}>Recusar</button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
          <Header />
          <JeitinhoPanel />
          <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
            <p style={{ color: C.gold, fontFamily: "'Lilita One'", fontSize: 18 }}>Proposta enviada</p>
            <div style={{ marginTop: 16 }}>
              {(game.participants || []).map(id => {
                const p = game.players.find(pl => pl.id === id);
                const acc = (game.acceptances || {})[id];
                return <div key={id} style={{ padding: "6px 0", color: acc ? C.green : C.creamD, fontSize: 14 }}>{p?.name}: R${(game.splits || {})[id] || 0} {acc ? "✓ aceitou" : "aguardando..."}</div>;
              })}
            </div>
          </div>
        </div>
      );
    }

    // DECISION
    if (game.phase === "decision") {
      const isPart = (game.participants || []).includes(pid);
      const myDec = (game.decisions || {})[pid];
      const allDec = (game.participants || []).every(id => (game.decisions || {})[id]);

      if (allDec && isBoss) {
        setTimeout(async () => {
          const g = { ...game };
          const decs = g.decisions || {};
          const traitors = g.participants.filter(id => decs[id] === "trair");
          const faithful = g.participants.filter(id => decs[id] === "cumprir");

          if (traitors.length === 0) {
            g.participants.forEach(id => { const i = g.players.findIndex(p => p.id === id); g.players[i].money += g.splits[id]; });
            g.roundResult = { type: "cooperated" };
          } else if (traitors.length === 1) {
            const tid = traitors[0];
            const ti = g.players.findIndex(p => p.id === tid);
            g.players[ti].money += scheme.traitorBonus;
            faithful.forEach(id => {
              const fi = g.players.findIndex(p => p.id === id);
              g.players[fi].money = Math.max(0, g.players[fi].money - scheme.faithfulPenalty);
              g.players[fi].betrayedCount = (g.players[fi].betrayedCount || 0) + 1;
              if (g.jeitinhoDeck.length > 0) {
                if (!g.players[fi].jeitinhos) g.players[fi].jeitinhos = [];
                g.players[fi].jeitinhos.push(g.jeitinhoDeck.pop());
              }
            });
            g.roundResult = { type: "traitor", tid };
          } else {
            g.participants.forEach(id => { const i = g.players.findIndex(p => p.id === id); g.players[i].money = Math.max(0, g.players[i].money - 1); });
            g.roundResult = { type: "multi" };
          }
          g.phase = "result";
          await save(g);
        }, 300);
      }

      if (isPart && !myDec) {
        return (
          <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
            <Header />
          <JeitinhoPanel />
            <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
              <p style={{ fontFamily: "'Lilita One'", fontSize: 22 }}>Hora da decisão</p>
              <p style={{ color: C.creamD, fontSize: 14, margin: "8px 0 20px" }}>Sua parte combinada: R${(game.splits || {})[pid]}. O que você vai fazer?</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={async () => { const g = { ...game }; if (!g.decisions) g.decisions = {}; g.decisions[pid] = "cumprir"; await save(g); }}
                  style={{ ...btn, flex: 1, background: "rgba(34,197,94,.12)", color: C.green, border: `2px solid ${C.green}`, fontSize: 18, padding: "24px 16px", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 36 }}>✓</span>Cumprir
                </button>
                <button onClick={async () => { const g = { ...game }; if (!g.decisions) g.decisions = {}; g.decisions[pid] = "trair"; await save(g); }}
                  style={{ ...btn, flex: 1, background: "rgba(239,68,68,.12)", color: C.red, border: `2px solid ${C.red}`, fontSize: 18, padding: "24px 16px", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 36 }}>✗</span>Trair
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
          <Header />
          <JeitinhoPanel />
          <div style={{ padding: 20, maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontFamily: "'Lilita One'", fontSize: 20, color: C.gold }}>Decisão secreta</p>
            <p style={{ color: C.creamD, fontSize: 14, marginTop: 10 }}>{isPart ? "Você já decidiu. Aguardando os outros..." : "Os participantes estão decidindo..."}</p>
            <div style={{ marginTop: 16 }}>
              {(game.participants || []).map(id => {
                const p = game.players.find(pl => pl.id === id);
                const d = (game.decisions || {})[id];
                return <div key={id} style={{ padding: "6px 0", color: d ? C.green : C.creamD, fontSize: 14 }}>{p?.name}: {d ? "✓ decidiu" : "pensando..."}</div>;
              })}
            </div>
          </div>
        </div>
      );
    }

    // RESULT
    if (game.phase === "result") {
      const r = game.roundResult;
      const decs = game.decisions || {};
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream }}>
          <Header />
          <JeitinhoPanel />
          <div style={{ padding: 20, maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
            {r?.type === "cooperated" && <>
              <p style={{ fontFamily: "'Lilita One'", fontSize: 22, color: C.green }}>Todo mundo cumpriu!</p>
              {(game.participants || []).map(id => { const p = game.players.find(pl => pl.id === id); return <div key={id} style={{ padding: "4px 0", fontSize: 15, color: C.green }}>{p?.name}: +R${(game.splits || {})[id]}{id === pid ? " (você)" : ""}</div>; })}
            </>}
            {r?.type === "traitor" && <>
              <p style={{ fontFamily: "'Lilita One'", fontSize: 22, color: C.red }}>Traição!</p>
              {(game.participants || []).map(id => {
                const p = game.players.find(pl => pl.id === id);
                const t = id === r.tid;
                return <div key={id} style={{ padding: "6px 0", fontSize: 15, color: t ? C.red : C.creamD }}>
                  {p?.name}: {decs[id] === "trair" ? "TRAIU ✗" : "Cumpriu ✓"} → <span style={{ fontFamily: "'Passion One'", color: t ? C.red : C.orange }}>{t ? `+R$${scheme.traitorBonus}` : `-R$${scheme.faithfulPenalty}`}</span>
                  {id === pid ? " (você)" : ""}
                </div>;
              })}
              <p style={{ color: C.green, fontSize: 13, marginTop: 10 }}>Quem foi traído ganhou 1 carta de Jeitinho!</p>
            </>}
            {r?.type === "multi" && <>
              <p style={{ fontFamily: "'Lilita One'", fontSize: 22, color: C.orange }}>Traição dupla!</p>
              <p style={{ color: C.creamD, fontSize: 14, marginTop: 6 }}>Dois ou mais traíram. Todos perdem R$1.</p>
              {(game.participants || []).map(id => { const p = game.players.find(pl => pl.id === id); return <div key={id} style={{ padding: "4px 0", fontSize: 15, color: decs[id] === "trair" ? C.red : C.creamD }}>{p?.name}: {decs[id] === "trair" ? "TRAIU ✗" : "Cumpriu ✓"} → -R$1</div>; })}
            </>}

            <div style={{ marginTop: 20, background: C.bg2, borderRadius: 12, padding: 14 }}>
              <p style={{ color: C.creamD, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Placar</p>
              {[...game.players].sort((a, b) => b.money - a.money).map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, color: p.id === pid ? C.gold : C.cream }}>
                  <span>{i + 1}. {p.name}{p.id === pid ? " ★" : ""}</span>
                  <span style={{ fontFamily: "'Passion One'" }}>R${p.money}</span>
                </div>
              ))}
            </div>

            {isBoss && <button onClick={nextRound} style={{ ...btn, width: "100%", background: C.gold, color: C.bg, fontSize: 16, marginTop: 16 }}>{game.currentRound >= totalRounds ? "Ver resultado final" : "Próxima rodada"}</button>}
            {!isBoss && <p style={{ color: C.creamD, fontSize: 13, marginTop: 16 }}>Aguardando {boss.name}...</p>}
          </div>
        </div>
      );
    }

    // GAMEOVER
    if (game.phase === "gameover") {
      const sorted = [...game.players].sort((a, b) => b.money - a.money);
      const w = sorted[0];
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <p style={{ color: C.creamD, fontSize: 14 }}>O jogo acabou!</p>
          <h1 style={{ fontFamily: "'Passion One'", fontSize: "clamp(2.5rem,8vw,4rem)", color: C.gold, textShadow: "2px 2px 0 #a07c00", textAlign: "center", marginTop: 8 }}>
            {w.id === pid ? "Você venceu!" : `${w.name} venceu!`}
          </h1>
          <p style={{ fontFamily: "'Passion One'", fontSize: 28, color: C.green, marginTop: 8 }}>R${w.money}</p>

          <div style={{ marginTop: 30, width: "100%", maxWidth: 360, background: C.bg2, borderRadius: 14, padding: 20 }}>
            <p style={{ color: C.creamD, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".1em" }}>Ranking final</p>
            {sorted.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < sorted.length - 1 ? `1px solid ${C.brd}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Passion One'", fontSize: 20, color: i === 0 ? C.gold : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : C.creamD, minWidth: 24 }}>{i + 1}.</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: p.id === pid ? C.gold : C.cream }}>{p.name}{p.id === pid ? " ★" : ""}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "'Passion One'", fontSize: 20, color: i === 0 ? C.gold : C.cream }}>R${p.money}</span>
                  <div style={{ fontSize: 11, color: C.creamD }}>Traído {p.betrayedCount || 0}×</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => { setScreen("home"); setGame(null); setCode(""); }}
            style={{ ...btn, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBrd}`, marginTop: 24 }}>Voltar ao início</button>
        </div>
      );
    }

    return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.creamD }}>Carregando... ({game.phase})</div>;
  }

  return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.creamD }}>Carregando...</div>;
}
