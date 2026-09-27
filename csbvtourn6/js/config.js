import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* -------------------------------------------------------------------------
   FIREBASE CONFIG - already filled in
------------------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "",
  authDomain: "csbv-tourn-2x2.firebaseapp.com",
  databaseURL: "https://csbv-tourn-2x2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "csbv-tourn-2x2",
  storageBucket: "csbv-tourn-2x2.firebasestorage.app",
  messagingSenderId: "47312426218",
  appId: "1:47312426218:web:92d2bfa6a596a7de36f393",
  measurementId: "G-PZH8V5W74V"
};

/* -------------------------------------------------------------------------
   * SET YOUR ADMIN PIN HERE
------------------------------------------------------------------------- */
const ADMIN_PIN = "7890";   // <- change this to your own PIN

/* ==========================================================================
   CONSTANTS
========================================================================== */
const POOL_NAMES  = ["A","B"];
const POOL_COLORS = ["#C8F04A","#FF6B3D"];
// Four courts per pool: pool A plays on A1-A4, pool B on B1-B4.
const COURT_NAMES = ["Court A1","Court A2","Court A3","Court A4",
                     "Court B1","Court B2","Court B3","Court B4"];
const DEFAULT_TEAMS = [
  ["Sand Sharks","Net Raiders","Spike Force","Block Party",
   "Ace Squad","Beach Kings","Wave Riders","Dig Deep"],
  ["Set & Match","Sun Spikers","Grit & Grin","High Flyers",
   "Coast Crew","Serve Masters","Power Play","Iron Nets"],
];

export { firebaseConfig, ADMIN_PIN, POOL_NAMES, POOL_COLORS, COURT_NAMES, DEFAULT_TEAMS,
         initializeApp, getDatabase, ref, set, onValue };
