// app.js

const state = {
    hoverSid: null,
    filter: { m1: null, m2: null, m3: null, m4: null }
};

let DATA = null;
let scenarioById = new Map(); // id -> scenario
let allCells = [];            // { el, sid, scenario }
let I18N = null;

fetch("data.json")
    .then(r => {
        if (!r.ok) throw new Error(`Failed to load data.json: ${r.status}`);
        return r.json();
    })
    .then(data => {
        DATA = data;
        scenarioById = new Map(DATA.scenarios.map(s => [s.id, s]));
        buildMatchFilters(DATA.meta.matches);
        renderAllViews();
        wireClearButton();
        updateHighlight();
        initI18n();
        initLangSwitch();
    })
    .catch(err => {
        console.error(err);
        document.body.insertAdjacentHTML(
            "beforeend",
            `<pre style="color:#f88">Error: ${String(err)}</pre>`
        );
    });

function applyI18n(lang) {
    const dict = I18N[lang] || I18N.en;

    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        if (dict[key] != null) el.textContent = dict[key];
    });
}

function initLangSwitch() {
    const saved = localStorage.getItem("lang");
    const auto = (navigator.language || "en").toLowerCase().startsWith("ja")
        ? "ja"
        : (navigator.language || "en").toLowerCase().startsWith("zh")
            ? "zh"
            : "en";
    const lang = saved || auto;

    applyI18n(lang);
    markActiveLang(lang);

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const next = btn.dataset.lang;
            localStorage.setItem("lang", next);
            applyI18n(next);
            markActiveLang(next);
        });
    });
}

function markActiveLang(lang) {
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

function renderAllViews() {
    allCells = [];

    renderBars();
    renderGigoGrid();

    // After rendering, apply hover/filter once
    updateHighlight();

    drawCalloutsSimple();
}

function renderBars() {
    document.querySelectorAll(".team-view:not(.gigo)").forEach(view => {
        const team = view.dataset.team;
        const teamCfg = DATA.views?.bars?.[team];
        if (!teamCfg) return;

        view.querySelectorAll(".row").forEach(rowEl => {
            const self = rowEl.dataset.self; // "W" | "D" | "L"
            const bar = rowEl.querySelector(".bar");
            bar.innerHTML = "";

            const ids = teamCfg.rows?.[self] || [];
            ids.forEach(sid => {
                const s = scenarioById.get(sid);
                if (!s) return;
                const cell = createCellEl(s, team);
                bar.appendChild(cell);
            });
        });
    });
}

function renderGigoGrid() {
    const root = document.querySelector(".team-view.gigo");
    const cfg = DATA.views?.gigo;
    if (!root || !cfg) return;

    // 渲染轴标题（可选）
    // cfg.axes.rowTitle / colTitle / rows / cols 你可以做成 DOM 标题

    // 渲染 9 个 block
    const blocks = root.querySelectorAll(".gigo-block");
    blocks.forEach(blockEl => {
        const r = Number(blockEl.dataset.r);
        const c = Number(blockEl.dataset.c);

        const b = cfg.blocks.find(x => x.r === r && x.c === c);
        const grid = blockEl.querySelector(".grid-3x3");
        const title = blockEl.querySelector(".block-title");

        grid.innerHTML = "";
        title.textContent = b?.title || "";

        (b?.cells || []).forEach(sid => {
            const s = scenarioById.get(sid);
            if (!s) return;
            grid.appendChild(createCellEl(s, "GiGO"));
        });
    });
}


function createEmptyCell() {
    const el = document.createElement("div");
    el.className = "cell empty";
    return el;
}

function initI18n() {
    I18N = {
        en: {
            title: "BEMANI PRO LEAGUE S5 SDVX Playoff Qualification Scenarios (After Regular Stage - Game 10)",
            subtitle: "Outcome visualization for all remaining W/D/L combinations.",
            whatIf: "What if… (Match Results)",
            views: "Views",
            clear: "Clear",
            legendQualified: "Qualified",
            legendTiebreak: "Tiebreaker (VP tied)",
            legendTieNote: "Numbers = number of tied teams",
            legendEliminated: "Eliminated",
            tipHover: "Hover a cell to highlight the same scenario across views. Click a cell to set filters to match that scenario.",
            tipHover2: "Each cell represents one W/D/L combination across the remaining 4 matches.",
            "callout-apina": "APINA VRAMeS might still be eliminated even if they win their final game.",
            "callout-fiveway": "If everything aligns, FIVE teams could end up tied on VP — forcing a chaotic tiebreaker scenario.",
            noteGiGO: "9 blocks, each contains a W/D/L sceanrio combination regarding 2 matches of GiGO."

        },
        ja: {
            title: "BEMANI PRO LEAGUE S5 SDVX 勝敗別・セミファイナル進出シナリオ (レギュラーステージ 第10試合終了時点)",
            subtitle: "残り試合の勝敗（勝/分/敗）組み合わせを、各チームの進出/タイブレーク/敗退で可視化します。",
            whatIf: "試合結果",
            clear: "クリア",
            views: "チーム別ビュー",
            legendQualified: "セミファイナル進出",
            legendTiebreak: "タイブレーク（勝点が同点）",
            legendTieNote: "数字 = 同点チーム数",
            legendEliminated: "レギュラーステージ敗退",
            tipHover: "セルにカーソルで同一シナリオをハイライト。クリックでそのシナリオに合わせてフィルターを設定します。",
            tipHover2: "各セルは、残り4試合の勝・分・負の組み合わせ1通りを示しています。",
            "callout-apina": "APINA VRAMeSは最終戦に勝っても、敗退する可能性があります。",
            "callout-fiveway": "条件がすべて噛み合うと、5チームが勝点で同率となり、混沌としたタイブレークに突入する可能性も…！？",
            noteGiGO: "全9ブロックで、各ブロックはGiGOの2試合における勝敗（W/D/L）のシナリオ1通りを表しています。"
        },
        zh: {
            title: "BEMANI PRO LEAGUE S5 SDVX 常规赛第10轮后 晋级形势可视化",
            subtitle: "用红/黄/绿展示剩余比赛（胜/平/负）所有组合下的晋级形势。",
            whatIf: "假设赛果是……",
            clear: "清空",
            views: "各队情况图",
            legendQualified: "晋级季后赛",
            legendTiebreak: "比较 pt / 胜负关系",
            legendTieNote: "数字 = 同分队伍数量",
            legendEliminated: "常规赛淘汰",
            tipHover: "鼠标悬停高亮同一情景。点击格子可将赛果自动切换到该情景。",
            tipHover2: "每个单元格代表剩余4场比赛中一种胜/平/负的组合。",
            "callout-apina": "就算 APINA VRAMeS 获胜，在最糟糕的几种情况下仍然可能出局。",
            "callout-fiveway": "有一种最离谱的剧本——5只队伍的胜分甚至会完全相同，并列第三，直接进入完全无法预测的破平环节…！？",
            noteGiGO: "9个区域中，每一个区域表示一种 GiGO 自己参与的两场比赛的胜/平/负情景组合。"
        }
    };

}

function createCellEl(scenario, team) {
    const t = scenario.byTeam?.[team];
    const bucket = t?.bucket || "yellow";

    const el = document.createElement("div");
    el.className = `cell ${bucket}`;
    el.dataset.sid = scenario.id;

    // Store match results for filter matching (m1..m4)
    for (const [mid, res] of Object.entries(scenario.results || {})) {
        el.dataset[mid] = res; // data-m1="W"
    }

    // Yellow tie number
    if (bucket === "yellow" && typeof t?.tie === "number") {
        const tie = document.createElement("span");
        tie.className = "tie";
        tie.textContent = String(t.tie);
        el.appendChild(tie);
    }

    // Hover highlight (same sid)
    el.addEventListener("mouseenter", () => {
        state.hoverSid = scenario.id;
        updateHighlight();
    });
    el.addEventListener("mouseleave", () => {
        state.hoverSid = null;
        updateHighlight();
    });

    // Click: apply this scenario to filter controls
    el.addEventListener("click", () => {
        applyScenarioToFilter(scenario);
        updateHighlight();
    });

    // Hover tooltips
    el.addEventListener("mouseenter", (e) => showTooltip(e, scenario));
    el.addEventListener("mousemove", (e) => moveTooltip(e));
    el.addEventListener("mouseleave", () => hideTooltip());

    allCells.push({ el, sid: scenario.id, scenario });

    // Hardcoded callouts
    if (team === "APINA" && scenario.id === "S55") {
        el.dataset.callout = "apinaWinStillOut";
    }
    if (team === "SILKHAT" && scenario.id === "S54") {
        el.dataset.callout = "fivewayTie";
    }


    return el;
}

/* ---------------------------
   Filters UI (any/W/D/L)
--------------------------- */

function buildMatchFilters(matches) {
    const container = document.querySelector(".match-filters");
    if (!container) return;
    container.innerHTML = "";

    matches.forEach(m => {
        const wrap = document.createElement("div");
        wrap.className = "match";
        wrap.dataset.match = m.id;

        const label = document.createElement("div");
        label.className = "match-label";
        label.textContent = m.label;

        const buttons = document.createElement("div");
        buttons.className = "match-buttons";

        // any / W / D / L
        const options = [
            { key: null, text: "?" },
            { key: "W", text: "W" },
            { key: "D", text: "D" },
            { key: "L", text: "L" }
        ];

        options.forEach(opt => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "opt";
            b.dataset.val = opt.key === null ? "" : opt.key;
            b.textContent = opt.text;

            b.addEventListener("click", () => {
                state.filter[m.id] = opt.key; // null/W/D/L
                syncFilterUI();
                updateHighlight();
            });

            buttons.appendChild(b);
        });

        wrap.appendChild(label);
        wrap.appendChild(buttons);
        container.appendChild(wrap);
    });

    syncFilterUI();
}

function syncFilterUI() {
    document.querySelectorAll(".match").forEach(matchEl => {
        const mid = matchEl.dataset.match;
        const val = state.filter[mid]; // null/W/D/L

        matchEl.querySelectorAll("button.opt").forEach(btn => {
            const bval = btn.dataset.val || null; // "" -> null
            const isActive = (val === null && bval === null) || (val !== null && bval === val);
            btn.classList.toggle("active", isActive);
        });
    });
}

function applyScenarioToFilter(scenario) {
    const r = scenario.results || {};
    state.filter = {
        m1: r.m1 ?? null,
        m2: r.m2 ?? null,
        m3: r.m3 ?? null,
        m4: r.m4 ?? null
    };
    syncFilterUI();
}

function wireClearButton() {
    const btn = document.getElementById("clearFilters");
    if (!btn) return;
    btn.addEventListener("click", () => {
        state.filter = { m1: null, m2: null, m3: null, m4: null };
        syncFilterUI();
        updateHighlight();
    });
}

/* ---------------------------
   Highlight logic
--------------------------- */

function scenarioMatchesFilter(s) {
    const r = s.results || {};
    // Only enforce filters that are not null
    for (const [mid, need] of Object.entries(state.filter)) {
        if (!need) continue;
        if (r[mid] !== need) return false;
    }
    return true;
}

function updateHighlight() {
    // Two overlay effects:
    // - "match": meets filter
    // - "hover": same sid as hoverSid
    allCells.forEach(({ el, scenario, sid }) => {
        const match = scenarioMatchesFilter(scenario);
        const hover = state.hoverSid && sid === state.hoverSid;

        el.classList.toggle("match", match);
        el.classList.toggle("hover", hover);

        // Optional: dim unmatched cells strongly
        el.classList.toggle("dim", !match);
    });
}

/**
 * Hover tips
 */
const tooltipEl = document.getElementById("tooltip");

function formatResultLabel(mid, val) {
    const m = (DATA?.meta?.matches || []).find(x => x.id === mid);
    const label = m ? m.label : mid;
    return `${label}: ${val}`;
}

function showTooltip(e, scenario) {
    if (!tooltipEl) return;

    const r = scenario.results || {};
    tooltipEl.innerHTML = [
        formatResultLabel("m1", r.m1),
        formatResultLabel("m2", r.m2),
        formatResultLabel("m3", r.m3),
        formatResultLabel("m4", r.m4),
    ].join("<br>");

    tooltipEl.hidden = false;
    moveTooltip(e);
}

function moveTooltip(e) {
    if (!tooltipEl) return;
    // 让 tooltip 不出屏幕（简单处理）
    const pad = 12;
    const x = Math.min(window.innerWidth - 220, e.clientX + pad);
    const y = Math.min(window.innerHeight - 120, e.clientY + pad);
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
}

function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.hidden = true;
}

/**
 * Callouts
 */
function placeCallout(calloutId, cellSelector, dx, dy) {
    const root = document.getElementById("viewsRoot");
    const bubble = document.getElementById(calloutId);
    const cell = document.querySelector(cellSelector);
    if (!root || !bubble || !cell) {
        if (bubble) bubble.style.display = "none";
        return;
    }

    const rr = root.getBoundingClientRect();
    const rc = cell.getBoundingClientRect();

    const x = (rc.left - rr.left) + dx;
    const y = (rc.top - rr.top) + dy;

    bubble.style.left = `${Math.round(x)}px`;
    bubble.style.top = `${Math.round(y)}px`;
    bubble.style.display = "block";
}

function drawCalloutsSimple() {
    placeCallout(
        "callout-apina",
        '.cell[data-callout="apinaWinStillOut"]',
        -251,  // dx
        -60   // dy
    );

    placeCallout(
        "callout-fiveway",
        '.cell[data-callout="fivewayTie"]',
        -131,  // dx
        -75   // dy
    );
}

window.addEventListener("resize", () => {
    clearTimeout(window.__calloutTimer);
    window.__calloutTimer = setTimeout(drawCalloutsSimple, 60);
});