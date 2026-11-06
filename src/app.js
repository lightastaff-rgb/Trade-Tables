const SPRITES = {"aerolatas": "assets/items/aerolatas.png", "bones": "assets/items/bones.png", "bottles": "assets/items/bottles.png", "brains": "assets/items/brains.png", "crab": "assets/items/crab.png", "emeralds": "assets/items/emeralds.png", "eyes": "assets/items/eyes.png", "golddia": "assets/items/golddia.png", "mushrooms": "assets/items/mushrooms.png", "newspaper": "assets/items/newspaper.png", "ores": "assets/items/ores.png", "paper": "assets/items/paper.png", "rubys": "assets/items/rubys.png", "sanddollars": "assets/items/sanddollars.png", "sandscall": "assets/items/sandscall.png", "starfish": "assets/items/starfish.png", "tires": "assets/items/tires.png"};
const KEEPER = "assets/ui/keeper.png";

const GROUPS = [
  {name:"Minerals", items:[
    {id:"ores", name:"Ores", price:5, sprite:"m5"},
    {id:"rubys", name:"Rubys / Sapphires", price:7, sprite:"m7"},
    {id:"emeralds", name:"Emeralds", price:8, sprite:"m8"},
    {id:"golddia", name:"Gold / Diamonds", price:10, sprite:"m10"},
  ]},
  {name:"Shells", items:[
    {id:"aerolatas", name:"Aerolatas", price:3, sprite:"s3"},
    {id:"sandscall", name:"Sandscall", price:5, sprite:"s5"},
    {id:"sanddollars", name:"Sand Dollars", price:5, sprite:"s5"},
    {id:"crab", name:"Crab Shells", price:6, sprite:"s6"},
    {id:"starfish", name:"Starfish", price:7, sprite:"s7"},
  ]},
  {name:"Trash", items:[
    {id:"paper", name:"Paper", price:4, sprite:"t4"},
    {id:"newspaper", name:"Newspaper", price:4, sprite:"t4"},
    {id:"bottles", name:"Bottles", price:5, sprite:"t5"},
    {id:"tires", name:"Tires", price:6, sprite:"t6"},
  ]},
  {name:"Forage", items:[
    {id:"mushrooms", name:"Mushrooms", price:5, sprite:"mu5"},
  ]},
  {name:"Body Parts", items:[
    {id:"bones", name:"Bones / Feet / Hands", price:3, sprite:"b3"},
    {id:"eyes", name:"Eyes", price:4, sprite:"b4"},
    {id:"brains", name:"Brains / Hearts", price:5, sprite:"b5"},
  ]},
];
const ITEMS = GROUPS.flatMap(g => g.items);

/* ---------- state ---------- */
const KEY = "graal-trade-stand-v1";
let S = {qty:{}, conv:{g:{ratio:"2",reversed:false}, r:{ratio:"1.3",reversed:false}}, log:[], theme:null};
/* Saved data is untrusted: keep only known fields with the right types and sane ranges. */
const isNum = v => typeof v === "number" && Number.isFinite(v);
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function cleanState(raw){
  const out = {qty:{}, conv:{g:{ratio:"2",reversed:false}, r:{ratio:"1.3",reversed:false}}, log:[], theme:null, layout:null, layoutV:2, collapsed:{}, compact:false};
  if (!raw || typeof raw !== "object") return out;
  const ids = new Set(ITEMS.map(i => i.id));
  if (raw.qty && typeof raw.qty === "object") for (const [k, v] of Object.entries(raw.qty)) {
    if (!ids.has(k)) continue; const n = Math.floor(Number(v)); if (Number.isFinite(n) && n > 0) out.qty[k] = String(clampN(n, 0, 999999));
  }
  for (const k of ["g","r"]) { const c = raw.conv && raw.conv[k]; if (c && typeof c === "object") {
    const n = Number(c.ratio); if (Number.isFinite(n) && n > 0 && n <= 10000) out.conv[k].ratio = String(n);
    out.conv[k].reversed = c.reversed === true; } }
  if (Array.isArray(raw.log)) for (const e of raw.log.slice(0, 200)) {
    if (!e || typeof e !== "object") continue;
    const type = e.type === "rocks" ? "rocks" : e.type === "gralats" ? "gralats" : null;
    const direction = e.direction === "reverse" ? "reverse" : e.direction === "forward" ? "forward" : null;
    const inputLabel = e.inputLabel === "Rocks" ? "Rocks" : e.inputLabel === "Gralats" ? "Gralats" : null;
    const input = Number(e.input), ratio = Number(e.ratio), tro = Number(e.tro);
    const time = typeof e.time === "string" && /^\d{2}:\d{2}:\d{2}$/.test(e.time) ? e.time : "";
    if (!type || !direction || !inputLabel || ![input, ratio, tro].every(Number.isFinite)) continue;
    out.log.push({type, direction, inputLabel, input:String(input), ratio, tro, time});
  }
  if (raw.theme === "light" || raw.theme === "dark") out.theme = raw.theme;
  if (raw.layoutV === 2 && raw.layout && typeof raw.layout === "object") {
    const L = {}; let ok = true;
    for (const id of ["winBag","convG","convR","abacus","winReceipt"]) {
      const p = raw.layout[id]; if (!p || ![p.x, p.y, p.w].every(isNum)) { ok = false; break; }
      L[id] = {x:clampN(Math.round(p.x), 0, 10000), y:clampN(Math.round(p.y), 0, 20000), w:clampN(Math.round(p.w), 200, 4000)};
    }
    if (ok) out.layout = L;
  }
  if (raw.compact === true) out.compact = true;
  if (raw.collapsed && typeof raw.collapsed === "object") for (const id of ["winBag","convG","convR","winReceipt"]) if (raw.collapsed[id] === true) out.collapsed[id] = true;
  return out;
}
try { const raw = localStorage.getItem(KEY); S = cleanState(raw ? JSON.parse(raw) : null); } catch(e) { S = cleanState(null); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };

const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const fmt = n => n.toLocaleString("en-US", {maximumFractionDigits:2});
const fmt2 = n => n.toFixed(2);

/* ---------- toast + copy ---------- */
let toastT;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800); }
function copyText(text, okMsg){
  const fallback = () => {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch(e) {}
    ta.remove(); toast(ok ? okMsg : "Couldn't copy. Select the text and copy it yourself.");
  };
  try { navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback); } catch(e) { fallback(); }
}

/* ---------- theme ---------- */
function applyTheme(){
  const root = document.documentElement;
  if (S.theme) root.setAttribute("data-theme", S.theme); else root.removeAttribute("data-theme");
  const dark = S.theme ? S.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  $("#themeIcon").textContent = dark ? "☀" : "☾";
  $("#themeLbl").textContent = dark ? "Day market" : "Night market";
}
$("#themeBtn").onclick = () => {
  const dark = S.theme ? S.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  S.theme = dark ? "light" : "dark"; save(); applyTheme();
};
applyTheme();

/* ---------- bag ---------- */
function buildShelf(){
  const shelf = $("#shelf");
  shelf.innerHTML = GROUPS.map(g => `
    <h3><span class="ribbon">${g.name}</span></h3>
    <div class="slots">${g.items.map(it => `
      <div class="slot" data-id="${it.id}">
        <div class="pic"><img src="${SPRITES[it.id] || ""}" alt="" width="72" height="72"><span class="badge" aria-hidden="true"></span></div>
        <div class="meta"><span class="nm">${it.name}</span><span class="px"><b>${it.price}</b><span class="ea"> gralats each</span></span></div>
        <div class="qty">
          <button class="btn" type="button" data-step="-1" aria-label="One less ${it.name}">−</button>
          <span class="well"><input id="q-${it.id}" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="${it.name} amount"></span>
          <button class="btn" type="button" data-step="1" aria-label="One more ${it.name}">+</button>
        </div>
        <div class="val">= <span>0</span> g</div>
      </div>`).join("")}
    </div>`).join("");
  ITEMS.forEach(it => { const v = S.qty[it.id]; if (v) $("#q-" + it.id).value = v; });
  shelf.addEventListener("input", e => {
    const slot = e.target.closest(".slot"); if (!slot) return;
    const raw = e.target.value;
    if (raw !== "") { const n = clampN(Math.floor(num(raw)), 0, 999999); if (String(n) !== raw) e.target.value = n || ""; }
    S.qty[slot.dataset.id] = e.target.value; refreshBag(true);
  });
  shelf.addEventListener("click", e => {
    const b = e.target.closest("button[data-step]"); if (!b) return;
    const slot = b.closest(".slot"), inp = slot.querySelector("input");
    const n = clampN(Math.round(num(inp.value)) + Number(b.dataset.step), 0, 999999);
    inp.value = n || ""; S.qty[slot.dataset.id] = inp.value; refreshBag(true);
  });
}
const SLOTS = {};
function slotEl(id){ return SLOTS[id] || (SLOTS[id] = {el:document.querySelector(`.slot[data-id="${id}"]`)}, SLOTS[id].val = SLOTS[id].el.querySelector(".val span"), SLOTS[id].badge = SLOTS[id].el.querySelector(".badge"), SLOTS[id]); }
function bagTotal(){ return ITEMS.reduce((s, it) => s + num(S.qty[it.id]) * it.price, 0); }
function refreshBag(push){
  let count = 0, kinds = 0;
  ITEMS.forEach(it => {
    const q = num(S.qty[it.id]); const s = slotEl(it.id);
    s.el.classList.toggle("has", q > 0); s.val.textContent = fmt(q * it.price);
    s.badge.textContent = q > 0 ? (q > 999 ? "999+" : fmt(q)) : "";
    if (q > 0) { count += q; kinds++; }
  });
  const total = bagTotal();
  $("#bagTotal").textContent = fmt(total);
  $("#bagCount").textContent = fmt(count);
  $("#bagKinds").textContent = kinds; $("#kindsWord").textContent = kinds === 1 ? "kind" : "kinds";
  if (push) { convs.g.setFromBag(total); }
  save();
}
$("#emptyBtn").onclick = () => {
  S.qty = {}; ITEMS.forEach(it => $("#q-" + it.id).value = ""); refreshBag(true); toast("Bag emptied");
};

/* ---------- converters ---------- */
const swapIcon = `<svg viewBox="0 0 18 18" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M5 1h2v2h2v2H7v10H5V5H3V3h2zM11 3h2v10h2v2h-2v2h-2v-2H9v-2h2z"/></svg>`;
const convs = {};
const TRO_IMG = "assets/ui/tro.png";
function celebrate(el){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["var(--gold)","var(--rose)","var(--lav)","var(--mint)"];
  for (let i = 0; i < 6; i++) {
    const s = document.createElement("span"); s.className = "spark";
    const a = (Math.PI * 2 * i) / 6 + Math.random() * .5, d = 22 + Math.random() * 12;
    s.style.setProperty("--sx", Math.round(Math.cos(a) * d) + "px"); s.style.setProperty("--sy", Math.round(Math.sin(a) * d * .6) + "px");
    s.style.color = colors[i % colors.length]; el.appendChild(s); setTimeout(() => s.remove(), 800);
  }
  const c = document.createElement("img"); c.className = "coin"; c.src = TRO_IMG; c.alt = ""; el.appendChild(c); setTimeout(() => c.remove(), 900);
}
function makeConverter(key, el, cfg){
  const st = S.conv[key];
  el.innerHTML = `
    <div class="plank"><h2 id="${cfg.titleId}">${cfg.title}<small>${cfg.sub}</small></h2></div>
    <div class="conv">
      <div class="field"><label for="${key}-top" id="${key}-topL"></label>
        <div class="well"><input id="${key}-top" type="number" inputmode="decimal" placeholder="0"><span class="unit" id="${key}-topU"></span></div></div>
      <div class="field"><label for="${key}-ratio">Ratio</label>
        <div class="well"><input id="${key}-ratio" type="number" inputmode="decimal" step="0.01"><span class="unit">: 1</span></div></div>
      <div class="swaprow"><button class="swap btn" type="button" id="${key}-swap" aria-label="Switch direction">${swapIcon}</button><span id="${key}-dir"></span></div>
      <div class="field out"><label for="${key}-out" id="${key}-outL"></label>
        <div class="well"><input id="${key}-out" type="text" readonly placeholder="0" tabindex="-1"><span class="unit" id="${key}-outU"></span></div></div>
      <button class="btn go convert" type="button" id="${key}-go"></button>
      <div class="said" id="${key}-said" aria-live="polite"></div>
    </div>`;
  const top = el.querySelector(`#${key}-top`), ratio = el.querySelector(`#${key}-ratio`), out = el.querySelector(`#${key}-out`);
  const said = el.querySelector(`#${key}-said`);
  ratio.value = st.ratio;
  const label = () => {
    const a = st.reversed ? "Tro" : cfg.unit, b = st.reversed ? cfg.unit : "Tro";
    el.querySelector(`#${key}-topL`).textContent = `${a} you have`;
    el.querySelector(`#${key}-outL`).textContent = `${b} you get`;
    el.querySelector(`#${key}-topU`).textContent = a;
    el.querySelector(`#${key}-outU`).textContent = b;
    el.querySelector(`#${key}-dir`).textContent = `${a} → ${b}`;
    el.querySelector(`#${key}-go`).textContent = `Convert ${a} to ${b}`;
  };
  const convert = () => {
    const r = num(ratio.value); const a = num(top.value);
    if (!(r > 0) || r > 10000) { said.textContent = "Set a ratio between 0 and 10,000 first."; return; }
    if (a < 0 || a > 1e9) { said.textContent = "That amount is too large to convert."; return; }
    if (!a) { said.textContent = `Enter how many ${st.reversed ? "Tro" : cfg.unit} first.`; return; }
    let entry;
    if (st.reversed) {
      const res = a * r; out.value = fmt2(res);
      said.textContent = `${fmt(a)} Tro = ${fmt2(res)} ${cfg.unit}`;
      entry = {type:cfg.logType, input:fmt2(res), inputLabel:cfg.unit, ratio:r, tro:a, direction:"reverse"};
    } else {
      const t = a / r; out.value = fmt2(t);
      said.textContent = `${fmt(a)} ${cfg.unit} = ${fmt2(t)} Tro`;
      entry = {type:cfg.logType, input:String(a), inputLabel:cfg.unit, ratio:r, tro:t, direction:"forward"};
    }
    said.classList.remove("pop"); void said.offsetWidth; said.classList.add("pop");
    celebrate(said);
    addLog(entry);
  };
  top.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); convert(); } });
  ratio.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); convert(); } });
  ratio.addEventListener("input", () => { st.ratio = ratio.value; save(); });
  top.addEventListener("input", () => { out.value = ""; said.textContent = ""; });
  el.querySelector(`#${key}-go`).onclick = convert;
  el.querySelector(`#${key}-swap`).onclick = () => {
    st.reversed = !st.reversed; save(); top.value = ""; out.value = ""; said.textContent = ""; label();
    if (!st.reversed && cfg.fromBag) setFromBag(bagTotal());
    top.focus();
  };
  const setFromBag = total => {
    if (!cfg.fromBag || st.reversed) return;
    top.value = total > 0 ? String(total) : ""; out.value = ""; said.textContent = "";
  };
  label();
  return {setFromBag};
}
convs.g = makeConverter("g", $("#convG"), {title:"Gralats ⇄ Tro", sub:"Your bag total fills in here", titleId:"gTitle", unit:"Gralats", logType:"gralats", fromBag:true});
convs.r = makeConverter("r", $("#convR"), {title:"Rocks ⇄ Tro", sub:"Rock trading rate", titleId:"rTitle", unit:"Rocks", logType:"rocks", fromBag:false});

/* ---------- receipt ---------- */
const lineFor = e => e.direction === "forward"
  ? `${e.input} ${e.inputLabel} @ ${e.ratio}:1 = ${fmt2(e.tro)} Tro`
  : `${fmt2(e.tro)} Tro → ${e.input} ${e.inputLabel} @ ${e.ratio}:1`;
function addLog(entry){
  entry.time = new Date().toLocaleTimeString("en-US", {hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit"});
  S.log.unshift(entry); if (S.log.length > 200) S.log.length = 200; save(); renderLog();
}
function renderLog(){
  const tape = $("#tape");
  if (!S.log.length) {
    tape.innerHTML = `<li class="empty"><img class="keeper-sm" src="${KEEPER}" alt="" width="56" height="84">No trades yet.<br>The stand is open.</li>`;
  } else {
    tape.innerHTML = S.log.map((e, i) => `
      <li>
        <span class="k">${esc(e.type)}${e.time ? " · " + esc(e.time) : ""}</span>
        <span class="ln">${e.direction === "forward" ? `${esc(e.input)} ${esc(e.inputLabel)} @ ${esc(e.ratio)}:1` : `${fmt2(e.tro)} Tro → ${esc(e.input)} ${esc(e.inputLabel)}`}</span>
        <span class="eq">${e.direction === "forward" ? `= ${fmt2(e.tro)} Tro` : `@ ${esc(e.ratio)}:1`}</span>
        <button class="cp" type="button" data-i="${i}" aria-label="Copy this trade">copy</button>
      </li>`).join("");
  }
  const total = S.log.reduce((s, e) => s + e.tro, 0);
  $("#troTotal").textContent = fmt2(total);
  $("#copyAll").disabled = $("#clearLog").disabled = !S.log.length;
}
$("#tape").addEventListener("click", e => {
  const b = e.target.closest(".cp"); if (!b) return;
  copyText(lineFor(S.log[Number(b.dataset.i)]), "Trade copied");
});
$("#copyAll").onclick = () => {
  const total = S.log.reduce((s, e) => s + e.tro, 0);
  copyText(S.log.map(lineFor).join("\n") + `\n\nTotal: ${fmt2(total)} Tro`, "Whole receipt copied");
};
let tearArmed = false, tearT;
$("#clearLog").onclick = () => {
  const b = $("#clearLog");
  if (!tearArmed) { tearArmed = true; b.textContent = "Tap again to clear"; tearT = setTimeout(() => { tearArmed = false; b.textContent = "Tear off"; }, 2500); return; }
  clearTimeout(tearT); tearArmed = false; b.textContent = "Tear off";
  S.log = []; save(); renderLog(); toast("Receipt cleared");
};
$("#rcptDate").textContent = new Date().toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", year:"numeric"});

/* ---------- abacus ---------- */
const C = {display:"0", prev:null, op:null, fresh:false};
const calcFn = (a, b, op) => op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : op === "÷" ? (b !== 0 ? a / b : 0) : b;
const tidy = n => String(parseFloat(n.toFixed(10)));
function calcDraw(){ $("#calcNum").textContent = C.display; $("#calcPend").textContent = C.op && C.prev !== null ? `${tidy(C.prev)} ${C.op}` : ""; }
function cDigit(d){ if (C.fresh) { C.display = d; C.fresh = false; } else C.display = C.display === "0" ? d : C.display + d; calcDraw(); }
function cDot(){ if (C.fresh) { C.display = "0."; C.fresh = false; } else if (!C.display.includes(".")) C.display += "."; calcDraw(); }
function cOp(op){
  const cur = parseFloat(C.display);
  if (C.prev !== null && C.op && !C.fresh) { const r = calcFn(C.prev, cur, C.op); C.display = tidy(r); C.prev = r; } else C.prev = cur;
  C.op = op; C.fresh = true; calcDraw();
}
function cEq(){ if (C.prev === null || !C.op) return; C.display = tidy(calcFn(C.prev, parseFloat(C.display), C.op)); C.prev = null; C.op = null; C.fresh = true; calcDraw(); }
function cClear(){ Object.assign(C, {display:"0", prev:null, op:null, fresh:false}); calcDraw(); }
function cBack(){ if (C.fresh) return; C.display = C.display.length > 1 ? C.display.slice(0, -1) : "0"; calcDraw(); }
const KEYS = [["C","op",cClear],["←","op",cBack],["÷","op",()=>cOp("÷")],["×","op",()=>cOp("×")],
  ["7","",()=>cDigit("7")],["8","",()=>cDigit("8")],["9","",()=>cDigit("9")],["−","op",()=>cOp("−")],
  ["4","",()=>cDigit("4")],["5","",()=>cDigit("5")],["6","",()=>cDigit("6")],["+","op",()=>cOp("+")],
  ["1","",()=>cDigit("1")],["2","",()=>cDigit("2")],["3","",()=>cDigit("3")],["=","eq",cEq],
  ["0","wide",()=>cDigit("0")],[".","",cDot]];
$("#keys").innerHTML = KEYS.map((k, i) => `<button type="button" class="btn ${k[1]}" data-k="${i}">${k[0]}</button>`).join("");
$("#keys").addEventListener("click", e => { const b = e.target.closest("button"); if (b) KEYS[Number(b.dataset.k)][2](); });
$("#calc").addEventListener("keydown", e => {
  if (e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
  const k = e.key;
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "c") { e.preventDefault(); copyText(C.display, "Copied " + C.display); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[0-9]$/.test(k)) cDigit(k); else if (k === ".") cDot();
  else if (k === "+") cOp("+"); else if (k === "-") cOp("−"); else if (k === "*") cOp("×"); else if (k === "/") cOp("÷");
  else if (k === "Enter" || k === "=") cEq(); else if (k === "Backspace") cBack();
  else if (k === "Escape" || k.toLowerCase() === "c") cClear(); else return;
  e.preventDefault();
});
$("#calc").addEventListener("paste", e => {
  const t = (e.clipboardData && e.clipboardData.getData("text")) || ""; const c = t.replace(/[^0-9.]/g, "");
  if (!c) return; e.preventDefault(); const p = c.split("."); const v = p[0] + (p.length > 1 ? "." + p.slice(1).join("") : "");
  if (C.fresh || C.display === "0") { C.display = v || "0"; C.fresh = false; } else C.display += v; calcDraw();
});
$("#calcCopy").onclick = () => copyText(C.display, "Copied " + C.display);
$("#abacus").addEventListener("toggle", () => { if ($("#abacus").open) $("#calc").focus(); });
calcDraw();

/* ---------- screenshot reading (asks Claude) ---------- */
let sample = null, remote = false;
// Screenshot reader hosted on the Lovable project (used when the page isn't running inside Claude).
const READER_URL = "https://gmakxiykchiuygzwffel.supabase.co/functions/v1/read-inventory";
const READER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWt4aXlrY2hpdXlnendmZmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDUxNTIsImV4cCI6MjA4ODk4MTE1Mn0.eTfbpxE1fiWmJrjQrY3UaKzXh9sdDroGH03mf_4fSCY";
function fileToDataUrl(file){
  return new Promise((res, rej) => {
    // Shrink before upload: smaller pictures upload and read much faster. Small ones go as they are.
    const big = file.size > 600 * 1024;
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("read"));
    fr.onload = () => {
      if (!big) return res(fr.result);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", .88));
      };
      img.onerror = () => rej(new Error("decode"));
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
// Add up listed stacks in code so a stack is never counted twice.
function sumStacks(res, names){
  const totals = {}, seen = new Set();
  const list = res && Array.isArray(res.stacks) ? res.stacks.slice(0, 200) : [];
  list.forEach(st => {
    const q = Number(st && st.quantity), item = st && st.item;
    if (!names.includes(item) || !Number.isFinite(q) || q <= 0) return;
    const key = String(st.label || "").trim().toLowerCase() + "|" + q;
    if (seen.has(key)) return; seen.add(key);
    totals[item] = (totals[item] || 0) + q;
  });
  return n => totals[n] || 0;
}
function fillFromCounts(get){
  let found = 0;
  ITEMS.forEach(it => {
    const v = Math.round(Number(get(it.name)));
    if (Number.isFinite(v) && v > 0 && v <= 999999) { S.qty[it.id] = String(v); found++; } else S.qty[it.id] = "";
    $("#q-" + it.id).value = S.qty[it.id];
  });
  refreshBag(true);
  shotStatus(found ? `Filled in ${found} item${found > 1 ? "s" : ""} from your screenshot. Give the counts a quick check.` : "No sellables found in that picture.");
}
// Shared reader used by the bag box and the Trade Chat. Resolves {item name: count}; rejects with a readable message.
const READ_PROMPT = names => `This is a GraalOnline Era screenshot (inventory, trade window, or item list). List every visible item stack, slot or quantity label exactly once. Do not add anything up yourself.
Allowed items: ${JSON.stringify(names)}
Rules:
- One entry per stack: "label" is the text shown (for example "x1,418 mushroom"), "quantity" is its number, "item" is the matching allowed item.
- Commas are thousands separators (x1,418 = 1418). "K" means thousands (2.5K = 2500).
- The icon next to a quantity label is the same stack, never a separate entry.
- All mushroom colours (plain, yellow, purple, red) are "Mushrooms". "broken bottle trash" is "Bottles". Rubies and sapphires are "Rubys / Sapphires"; gold and diamonds are "Gold / Diamonds"; rocks or ore are "Ores"; bones, feet and hands are "Bones / Feet / Hands"; brains and hearts are "Brains / Hearts".
- Loose icons with no number are quantity 1 each.
- Skip gralat or currency counters, buttons, and anything not in the allowed list. Never guess items you cannot see.
Reply with only JSON: {"stacks":[{"label":"...","quantity":0,"item":"..."}]}`;
async function readPicture(file){
  const names = ITEMS.map(i => i.name), out = {};
  const keep = get => names.forEach(n => { const v = Math.round(Number(get(n))); if (Number.isFinite(v) && v > 0 && v <= 9999999) out[n] = v; });
  if (file.size > 20 * 1024 * 1024) throw new Error("That picture is too big. Use one under 20 MB.");
  if (sample) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error("Use a PNG, JPEG or WEBP picture.");
    try { keep(sumStacks(await sample.json(READ_PROMPT(names), {images:[file]}), names)); return out; }
    catch (e) {
      const code = e && e.code;
      if (code === "rate_limited") throw new Error("Too many reads right now. Try again in a minute.");
      if (code === "image_rejected") throw new Error("That picture couldn't be read. Try a smaller PNG or JPEG.");
      if (code === "invalid_json" || code === "empty_completion") throw new Error("Couldn't make out the counts. Try a clearer, closer screenshot.");
      const err = new Error("Couldn't read that picture. Try again."); err.code = code; throw err;
    }
  }
  if (!remote) throw new Error("Screenshot reading isn't available here.");
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use a PNG, JPEG or WEBP picture.");
  let r, data = {};
  try {
    const image = await fileToDataUrl(file);
    r = await fetch(READER_URL, {method:"POST", headers:{"Content-Type":"application/json", "apikey":READER_KEY, "Authorization":"Bearer " + READER_KEY}, body:JSON.stringify({image})});
    try { data = await r.json(); } catch (_) {}
  } catch (_) { throw new Error("Couldn't reach the screenshot reader. Check your connection and try again."); }
  if (!r.ok || data.error) {
    if (r.status === 429) throw new Error("Too many reads right now. Try again in a minute.");
    if (r.status === 402) throw new Error("The screenshot reader is out of credits. Type your counts in for now.");
    throw new Error(typeof data.error === "string" ? data.error.slice(0, 160) : "Couldn't read that picture. Try again.");
  }
  const counts = data && typeof data.counts === "object" && data.counts ? data.counts : {};
  keep(n => counts[n]);
  return out;
}
const shotStatus = (msg, err) => { const s = $("#shotStatus"); s.textContent = msg; s.classList.toggle("err", !!err); };
const READ_KEY = "graal-trade-stand-reads";
function readAllowed(n = 1){
  let st = {day:"", n:0, last:0};
  try { const v = JSON.parse(localStorage.getItem(READ_KEY) || "{}"); if (v && typeof v === "object") st = Object.assign(st, v); } catch (_) {}
  const now = Date.now(), day = new Date().toISOString().slice(0, 10);
  if (st.day !== day) { st.day = day; st.n = 0; }
  if (now - (Number(st.last) || 0) < 8000) return {ok:false, msg:"Give it a few seconds between screenshots."};
  if (st.n + n > 40) return {ok:false, msg: st.n >= 40 ? "Daily screenshot limit reached (40 a day). Type your counts in, or try again tomorrow." : `Only ${40 - st.n} screenshot read${40 - st.n === 1 ? "" : "s"} left today. Send fewer pictures.`};
  st.n += n; st.last = now;
  try { localStorage.setItem(READ_KEY, JSON.stringify(st)); } catch (_) {}
  return {ok:true};
}
async function readShot(file){
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { shotStatus("That picture is too big. Use one under 20 MB.", true); return; }
  if (busy) return;
  if (!sample && !remote) return;
  showThumb(file);
  const gate = readAllowed(1); if (!gate.ok) { shotStatus(gate.msg, true); return; }
  setBusy(true); shotStatus("Reading your screenshot…");
  try { const got = await readPicture(file); fillFromCounts(n => got[n]); }
  catch (e) {
    const code = e && e.code;
    if (["not_granted","sampling_disabled","images_unavailable","not_declared","capability_disabled","capability_removed"].includes(code)) {
      $("#shotZone").hidden = true; shotStatus("Screenshot reading isn't available here. Type your counts in instead.", true);
    } else if (code !== "cancelled") shotStatus(e.message || "Couldn't read that picture. Try again.", true);
  } finally { setBusy(false); }
}
/* ---------- paste / drop / pick a screenshot ---------- */
const zone = $("#shotZone");
let busy = false, thumbUrl = null;
function setBusy(on){ busy = on; zone.classList.toggle("busy", on); zone.setAttribute("aria-busy", String(on)); $("#pasteBtn").disabled = on; if (!on) $("#shotFile").value = ""; }
function showThumb(file){
  try { if (thumbUrl) URL.revokeObjectURL(thumbUrl); thumbUrl = URL.createObjectURL(file); const t = $("#shotThumb"); t.src = thumbUrl; t.hidden = false; } catch (_) {}
}
const imageFrom = list => [...(list || [])].find(f => f && f.type && f.type.startsWith("image/"));
const readerOn = () => (sample || remote) && !zone.hidden;
if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $("#pasteKey").textContent = "⌘";
zone.addEventListener("click", e => { if (busy || e.target.closest("#pasteBtn")) return; $("#shotFile").click(); });
zone.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target === zone) { e.preventDefault(); if (!busy) $("#shotFile").click(); } });
$("#shotFile").onchange = e => readShot(e.target.files && e.target.files[0]);
["dragenter","dragover"].forEach(t => zone.addEventListener(t, e => { if (!readerOn()) return; e.preventDefault(); zone.classList.add("drag-over"); }));
["dragleave","dragend"].forEach(t => zone.addEventListener(t, () => zone.classList.remove("drag-over")));
zone.addEventListener("drop", e => {
  e.preventDefault(); zone.classList.remove("drag-over");
  const f = imageFrom(e.dataTransfer && e.dataTransfer.files);
  if (f) readShot(f); else shotStatus("Drop an image file (PNG, JPEG or WEBP).", true);
});
// Ctrl+V / Cmd+V works anywhere on the page, not only inside the box
document.addEventListener("paste", e => {
  if (!readerOn()) return;
  if (e.target.closest && e.target.closest("#calc")) return;
  if (!$("#chat").hidden) return;
  const f = imageFrom(e.clipboardData && e.clipboardData.files);
  if (f) { e.preventDefault(); readShot(f); }
  else if (e.target === zone || zone.contains(e.target)) shotStatus("There's no image on your clipboard. Copy a screenshot first.", true);
});
// One-tap Paste button, where the browser allows reading images from the clipboard
$("#pasteBtn").onclick = async () => {
  try {
    const items = await navigator.clipboard.read();
    for (const it of items) {
      const type = it.types.find(t => t.startsWith("image/"));
      if (type) { const blob = await it.getType(type); return readShot(new File([blob], "clipboard." + type.split("/")[1], {type})); }
    }
    shotStatus("There's no image on your clipboard. Copy a screenshot first.", true);
  } catch (_) {
    shotStatus("Your browser didn't allow the Paste button. Press Ctrl+V instead, or click the box to choose a file.", true);
  }
};
function showReader(){ zone.hidden = false; if (!window.claude && navigator.clipboard && typeof navigator.clipboard.read === "function") $("#pasteBtn").hidden = false; }
function useRemoteReader(){ if (sample) return; remote = true; showReader(); $("#shotFile").accept = "image/png,image/jpeg,image/webp"; }
(async () => {
  try {
    if (!window.claude || !claude.use) { useRemoteReader(); return; }
    const s = await claude.use("sample"); if (!s) { useRemoteReader(); return; }
    const lim = await s.limits().catch(() => null);
    if (!lim || !lim.images) { useRemoteReader(); return; }
    sample = s; showReader();
    $("#shotFile").accept = lim.images.mediaTypes.join(",");
  } catch (e) { useRemoteReader(); }
})();


/* ---------- Trade Chat: send screenshots, get gralats and Tro ---------- */
const chat = $("#chat"), chatLog = $("#chatLog"), chatText = $("#chatText"), chatPicsEl = $("#chatPics");
const MAX_PICS = 20;
let chatPics = [], chatBusy = false, chatGreeted = false;
const BY_NAME = Object.fromEntries(ITEMS.map(i => [i.name, i]));
// words people type -> item id ("gralats", "rocks" and "tro" are money, not items)
const ALIASES = [
  [/\b(?:yellow|purple|red|blue|green|brown|plain)?\s*(?:mushrooms?|shrooms?)\b/g, " @mushrooms "],
  [/\bnews\s*papers?\b|\bnewspapers?\b/g, " @newspaper "],
  [/\bsand\s*dollars?\b|\bdollars?\b/g, " @sanddollars "],
  [/\bsand\s*scalls?\b|\bsandscalls?\b|\bscalls?\b/g, " @sandscall "],
  [/\bcrab(?:\s*shells?)?s?\b/g, " @crab "],
  [/\bstar\s*fish(?:es)?\b|\bstars?\b/g, " @starfish "],
  [/\baero(?:latas?)?s?\b/g, " @aerolatas "],
  [/\b(?:broken\s*)?bottles?(?:\s*trash)?\b/g, " @bottles "],
  [/\btyres?\b|\btires?\b/g, " @tires "],
  [/\bpapers?\b/g, " @paper "],
  [/\bores?\b/g, " @ores "],
  [/\brub(?:y|ys|ies)\b|\bsapph?(?:ire)?s?\b/g, " @rubys "],
  [/\bemeralds?\b|\bems?\b/g, " @emeralds "],
  [/\bgold\b|\bdiamonds?\b|\bdias?\b/g, " @golddia "],
  [/\bbones?\b|\bfeet\b|\bfoot\b|\bhands?\b/g, " @bones "],
  [/\beyes?\b|\beyeballs?\b/g, " @eyes "],
  [/\bbrains?\b|\bhearts?\b/g, " @brains "],
  [/\bgralats?\b|\bgrals?\b|\bgs?\b/g, " @gralats "],
  [/\brocks?\b/g, " @rocks "],
  [/\btros?\b/g, " @tro "],
];
const numOf = t => { const m = /^x?(\d[\d,]*(?:\.\d+)?)(k|m)?$/.exec(t); if (!m) return null; let v = Number(m[1].replace(/,/g, "")); if (m[2] === "k") v *= 1e3; if (m[2] === "m") v *= 1e6; return Number.isFinite(v) ? v : null; };
// Reads typed extras like "plus 40k gralats, 500 rocks at 1.5" or "1,418 mushrooms".
function parseText(text){
  let t = " " + String(text).toLowerCase().replace(/[×*]/g, " x ").replace(/[\/+;&|]/g, " , ") + " ";
  const res = {items:{}, gralats:0, rocks:0, tro:0, ratioG:null, ratioR:null, unknown:[]};
  for (let i = 0; i < 3; i++) t = t.replace(/(\d),(\d{3})(?!\d)/g, "$1$2"); // 1,418 -> 1418
  t = t.replace(/\b(rocks?\s*(?:ratio|rate|at|@)\s*|(?:ratio|rate)\s*(?:for\s*)?rocks?\s*)(\d+(?:\.\d+)?)/g, (_, a, n) => { res.ratioR = Number(n); return " rocks "; });
  t = t.replace(/(?:\b(?:ratio|rate)\s*(?:of|is|=)?\s*|\bat\s+|@\s*)(\d+(?:\.\d+)?)(?:\s*(?::|to)\s*1)?/g, (_, n) => { res.ratioG = Number(n); return " "; });
  ALIASES.forEach(([re, rep]) => { t = t.replace(re, rep); });
  const toks = t.split(/[\s,]+|\band\b|\bplus\b|\bwith\b/).filter(Boolean);
  let pending = null, pendingItem = null;
  const add = (key, v) => {
    if (key === "gralats") res.gralats += v; else if (key === "rocks") res.rocks += v; else if (key === "tro") res.tro += v;
    else res.items[key] = (res.items[key] || 0) + v;
  };
  for (const tok of toks) {
    const n = numOf(tok);
    if (n !== null) { if (pendingItem) { add(pendingItem, n); pendingItem = null; } else pending = n; continue; }
    if (tok[0] === "@") { const key = tok.slice(1); if (pending !== null) { add(key, pending); pending = null; } else pendingItem = key; continue; }
    if (/^[a-z]{3,}$/.test(tok) && !/^(x|of|the|have|has|got|i|my|how|much|many|what|is|are|can|make|for|in|to|worth|total|stacks?|each|also|about|plus|and|with|me|you|please|pls|do|does|get|it|that|this|im|i'm|need|want|sell|selling|trade|trading|from|these|those|screenshots?|pictures?|pics?|picture)$/.test(tok)) res.unknown.push(tok);
  }
  return res;
}
const ratioG = () => { const n = num(S.conv.g.ratio); return n > 0 ? n : 2; };
const ratioR = () => { const n = num(S.conv.r.ratio); return n > 0 ? n : 1.3; };

function chatMsg(cls, html){
  const mine = /\bme\b/.test(cls);
  const row = document.createElement("div"); row.className = "row " + (mine ? "me" : "bot");
  if (!mine) { const av = document.createElement("img"); av.className = "av"; av.src = KEEPER; av.alt = ""; row.append(av); }
  const d = document.createElement("div"); d.className = "msg " + cls.replace(/\b(bot|me)\b/g, "").trim(); d.innerHTML = html;
  row.append(d); chatLog.append(row); chatLog.scrollTop = chatLog.scrollHeight;
  d.remove = () => row.remove();
  return d;
}
function greet(){
  if (chatGreeted) return; chatGreeted = true;
  const live = sample || remote;
  const m = chatMsg("bot", `<span class="who">Shopkeeper</span>${live ? `Howdy! Toss me your inventory or trade screenshots, up to ${MAX_PICS} at once, and keep sending more. I'll keep a running total of the gralats and Tro at the top until you press <b>Start over</b>. Paste (Ctrl+V), drop them here or tap <b>+</b>.` : "Screenshot reading isn't available here, but you can type your loot and I'll tally it."}<div class="tips"><button type="button">1,418 mushrooms and 40k gralats</button><button type="button">300 rocks at 1.5</button><button type="button">500 tro</button></div>`);
  m.querySelectorAll(".tips button").forEach(b => b.onclick = () => { chatText.value = b.textContent; chatText.focus(); });
}
function openChat(){ chat.hidden = false; $("#chatFab").setAttribute("aria-expanded", "true"); $("#chatFab").hidden = true; greet(); setTimeout(() => chatText.focus(), 0); }
function closeChat(){ chat.hidden = true; $("#chatFab").hidden = false; $("#chatFab").setAttribute("aria-expanded", "false"); $("#chatFab").focus(); }
$("#chatFab").onclick = openChat; $("#chatClose").onclick = closeChat;
chat.addEventListener("keydown", e => { if (e.key === "Escape") closeChat(); });
$("#chatFab").hidden = false;

function drawPics(){
  chatPicsEl.hidden = !chatPics.length;
  chatPicsEl.innerHTML = chatPics.map((p, i) => `<span class="pic"><img src="${p.url}" alt="Picture ${i + 1}"><button type="button" data-rm="${i}" aria-label="Remove picture ${i + 1}">✕</button></span>`).join("");
}
function addPics(files){
  const imgs = [...(files || [])].filter(f => f && f.type && f.type.startsWith("image/"));
  if (!imgs.length) return false;
  for (const f of imgs) {
    if (chatPics.length >= MAX_PICS) { toast(`Up to ${MAX_PICS} pictures per message`); break; }
    if (f.size > 20 * 1024 * 1024) { toast("Skipped a picture over 20 MB"); continue; }
    if (chatPics.some(p => p.file.size === f.size && p.file.lastModified === f.lastModified && p.file.name === f.name)) continue;
    chatPics.push({file:f, url:URL.createObjectURL(f)});
  }
  drawPics(); return true;
}
chatPicsEl.addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (!b) return; const [p] = chatPics.splice(Number(b.dataset.rm), 1); try { URL.revokeObjectURL(p.url); } catch (_) {} drawPics(); });
$("#chatAttach").onclick = () => $("#chatFile").click();
$("#chatFile").onchange = e => { addPics(e.target.files); e.target.value = ""; chatText.focus(); };
chat.addEventListener("paste", e => { if (addPics(e.clipboardData && e.clipboardData.files)) e.preventDefault(); });
document.addEventListener("paste", e => { if (chat.hidden || chat.contains(e.target)) return; if (addPics(e.clipboardData && e.clipboardData.files)) e.preventDefault(); });
["dragenter","dragover"].forEach(t => chat.addEventListener(t, e => { e.preventDefault(); chat.classList.add("drag-over"); }));
["dragleave","drop"].forEach(t => chat.addEventListener(t, e => { if (t === "dragleave" && chat.contains(e.relatedTarget)) return; chat.classList.remove("drag-over"); }));
chat.addEventListener("drop", e => { e.preventDefault(); if (!addPics(e.dataTransfer && e.dataTransfer.files)) toast("Drop image files (PNG, JPEG or WEBP)"); });
chatText.addEventListener("input", () => { chatText.style.height = "auto"; chatText.style.height = Math.min(chatText.scrollHeight, 120) + "px"; });
chatText.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#chatForm").requestSubmit(); } });

async function readAll(files, onDone){
  const out = new Array(files.length); let next = 0;
  const worker = async () => { while (next < files.length) { const i = next++; try { out[i] = {ok:true, got:await readPicture(files[i])}; } catch (e) { out[i] = {ok:false, msg:e.message || "Couldn't read that picture."}; } onDone(); } };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}
// Running total across every message until "Start over".
const tally = {qty:{}, gralats:0, rocks:0, pics:0, sigs:new Set(), rg:null, rr:null};
const sigOf = got => JSON.stringify(Object.entries(got).sort());
function tallyAdd(a, extra, pics){
  if (!a.qty && !extra.gralats && !extra.rocks) return;
  Object.entries(a.qty || {}).forEach(([id, v]) => { tally.qty[id] = (tally.qty[id] || 0) + v; });
  tally.gralats += extra.gralats; tally.rocks += extra.rocks; tally.pics += pics;
  if (extra.ratioG) tally.rg = extra.ratioG; if (extra.ratioR) tally.rr = extra.ratioR;
  drawTally(true);
}
function tallyNumbers(){
  const rg = tally.rg || ratioG(), rr = tally.rr || ratioR();
  const g = ITEMS.reduce((a, it) => a + (tally.qty[it.id] || 0) * it.price, 0) + tally.gralats;
  return {rg, rr, g, tro: g / rg + tally.rocks / rr};
}
function drawTally(bump){
  const el = $("#tally"), any = Object.keys(tally.qty).length || tally.gralats || tally.rocks;
  el.hidden = !any; if (!any) return;
  const t = tallyNumbers(), items = Object.keys(tally.qty).length;
  $("#tallyG").textContent = fmt(t.g); $("#tallyT").textContent = fmt(t.tro);
  $("#tallyN").textContent = [tally.pics ? `${tally.pics} picture${tally.pics > 1 ? "s" : ""}` : "", items ? `${items} item type${items > 1 ? "s" : ""}` : "", tally.rocks ? `${fmt(tally.rocks)} rocks` : ""].filter(Boolean).join(" · ");
  if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
}
function tallyReset(){ tally.qty = {}; tally.gralats = 0; tally.rocks = 0; tally.pics = 0; tally.sigs = new Set(); tally.rg = tally.rr = null; drawTally(); }
$("#tallyReset").onclick = () => { tallyReset(); chatMsg("bot", `<span class="who">Shopkeeper</span>Fresh page! Send your next screenshots.`); };
$("#tallyBag").onclick = () => { ITEMS.forEach(it => { const v = tally.qty[it.id] ? String(Math.min(999999, Math.round(tally.qty[it.id]))) : ""; S.qty[it.id] = v; $("#q-" + it.id).value = v; }); refreshBag(true); toast("Bag filled with the running total"); };
$("#tallyCopy").onclick = () => { const t = tallyNumbers(); copyText(`${ITEMS.filter(it => tally.qty[it.id]).map(it => `${fmt(tally.qty[it.id])} ${it.name}`).join(", ")}${tally.gralats ? ` + ${fmt(tally.gralats)} gralats` : ""}${tally.rocks ? ` + ${fmt(tally.rocks)} rocks` : ""} = ${fmt(t.g)} gralats = ${fmt(t.tro)} Tro`, "Copied the running total"); };
function answer(pics, extra){
  const rg = extra.ratioG || ratioG(), rr = extra.ratioR || ratioR();
  const qty = {};
  pics.forEach(p => { if (p.ok && !p.dup) Object.entries(p.got).forEach(([n, v]) => { const it = BY_NAME[n]; if (it) qty[it.id] = (qty[it.id] || 0) + v; }); });
  Object.entries(extra.items).forEach(([id, v]) => { qty[id] = (qty[id] || 0) + v; });
  const rows = ITEMS.filter(it => qty[it.id] > 0);
  const itemsG = rows.reduce((a, it) => a + qty[it.id] * it.price, 0);
  const totalG = itemsG + extra.gralats, troG = totalG / rg, troR = extra.rocks / rr;
  const G = "assets/ui/gralat.png";
  let h = `<span class="who">Shopkeeper</span>`;
  if (pics.length) h += `<div class="chips">${pics.map((p, i) => {
    const n = p.ok ? Object.keys(p.got).length : 0;
    if (p.dup) return `<span class="chip dup" title="Same counts as a picture already counted">Pic ${i + 1} · already counted</span>`;
    return p.ok ? `<span class="chip ok" title="${esc(Object.entries(p.got).map(([k, v]) => fmt(v) + " " + k).join(", "))}">Pic ${i + 1} · ${n ? n + " item" + (n > 1 ? "s" : "") : "nothing to sell"}</span>`
                : `<span class="chip bad" title="${esc(p.msg)}">Pic ${i + 1} · ${esc(p.msg.length > 38 ? "couldn't read" : p.msg)}</span>`;
  }).join("")}</div>`;
  const unknown = extra.unknown.length ? `<div class="sub" style="margin-top:6px">I didn't recognise: ${esc(extra.unknown.slice(0, 6).join(", "))}</div>` : "";
  if (extra.tro && !rows.length && !extra.gralats && !extra.rocks) {
    h += `<div class="slip"><div class="slip-h">TRO PRICE<span>${fmt(extra.tro)} Tro</span></div><div class="sums">
      <div class="sum"><img src="${G}" alt=""><b>${fmt(extra.tro * rg)}</b> gralats · ${fmt(rg)}:1</div>
      <div class="sum"><img src="${TRO_IMG}" alt=""><b>${fmt(extra.tro * rr)}</b> rocks · ${fmt(rr)}:1</div></div></div>`;
    return {html:h + unknown, qty:null, summary:`${fmt(extra.tro)} Tro = ${fmt(extra.tro * rg)} gralats (${fmt(rg)}:1) or ${fmt(extra.tro * rr)} rocks (${fmt(rr)}:1)`};
  }
  if (!rows.length && !extra.gralats && !extra.rocks) {
    h += pics.some(p => p.ok) ? `I looked, but didn't spot anything I buy.` : (pics.length ? `I couldn't read those. Try a clearer, closer screenshot.` : `Send a screenshot, or type something like "1,418 mushrooms and 40k gralats".`);
    return {html:h + unknown, qty:null, summary:""};
  }
  const line = (img, name, mult, val) => `<li>${img ? `<img src="${img}" alt="">` : "<span></span>"}<span class="n">${name}${mult ? ` <small>× ${mult}</small>` : ""}</span><span class="v">${val}</span></li>`;
  h += `<div class="slip"><div class="slip-h">TRADE SLIP<span>${new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</span></div><ul class="lines">`
    + rows.map(it => line(SPRITES[it.id], `${fmt(qty[it.id])} ${esc(it.name)}`, it.price, `${fmt(qty[it.id] * it.price)} g`)).join("")
    + (extra.gralats ? line(G, "Gralats on hand", "", `${fmt(extra.gralats)} g`) : "")
    + (extra.rocks ? line(SPRITES.ores, `${fmt(extra.rocks)} rocks`, "", `÷ ${fmt(rr)}`) : "")
    + `</ul><div class="sums">`;
  if (totalG) h += `<div class="sum"><img src="${G}" alt=""><b>${fmt(totalG)}</b> gralats</div><div class="sum t"><img src="${TRO_IMG}" alt=""><b>${fmt(troG)}</b> Tro · ${fmt(rg)}:1</div>`;
  if (extra.rocks) h += `<div class="sum t"><img src="${TRO_IMG}" alt=""><b>${fmt(troR)}</b> Tro from rocks · ${fmt(rr)}:1</div>`;
  h += `<div class="sum all"><span>YOU GET</span><b>${fmt(troG + troR)} Tro</b></div></div></div>`;
  const summary = [rows.map(it => `${fmt(qty[it.id])} ${it.name}`).join(", "), totalG ? `= ${fmt(totalG)} gralats = ${fmt(troG)} Tro (${fmt(rg)}:1)` : "", extra.rocks ? `${fmt(extra.rocks)} rocks = ${fmt(troR)} Tro (${fmt(rr)}:1)` : ""].filter(Boolean).join(" ");
  return {html:h + unknown, qty:rows.length ? qty : null, summary};
}
$("#chatForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (chatBusy) return;
  const text = chatText.value.trim(), pics = chatPics.slice();
  if (!text && !pics.length) return;
  if (/^(clear|reset|start over)$/i.test(text) && !pics.length) { chatLog.innerHTML = ""; tallyReset(); chatGreeted = false; greet(); chatText.value = ""; return; }
  if (pics.length) {
    if (!sample && !remote) { chatMsg("bot err", `<span class="who">Shopkeeper</span>Screenshot reading isn't available here. Type your loot instead.`); return; }
    const gate = readAllowed(pics.length); if (!gate.ok) { chatMsg("bot err", `<span class="who">Shopkeeper</span>${esc(gate.msg)}`); return; }
  }
  chatPics = []; drawPics(); chatText.value = ""; chatText.style.height = "";
  chatMsg("me", `${pics.length ? `<div class="thumbs">${pics.map((p, i) => `<img src="${p.url}" alt="Picture ${i + 1}">`).join("")}</div>` : ""}${esc(text)}`);
  const extra = parseText(text);
  let results = [];
  if (pics.length) {
    chatBusy = true; $("#chatSend").disabled = true;
    let done = 0; const wait = chatMsg("bot", `<span class="who">Shopkeeper</span>Reading ${pics.length} picture${pics.length > 1 ? "s" : ""}<span class="dots"><i></i><i></i><i></i></span>`);
    results = await readAll(pics.map(p => p.file), () => { done++; if (pics.length > 1) wait.innerHTML = `<span class="who">Shopkeeper</span>Read ${done} of ${pics.length}<span class="dots"><i></i><i></i><i></i></span>`; });
    wait.remove(); chatBusy = false; $("#chatSend").disabled = false;
  }
  results.forEach(r => { if (!r.ok || !Object.keys(r.got).length) return; const sg = sigOf(r.got); if (tally.sigs.has(sg)) r.dup = true; else tally.sigs.add(sg); });
  const a = answer(results, extra);
  tallyAdd(a, extra, results.filter(r => r.ok && !r.dup).length);
  const m = chatMsg("bot" + (results.length && results.every(r => !r.ok) ? " err" : ""), a.html);
  if (a.qty || a.summary) {
    const acts = document.createElement("div"); acts.className = "acts";
    if (a.qty) { const b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = "Put in bag";
      b.onclick = () => { ITEMS.forEach(it => { const v = a.qty[it.id] ? String(Math.min(999999, Math.round(a.qty[it.id]))) : ""; S.qty[it.id] = v; $("#q-" + it.id).value = v; }); refreshBag(true); toast("Bag filled from the chat"); }; acts.append(b); }
    if (a.summary) { const c = document.createElement("button"); c.type = "button"; c.className = "btn"; c.textContent = "Copy"; c.onclick = () => copyText(a.summary, "Copied the total"); acts.append(c); }
    m.append(acts); chatLog.scrollTop = chatLog.scrollHeight;
  }
});


/* ---------- movable windows ---------- */
const DRAG_IDS = ["winBag","convG","convR","abacus","winReceipt"];
const stand = document.querySelector(".stand");
const mqWide = matchMedia("(min-width: 761px)");
let zTop = 10, current = null, hPending = false;
const byId = id => document.getElementById(id);
// Magnetic snapping: edges pull into line with other windows, the page edges, or sit a tidy gap apart.
const SNAP = 18, GAP = 24;
const guideV = document.createElement("div"), guideH = document.createElement("div");
guideV.className = "snap-guide v"; guideH.className = "snap-guide h"; guideV.hidden = guideH.hidden = true;
function hideGuides(){ guideV.hidden = guideH.hidden = true; }
function snapTo(id, x, y, w, h, W, off){
  if (!guideV.isConnected) stand.append(guideV, guideH);
  let bx = null, by = null, gx = null, gy = null;
  const tryX = (cand, line) => { const d = Math.abs(cand - x); if (d <= SNAP && (!bx || d < bx.d)) { bx = {d, v:cand}; gx = line; } };
  const tryY = (cand, line) => { const d = Math.abs(cand - y); if (d <= SNAP && (!by || d < by.d)) { by = {d, v:cand}; gy = line; } };
  if (!off) {
    tryX(0, 0); tryX(W - w, W); tryY(0, 0);
    DRAG_IDS.forEach(o => {
      if (o === id) return;
      const e = byId(o); if (!e || !e.offsetWidth) return;
      const ox = e.offsetLeft, oy = e.offsetTop, ow = e.offsetWidth, oh = e.offsetHeight;
      const nearY = y < oy + oh + GAP + SNAP && y + h > oy - GAP - SNAP;
      const nearX = x < ox + ow + GAP + SNAP && x + w > ox - GAP - SNAP;
      if (nearY) { tryX(ox + ow + GAP, null); tryX(ox - w - GAP, null); }
      tryX(ox, ox); tryX(ox + ow - w, ox + ow);
      if (nearX) { tryY(oy + oh + GAP, null); tryY(oy - h - GAP, null); }
      tryY(oy, oy); tryY(oy + oh - h, oy + oh);
    });
  }
  const nx = bx ? bx.v : Math.round(x / 8) * 8, ny = by ? by.v : Math.round(y / 8) * 8;
  guideV.hidden = !(bx && gx !== null); guideH.hidden = !(by && gy !== null);
  if (!guideV.hidden) guideV.style.left = (gx - 1) + "px";
  if (!guideH.hidden) guideH.style.top = (gy - 1) + "px";
  return {x:nx, y:ny};
}
function standH(){
  let m = 0; DRAG_IDS.forEach(id => { const el = byId(id); m = Math.max(m, el.offsetTop + el.offsetHeight); });
  stand.style.height = (m + 48) + "px";
}
// A tidy desk arrangement sized to the current width; every window narrower than the page so it can move freely.
function deskLayout(){
  const W = stand.clientWidth, g = 24, L = {};
  const setW = (id, w) => { byId(id).style.width = Math.round(w) + "px"; };
  const ht = id => byId(id).offsetHeight;
  const stackAt = (ids, x, w, y0) => { let y = y0; ids.forEach(id => { setW(id, w); L[id] = {x:Math.round(x), y, w:Math.round(w)}; y += ht(id) + g; }); return y; };
  if (W >= 1288) {
    const cw = 380, rw = 340, bw = W - cw - rw - 2 * g;
    setW("winBag", bw); L.winBag = {x:0, y:0, w:Math.round(bw)};
    stackAt(["convG","convR","abacus"], bw + g, cw, 0);
    setW("winReceipt", rw); L.winReceipt = {x:W - rw, y:0, w:rw};
  } else if (W >= 940) {
    const cw = 380, bw = W - cw - g;
    setW("winBag", bw); L.winBag = {x:0, y:0, w:Math.round(bw)};
    stackAt(["convG","winReceipt","convR","abacus"], bw + g, cw, 0);
  } else {
    const bw = Math.min(W, 640), cw = (W - g) / 2;
    setW("winBag", bw); L.winBag = {x:0, y:0, w:bw};
    const y0 = ht("winBag") + g;
    stackAt(["convG","convR","abacus"], 0, cw, y0);
    stackAt(["winReceipt"], cw + g, cw, y0);
  }
  return L;
}
function place(L){
  const W = stand.clientWidth;
  DRAG_IDS.forEach(id => {
    const p = L[id], el = byId(id); if (!p) return;
    const w = Math.min(p.w, W), x = Math.max(0, Math.min(p.x, W - w));
    el.style.left = x + "px"; el.style.top = Math.max(0, p.y) + "px"; el.style.width = w + "px";
  });
}
function applyFree(){
  stand.classList.add("free");
  current = S.layout ? S.layout : deskLayout();
  place(current); standH();
  byId("resetLayout").hidden = !S.layout;
}
function exitFree(){
  stand.classList.remove("free"); stand.style.height = ""; current = null;
  DRAG_IDS.forEach(id => { const el = byId(id); el.style.left = el.style.top = el.style.width = el.style.zIndex = ""; });
}
DRAG_IDS.forEach(id => {
  const el = byId(id); el.classList.add("drag");
  const h = el.querySelector(".plank, .tape-head"); h.classList.add("drag-handle");
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, active = false, cx = 0, cy = 0;
  h.addEventListener("pointerdown", e => {
    if (!mqWide.matches || !current || e.button !== 0 || e.target.closest("button, input, a")) return;
    active = true; moved = false; sx = e.clientX; sy = e.clientY;
    try { h.setPointerCapture(e.pointerId); } catch (_) {}
    el.style.zIndex = ++zTop;
    e.preventDefault();
  });
  h.addEventListener("pointermove", e => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      moved = true;
      if (!S.layout) { S.layout = JSON.parse(JSON.stringify(current)); current = S.layout; }
      ox = current[id].x; oy = current[id].y; el.classList.add("dragging");
    }
    const W = stand.clientWidth, w = Math.min(current[id].w, W);
    const s = snapTo(id, ox + dx, oy + dy, w, el.offsetHeight, W, e.altKey);
    cx = Math.max(0, Math.min(s.x, W - w)); cy = Math.max(0, s.y);
    el.style.left = cx + "px"; el.style.top = cy + "px";
    if (!hPending) { hPending = true; requestAnimationFrame(() => { hPending = false; standH(); }); }
  });
  const end = () => {
    if (!active) return; active = false;
    if (moved) {
      current[id].x = cx; current[id].y = cy; el.classList.remove("dragging"); hideGuides();
      el.classList.remove("landed"); void el.offsetWidth; el.classList.add("landed");
      save(); standH(); byId("resetLayout").hidden = false;
    }
  };
  h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end); h.addEventListener("lostpointercapture", end);
  h.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
});
if ("ResizeObserver" in window) { const ro = new ResizeObserver(() => { if (current) standH(); }); DRAG_IDS.forEach(id => ro.observe(byId(id))); }
mqWide.addEventListener("change", () => { if (mqWide.matches) applyFree(); else exitFree(); });
let rsT; window.addEventListener("resize", () => { clearTimeout(rsT); rsT = setTimeout(() => { if (mqWide.matches) applyFree(); }, 120); });
byId("resetLayout").onclick = () => { S.layout = null; save(); applyFree(); toast("Windows back in place"); };


/* ---------- collapsible windows ---------- */
const COL_IDS = ["winBag","convG","convR","winReceipt"];
const COL_NAMES = {winBag:"Inventory Bag", convG:"Gralats to Tro", convR:"Rocks to Tro", winReceipt:"Trade Receipt"};
S.collapsed = S.collapsed || {};
/* compact bag: every item in one tight grid, no scrolling through groups */
function applyCompact(){
  const on = !!S.compact;
  $("#shelf").classList.toggle("compact", on);
  const b = $("#compactBtn"); b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "Full view" : "Compact view";
}
$("#compactBtn").onclick = () => { S.compact = !S.compact; save(); applyCompact(); if (typeof relayout === "function") relayout(); };
applyCompact();
const chevSvg = '<svg viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 3h8v1H1zM2 4h6v1H2zM3 5h4v1H3zM4 6h2v1H4z"/></svg>';
function relayout(){ if (current && !S.layout) applyFree(); else if (current) standH(); }
function syncCollapseAll(){
  const allClosed = COL_IDS.every(id => byId(id).classList.contains("collapsed"));
  byId("collapseAll").textContent = allClosed ? "Expand all" : "Collapse all";
}
function setCol(id, on){
  const el = byId(id); el.classList.toggle("collapsed", on);
  const b = el.querySelector(".colbtn");
  b.setAttribute("aria-expanded", String(!on));
  b.setAttribute("aria-label", (on ? "Expand " : "Collapse ") + COL_NAMES[id]);
  b.title = on ? "Expand" : "Collapse";
  S.collapsed[id] = on;
}
COL_IDS.forEach(id => {
  const el = byId(id), handle = el.querySelector(".plank, .tape-head");
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn colbtn"; b.innerHTML = chevSvg;
  b.addEventListener("click", e => { e.stopPropagation(); setCol(id, !el.classList.contains("collapsed")); save(); relayout(); syncCollapseAll(); });
  handle.appendChild(b);
  setCol(id, !!S.collapsed[id]);
});
byId("collapseAll").onclick = () => {
  const close = !COL_IDS.every(id => byId(id).classList.contains("collapsed"));
  COL_IDS.forEach(id => setCol(id, close));
  if (close) byId("abacus").open = false;
  save(); relayout(); syncCollapseAll();
};
byId("abacus").addEventListener("toggle", () => relayout());
syncCollapseAll();


/* ---------- installable app (website only) ---------- */
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#installBtn").hidden = false; });
$("#installBtn").onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (_) {}
  installEvt = null; $("#installBtn").hidden = true;
};
window.addEventListener("appinstalled", () => { $("#installBtn").hidden = true; toast("Trade Stand installed"); });
if ("serviceWorker" in navigator && !window.claude && (location.protocol === "https:" || location.hostname === "127.0.0.1" || location.hostname === "localhost")) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}

/* ---------- boot ---------- */
buildShelf();
refreshBag(false);
convs.g.setFromBag(bagTotal());
renderLog();
if (mqWide.matches) { applyFree(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mqWide.matches && !S.layout) applyFree(); }); }
