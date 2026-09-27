import { POOL_NAMES } from "./config.js";

/* ==========================================================================
   HELPERS
========================================================================== */
function makePoolMatches(poolIdx, teams) {
  // Single round-robin via the circle method: every team plays every other team
  // exactly once. For 8 teams this is 7 rounds of 4 matches (7 games per team,
  // no byes). Works for any even team count; an odd count gets a rotating bye.
  const arr = teams.map((_, i) => i);
  if (arr.length % 2 === 1) arr.push(-1); // -1 marks a bye slot for odd counts
  const rounds = arr.length - 1;
  const half   = arr.length / 2;
  let rot = arr.slice();
  const result = [];
  let idx = 0;
  for (let r = 0; r < rounds; r++) {
    let byeTeam = null;
    for (let i = 0; i < half; i++) {
      const a = rot[i], b = rot[rot.length - 1 - i];
      if (a === -1 || b === -1) { byeTeam = a === -1 ? b : a; continue; }
      result.push({
        id: `P${poolIdx}-${idx}`,
        pool: poolIdx,
        t1: a, t2: b,
        s1: null, s2: null,
        status: "pending",
        slot: idx + 1,
        round: r + 1,
        byeTeam,
      });
      idx++;
    }
    // Fill the round's byeTeam onto its matches (known only after the inner loop)
    result.filter(m => m.round === r + 1).forEach(m => { m.byeTeam = byeTeam; });
    // Rotate: keep the first team fixed, rotate the rest clockwise.
    rot = [rot[0], rot[rot.length - 1], ...rot.slice(1, rot.length - 1)];
  }
  return result;
}

function computeStandings(teams, matches) {
  const stat = teams.map((name,i) => ({ idx:i, name, W:0, L:0, PF:0, PA:0, GP:0 }));
  (matches||[]).forEach(m => {
    if (m.status!=="done") return;
    stat[m.t1].PF+=m.s1; stat[m.t1].PA+=m.s2; stat[m.t1].GP++;
    stat[m.t2].PF+=m.s2; stat[m.t2].PA+=m.s1; stat[m.t2].GP++;
    if (m.s1>m.s2){stat[m.t1].W++;stat[m.t2].L++;}
    else{stat[m.t2].W++;stat[m.t1].L++;}
  });
  return stat.sort((a,b)=>b.W-a.W||(b.PF-b.PA)-(a.PF-a.PA));
}

function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

export { makePoolMatches, computeStandings, esc };
