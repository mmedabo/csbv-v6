import { firebaseConfig, ADMIN_PIN, DB_NS, POOL_NAMES, POOL_COLORS, DEFAULT_TEAMS,
         initializeApp, getDatabase, ref, set, onValue } from "./config.js";

/* ==========================================================================
   FIREBASE
========================================================================== */
const isConfigured = firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY";
let db;
if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

// All V6 data lives under the DB_NS root, isolated from the old 5.5 data.
const dbRef = (path) => ref(db, DB_NS ? `${DB_NS}/${path}` : path);

function syncToFirebase(data) { if (db) set(dbRef("tournament"), data); }
function syncTeamsData() { if (db) set(dbRef("teamsData"), state.teamsData); }
function syncSchedule()  { if (db) set(dbRef("schedule"),  state.schedule); }
function syncDaySchedule() { if (db) set(dbRef("daySchedule"), state.daySchedule); }
function syncInventory() { if (db) set(dbRef("inventory"), state.inventory); }
function syncAuditLog() { if (db) set(dbRef("auditLog"), state.auditLog); }
function syncRulesConfig() { if (db) set(dbRef("rulesConfig"), state.hiddenRules); }

function addAuditEntry(entry) {
  state.auditLog = [{ ...entry, ts: Date.now() }, ...state.auditLog].slice(0, 200);
  syncAuditLog();
}

function startFirebaseListener() {
  if (!db) return;
  let tournamentLoaded = false;
  let teamsDataLoaded = false;

  function tryRender() {
    // Only render once both listeners have fired at least once
    if (tournamentLoaded && teamsDataLoaded) { if (typeof window.__render === 'function') window.__render(); }
  }

  onValue(dbRef("tournament"), snap => {
    const data = snap.val();
    // Preserve mid-edit values
    if (state.editingMatch) {
      const v1 = document.getElementById(`s1_${state.editingMatch}`);
      const v2 = document.getElementById(`s2_${state.editingMatch}`);
      if (v1) state.editScores.s1 = v1.value;
      if (v2) state.editScores.s2 = v2.value;
    }
    if (state.koEditing) {
      const v1 = document.getElementById(`ko_s1_${state.koEditing}`);
      const v2 = document.getElementById(`ko_s2_${state.koEditing}`);
      if (v1) state.koScores.s1 = v1.value;
      if (v2) state.koScores.s2 = v2.value;
    }
    if (data) {
      state.pools = data.pools;
      state.phase = data.phase || "pool";
      // Sync teamNames from live pools.teams so setup tab shows correct names
      if (data.pools?.teams) {
        state.teamNames = data.pools.teams.map(p => [...p]);
      }
    }
    tournamentLoaded = true;
    tryRender();
  });

  onValue(dbRef("schedule"), snap => {
    const data = snap.val();
    if (data) state.schedule = data;
  });

  onValue(dbRef("auditLog"), snap => {
    const data = snap.val();
    if (data) state.auditLog = data;
  });

  onValue(dbRef("inventory"), snap => {
    const data = snap.val();
    if (data) state.inventory = data;
  });

  onValue(dbRef("daySchedule"), snap => {
    const data = snap.val();
    if (data) state.daySchedule = data;
  });

  onValue(dbRef("rulesConfig"), snap => {
    const data = snap.val();
    state.hiddenRules = data || {};
    if (typeof window.__render === 'function') window.__render();
  });

  onValue(dbRef("teamsData"), snap => {
    const data = snap.val();
    if (data) {
      state.teamsData = data;
      // Also push saved team names back into pools.teams and teamNames
      data.forEach((poolTeams, pi) => {
        (poolTeams || []).forEach((team, ti) => {
          const name = team?.teamName?.trim();
          if (name) {
            state.teamNames[pi] = state.teamNames[pi] || [];
            state.teamNames[pi][ti] = name;
            if (state.pools?.teams?.[pi]) state.pools.teams[pi][ti] = name;
          }
        });
      });
    }
    teamsDataLoaded = true;
    tryRender();
  });
}

/* ==========================================================================
   FINAL ROSTERS
   One entry per team, in the same order as DEFAULT_TEAMS (A1-A8, then B1-B8).
   Each roster is [male 1, male 2, female] to match the players[] order used
   throughout the app.
========================================================================== */
// Pool A = odd rows of the source table (1,3,5,...,15);
// Pool B = even rows (2,4,6,...,16).
const ROSTERS = [
  [ // Pool A (odd rows)
    ["Stanley","Dennis","Minky"],       // A1  (row 1)
    ["Eugene","Ray","Kelly"],           // A2  (row 3)
    ["Gene","Aly","Julia"],             // A3  (row 5)
    ["EK","Todd","Jolene"],             // A4  (row 7)
    ["Barath","Pram","Isla"],           // A5  (row 9)
    ["Mitchell","Maddy","Liz"],         // A6  (row 11)
    ["Rossi","Shane","Solène"],         // A7  (row 13)
    ["Anand","Din","Anna"],             // A8  (row 15)
  ],
  [ // Pool B (even rows)
    ["Josh","Mika","Iris"],             // B1  (row 2)
    ["Ivan A","Sup","gladys"],          // B2  (row 4)
    ["Alex","Adrian Lowry","gidselle"], // B3  (row 6)
    ["Jules","Ash","Karen"],            // B4  (row 8)
    ["Henry","Yatha","Bernie"],         // B5  (row 10)
    ["Anas","Marcus","Carla"],          // B6  (row 12)
    ["Fai","Sat","Dewi"],               // B7  (row 14)
    ["Ivan T","David","Jess"],          // B8  (row 16)
  ],
];

/* ==========================================================================
   STATE
========================================================================== */
let state = {
  // role: "landing" | "viewer" | "admin"
  role: "landing",
  pinInput: "",
  pinError: false,

  phase: "setup",
  tab: "overview",
  teamNames: DEFAULT_TEAMS.map(p=>[...p]),
  pools: null,
  editingMatch: null,
  editScores: { s1:"", s2:"" },
  koEditing: null,
  koScores: { s1:"", s2:"" },
  // teamsData: { pool: [ { teamName, players: [str] } ] }
  // 3 players per team, in order: [male 1, male 2, female]
  teamsData: POOL_NAMES.map((_,pi) =>
    DEFAULT_TEAMS[pi].map((name,ti) => ({ teamName: name, players: [...ROSTERS[pi][ti]] }))
  ),
  editingTeamsData: false,
  schedule: {},
  daySchedule: [
    { id:"ds1",  time:"1:30-1:40", activity:"Team registration" },
    { id:"ds2",  time:"1:40-1:50", activity:"Tournament briefing" },
    { id:"ds3",  time:"1:50-2:00", activity:"Warm-up / stretching" },
    { id:"ds4",  time:"2:00-2:05", activity:"Group photo &#128247;" },
    { id:"ds5",  time:"2:05-4:15", activity:"Pool stage (2 pools of 8 &middot; 7 games each)" },
    { id:"ds6",  time:"4:15-4:30", activity:"Score tally + hydration break" },
    { id:"ds8",  time:"4:30-4:45", activity:"Drinks / rest break &#127862;" },
    { id:"ds9",  time:"4:45-5:15", activity:"Semi-finals" },
    { id:"ds10", time:"5:15-5:30", activity:"Finalists rest / hydration break &#127862;" },
    { id:"ds11", time:"5:30-6:00", activity:"Grand Final &#127942;" },
    { id:"ds12", time:"6:00-6:10", activity:"Prize presentation" },
    { id:"ds13", time:"6:10-6:20", activity:"Champions photos / closing &#128247;" },
  ],
  hiddenRules: {}, // { ruleNumber: true } — rule cards hidden from viewers (synced)
  expandedTeams: {}, // { 'poolIdx-teamName': true } — UI only, not synced
  expandedPools: { 0:true, 1:false }, // only Pool A open by default
  auditLog: [],
  inventory: {
    equipment: [
      { id:"eq1", name:"Ball 1", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq2", name:"Ball 2", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq3", name:"Ball 3", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq4", name:"Ball 4", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq5", name:"Ball 5", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq6", name:"Ball 6", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq7", name:"Ball 7", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq8", name:"Ball 8", category:"ball", assignedTo:"", returned:false, notes:"" },
      { id:"eq9",  name:"Net 1", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq10", name:"Net 2", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq11", name:"Net 3", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq12", name:"Net 4", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq13", name:"Net 5", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq14", name:"Net 6", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq15", name:"Net 7", category:"net",  assignedTo:"", returned:false, notes:"" },
      { id:"eq16", name:"Net 8", category:"net",  assignedTo:"", returned:false, notes:"" },
    ],
    drinks: [
      { id:"dr1", name:"Water",        qty:0, unit:"bottles", notes:"" },
      { id:"dr2", name:"Sports Drink", qty:0, unit:"cans",    notes:"" },
      { id:"dr3", name:"Coconut Water", qty:0, unit:"bottles", notes:"" },
    ]
  },
};

const isAdmin = () => state.role === "admin";

// Force the final 16-team roster (A1-B8) into state and push it to Firebase,
// overriding whatever is currently stored. Used by the admin "Load Final
// Roster" button so the live roster can be set from the browser (the DB can't
// be written from anywhere else in this setup).
function applyFinalRoster() {
  state.teamNames = DEFAULT_TEAMS.map(p => [...p]);
  state.teamsData = POOL_NAMES.map((_, pi) =>
    DEFAULT_TEAMS[pi].map((name, ti) => ({ teamName: name, players: [...ROSTERS[pi][ti]] })));
  // If a tournament is already generated, keep its matches/scores but refresh
  // the team names so pool standings and the bracket show A1-B8.
  if (state.pools?.teams) {
    state.teamNames.forEach((pool, pi) =>
      pool.forEach((n, ti) => { if (state.pools.teams[pi]) state.pools.teams[pi][ti] = n; }));
    syncToFirebase({ pools: state.pools, phase: state.phase });
  }
  syncTeamsData();
}

export { state, isAdmin, isConfigured, db, applyFinalRoster,
         syncToFirebase, syncTeamsData, syncSchedule, syncAuditLog, addAuditEntry,
         syncInventory, syncDaySchedule, syncRulesConfig, startFirebaseListener };
