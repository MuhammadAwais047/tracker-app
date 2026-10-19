(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  /* ================= Constants ================= */
  const STORAGE_KEY = "fettle-habits-v1";
  const COLORS = ["#2f8f65", "#5b6ee1", "#d99a2b", "#db5a7a", "#3d9bc7", "#9a6ad6"];
  const EMOJIS = ["🌱", "🚶", "📖", "💧", "🧘", "✍️", "🌙", "🏋️", "🥗", "🎸", "🎨", "🧹", "💊", "☀️", "🐶", "💻", "🎯", "🛌", "🍎", "🚴", "🧠", "💬", "🎧", "🌿"];
  const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const WEEKDAYS = [1, 2, 3, 4, 5];
  const WEEKENDS = [0, 6];
  const SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const SVG_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>';
  const SVG_PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';

  /* ================= Dates ================= */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseKey = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const today = startOfDay(new Date());
  const todayKey = keyOf(today);
  const longDate = (d) => d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const shortDate = (d) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  /* ================= Seed data ================= */
  const mulberry32 = (seed) => {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function makeSeedHabits() {
    const rand = mulberry32(0xf3771e);
    const created = keyOf(addDays(today, -97));
    const defs = [
      { name: "Morning walk", emoji: "🚶", color: COLORS[0], days: ALL_DAYS, chance: 0.84 },
      { name: "Drink 2L water", emoji: "💧", color: COLORS[4], days: ALL_DAYS, chance: 0.9 },
      { name: "Read 20 pages", emoji: "📖", color: COLORS[1], days: ALL_DAYS, chance: 0.72 },
      { name: "Journal", emoji: "✍️", color: COLORS[3], days: WEEKDAYS, chance: 0.68 },
      { name: "No screens after 10pm", emoji: "🌙", color: COLORS[5], days: ALL_DAYS, chance: 0.58 },
    ];

    const habits = defs.map((def, i) => ({
      id: `seed-${i + 1}`,
      name: def.name,
      emoji: def.emoji,
      color: def.color,
      days: [...def.days],
      log: {},
      created,
    }));

    for (let offset = -97; offset <= 0; offset++) {
      const date = addDays(today, offset);
      const key = keyOf(date);
      habits.forEach((habit, i) => {
        if (!habit.days.includes(date.getDay())) return;
        if (rand() < defs[i].chance) habit.log[key] = true;
      });
    }

    // A believable current picture: three done today, two still open.
    const find = (n) => habits.find((h) => h.id === `seed-${n}`);
    for (let offset = -6; offset <= 0; offset++) find(1).log[keyOf(addDays(today, offset))] = true;
    for (let offset = -3; offset <= 0; offset++) find(2).log[keyOf(addDays(today, offset))] = true;
    for (let offset = -2; offset <= 0; offset++) find(5).log[keyOf(addDays(today, offset))] = true;
    delete find(3).log[todayKey];
    delete find(4).log[todayKey];
    return habits;
  }

  function normalizeHabits(raw) {
    if (!Array.isArray(raw)) return null;
    return raw
      .filter((h) => h && typeof h.id === "string" && typeof h.name === "string")
      .map((h) => {
        const days = Array.isArray(h.days)
          ? [...new Set(h.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
          : [...ALL_DAYS];
        return {
          id: h.id,
          name: String(h.name).slice(0, 40),
          emoji: typeof h.emoji === "string" && h.emoji ? h.emoji : "🌱",
          color: typeof h.color === "string" ? h.color : COLORS[0],
          days,
          log: h.log && typeof h.log === "object" ? h.log : {},
          created: typeof h.created === "string" ? h.created : todayKey,
        };
      })
      .filter((h) => h.days.length > 0);
  }

  function loadHabits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return makeSeedHabits();
      const parsed = normalizeHabits(JSON.parse(raw));
      return parsed === null ? makeSeedHabits() : parsed;
    } catch {
      return makeSeedHabits();
    }
  }

  let habits = loadHabits();
  const state = {
    view: "today",
    editingId: null,
    emoji: EMOJIS[0],
    color: COLORS[0],
    daySel: new Set(WEEKDAYS),
    deleteArmed: false,
    deleteTimer: null,
  };

  function saveHabits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {
      /* storage unavailable — the session still works */
    }
  }

  /* ================= Calculations ================= */
  const isDone = (habit, date) => !!habit.log[keyOf(date)];
  const scheduledOn = (habit, date) => habit.days.includes(date.getDay());
  const existsOn = (habit, date) => habit.created <= keyOf(date);
  const scheduleText = (days) => {
    const sorted = [...days].sort((a, b) => a - b);
    const key = sorted.join(",");
    if (key === "0,1,2,3,4,5,6") return "Every day";
    if (key === "1,2,3,4,5") return "Weekdays";
    if (key === "0,6") return "Weekends";
    return sorted
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
      .map((d) => DAY_NAMES[d].slice(0, 3))
      .join(", ");
  };

  function currentStreak(habit) {
    let streak = 0;
    if (scheduledOn(habit, today) && isDone(habit, today)) streak++;
    for (let i = 1; i <= 730; i++) {
      const date = addDays(today, -i);
      if (keyOf(date) < habit.created) break;
      if (!scheduledOn(habit, date)) continue;
      if (isDone(habit, date)) streak++;
      else break;
    }
    return streak;
  }

  function longestStreak(habit) {
    const windowStart = addDays(today, -364);
    const start = habit.created > keyOf(windowStart) ? parseKey(habit.created) : windowStart;
    let run = 0;
    let best = 0;
    for (let date = startOfDay(start); date <= today; date = addDays(date, 1)) {
      if (!scheduledOn(habit, date)) continue;
      if (isDone(habit, date)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    return best;
  }

  function habitStats(habit, days) {
    let scheduled = 0;
    let done = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      if (!existsOn(habit, date) || !scheduledOn(habit, date)) continue;
      scheduled++;
      if (isDone(habit, date)) done++;
    }
    return { scheduled, done, pct: scheduled ? Math.round((done / scheduled) * 100) : null };
  }

  function dayStats(date) {
    let scheduled = 0;
    let done = 0;
    for (const habit of habits) {
      if (!existsOn(habit, date) || !scheduledOn(habit, date)) continue;
      scheduled++;
      if (isDone(habit, date)) done++;
    }
    return { scheduled, done };
  }

  function overallStats(days) {
    let scheduled = 0;
    let done = 0;
    for (let i = 0; i < days; i++) {
      const stats = dayStats(addDays(today, -i));
      scheduled += stats.scheduled;
      done += stats.done;
    }
    return { scheduled, done, pct: scheduled ? Math.round((done / scheduled) * 100) : null };
  }

  function perfectDays(days) {
    let count = 0;
    for (let i = 0; i < days; i++) {
      const stats = dayStats(addDays(today, -i));
      if (stats.scheduled > 0 && stats.done === stats.scheduled) count++;
    }
    return count;
  }

  function todaysHabits() {
    return habits.filter((h) => existsOn(h, today) && scheduledOn(h, today));
  }

  const todayCounts = () => {
    const list = todaysHabits();
    const done = list.filter((h) => isDone(h, today)).length;
    return { list, done, total: list.length };
  };

  const allTodayDone = () => {
    const { list, done } = todayCounts();
    return list.length > 0 && done === list.length;
  };

  /* ================= Toast / confetti ================= */
  let toastTimer = null;
  const toast = (msg) => {
    const node = $("#toast");
    node.textContent = msg;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      node.hidden = true;
    }, 2400);
  };

  function confettiBurst() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = $("#confetti");
    const palette = habits.map((h) => h.color);
    const colors = (palette.length ? palette : []).concat(["#d99a2b", "#2f8f65", "#db5a7a"]);
    for (let i = 0; i < 28; i++) {
      const piece = el("span", "confetti-piece");
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--c", colors[i % colors.length]);
      piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
      piece.style.setProperty("--r0", `${Math.round(Math.random() * 360)}deg`);
      piece.style.setProperty("--rot", `${Math.round((Math.random() - 0.5) * 900)}deg`);
      piece.style.setProperty("--dur", `${(1.2 + Math.random() * 0.7).toFixed(2)}s`);
      piece.style.setProperty("--delay", `${(Math.random() * 0.18).toFixed(2)}s`);
      wrap.append(piece);
      setTimeout(() => piece.remove(), 2400);
    }
  }

  /* ================= Hero ================= */
  function renderHero() {
    $("#today-label").textContent = longDate(today);

    const { done, total } = todayCounts();
    $("#ring-done").textContent = String(done);
    $("#ring-total").textContent = `of ${total}`;

    const circumference = 2 * Math.PI * 52;
    $("#ring-fg").style.strokeDasharray = String(circumference);
    $("#ring-fg").style.strokeDashoffset = String(circumference * (1 - (total ? done / total : 0)));

    let title;
    let sub;
    if (total === 0) {
      title = habits.length ? "A rest day" : "Nothing scheduled";
      sub = habits.length ? "No habits scheduled today. Enjoy the pause." : "Add your first habit to begin.";
    } else if (done === total) {
      title = "All done today";
      sub = `${done} of ${total} habits kept — beautifully done.`;
    } else {
      title = `${total - done} to go`;
      sub = `${done} of ${total} habits done${done === 0 ? " — start with the easiest." : "."}`;
    }
    $("#today-title").textContent = title;
    $("#today-sub").textContent = sub;

    const best = habits.length ? Math.max(...habits.map(currentStreak)) : 0;
    $("#today-streak").textContent = best > 0 ? `🔥 ${best}-day streak alive` : "🌱 Day one starts today";
  }

  /* ================= Habit list ================= */
  function habitCard(habit, index) {
    const isToday = existsOn(habit, today) && scheduledOn(habit, today);
    const doneToday = !!habit.log[todayKey];
    const stats = habitStats(habit, 30);

    const card = el("article", `habit${isToday ? "" : " rest"}`);
    card.style.setProperty("--hc", habit.color);
    card.dataset.id = habit.id;
    card.style.animationDelay = `${Math.min(index * 35, 210)}ms`;

    const top = el("div", "habit-top");
    const icon = el("span", "habit-ico", habit.emoji);
    icon.setAttribute("aria-hidden", "true");

    const info = el("div", "habit-info");
    const nameRow = el("div", "habit-name-row");
    nameRow.append(el("h3", null, habit.name));
    const streak = currentStreak(habit);
    if (streak > 0) {
      const chip = el("span", "streak-chip", `🔥 ${streak}`);
      chip.title = `Current streak: ${streak} day${streak === 1 ? "" : "s"}`;
      nameRow.append(chip);
    }
    const base = scheduleText(habit.days);
    let metaText;
    if (!isToday) metaText = `${base} · rest today`;
    else if (stats.scheduled) metaText = `${base} · ${stats.pct}% this month`;
    else metaText = base;
    info.append(nameRow, el("p", "habit-meta", metaText));

    const edit = el("button", "edit-btn");
    edit.type = "button";
    edit.dataset.action = "edit";
    edit.setAttribute("aria-label", `Edit ${habit.name}`);
    edit.title = "Edit habit";
    edit.innerHTML = SVG_PENCIL;

    const check = el("button", `check-btn${doneToday ? " done" : ""}`);
    check.type = "button";
    check.dataset.action = "toggle-today";
    check.setAttribute("aria-pressed", doneToday ? "true" : "false");
    if (isToday) {
      check.setAttribute("aria-label", doneToday ? `Mark ${habit.name} as not done today` : `Mark ${habit.name} as done today`);
      check.title = doneToday ? "Undo today" : "Mark done today";
      check.innerHTML = SVG_CHECK;
    } else {
      check.disabled = true;
      check.setAttribute("aria-label", `${habit.name} is not scheduled today`);
      check.title = "Rest day — not scheduled today";
      check.innerHTML = SVG_MOON;
    }

    top.append(icon, info, edit, check);

    const week = el("div", "week-row");
    week.append(el("span", "week-label", "Last 7 days"));
    const dots = el("div", "week-dots");
    for (let i = 6; i >= 0; i--) {
      const date = addDays(today, -i);
      const key = keyOf(date);
      const done = !!habit.log[key];
      const scheduled = existsOn(habit, date) && scheduledOn(habit, date);
      const dot = el(
        "button",
        `week-dot${done ? " done" : ""}${scheduled ? " scheduled" : " off"}${i === 0 ? " today" : ""}`,
        DAY_LETTER[date.getDay()]
      );
      dot.type = "button";
      dot.dataset.action = "toggle-day";
      dot.dataset.date = key;
      dot.setAttribute("aria-pressed", done ? "true" : "false");
      dot.title = `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} — ${
        done ? "done" : scheduled ? "not logged" : "rest day"
      }${i === 0 ? " (today)" : ""}`;
      dot.setAttribute(
        "aria-label",
        `${habit.name}, ${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}: ${
          done ? "done" : "not done"
        }. Toggle.`
      );
      dots.append(dot);
    }
    week.append(dots);
    card.append(top, week);
    return card;
  }

  function renderHabits() {
    const list = $("#habit-list");
    list.textContent = "";
    const score = (h) => (existsOn(h, today) && scheduledOn(h, today) ? 0 : 1);
    const sorted = habits
      .map((h, i) => ({ h, i }))
      .sort((a, b) => score(a.h) - score(b.h) || a.i - b.i)
      .map((entry) => entry.h);

    sorted.forEach((habit, i) => list.append(habitCard(habit, i)));

    const empty = habits.length === 0;
    $("#today-empty").hidden = !empty;
    list.hidden = empty;
    $(".tip-line").hidden = empty;

    const { done, total } = todayCounts();
    $("#habit-count").textContent = !habits.length
      ? "0 habits"
      : total === 0
        ? "Rest day"
        : `${done} of ${total} done today`;
  }

  /* ================= Insights ================= */
  function renderStats() {
    const host = $("#insight-stats");
    host.textContent = "";
    const overall = overallStats(30);
    const perfect = perfectDays(30);
    const checks = habits.reduce((sum, h) => sum + Object.keys(h.log).length, 0);
    const streaks = habits.map((h) => ({ name: h.name, value: longestStreak(h) }));
    const best = streaks.reduce((a, b) => (b.value > a.value ? b : a), { name: "—", value: 0 });

    const cards = [
      {
        label: "30-day rate",
        value: overall.pct === null ? "—" : `${overall.pct}%`,
        foot: "Scheduled check-ins completed",
      },
      {
        label: "Perfect days",
        value: String(perfect),
        foot: "Days where everything got done",
      },
      {
        label: "Check-ins",
        value: checks.toLocaleString(),
        foot: "Every log, all habits",
      },
      {
        label: "Longest streak",
        value: best.value ? `${best.value} days` : "—",
        foot: best.value ? best.name : "No streak yet",
      },
    ];

    for (const item of cards) {
      const card = el("div", "stat");
      card.append(el("p", "stat-label", item.label), el("p", "stat-value", item.value), el("p", "stat-foot", item.foot));
      host.append(card);
    }
  }

  function renderHeatmap() {
    const grid = $("#heatmap");
    grid.textContent = "";
    const mondayIndex = (today.getDay() + 6) % 7;
    const start = addDays(today, -mondayIndex - 11 * 7);

    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const date = addDays(start, week * 7 + day);
        const cell = el("div", "heat-cell");
        if (date > today) {
          cell.classList.add("future");
        } else {
          const { scheduled, done } = dayStats(date);
          let detail;
          if (scheduled === 0) {
            cell.classList.add("none");
            detail = "No habits scheduled";
          } else {
            const ratio = done / scheduled;
            const level = ratio === 0 ? 0 : ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio < 1 ? 3 : 4;
            cell.classList.add(`lv${level}`);
            detail = `${done} of ${scheduled} done`;
          }
          const tip = `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} — ${detail}`;
          cell.dataset.tip = tip;
        }
        grid.append(cell);
      }
    }
  }

  function renderHeatSide() {
    const host = $("#heat-side");
    host.textContent = "";
    const avg = overallStats(84).pct;

    let active = 0;
    for (let i = 0; i < 30; i++) {
      if (dayStats(addDays(today, -i)).done > 0) active++;
    }

    const sums = Array.from({ length: 7 }, () => ({ scheduled: 0, done: 0 }));
    for (let i = 0; i < 84; i++) {
      const date = addDays(today, -i);
      const stats = dayStats(date);
      sums[date.getDay()].scheduled += stats.scheduled;
      sums[date.getDay()].done += stats.done;
    }
    let best = null;
    sums.forEach((sum, day) => {
      if (!sum.scheduled) return;
      const pct = Math.round((sum.done / sum.scheduled) * 100);
      if (!best || pct > best.pct) best = { day, pct };
    });

    const items = [
      { label: "12-week avg", value: avg === null ? "—" : `${avg}%`, foot: "Scheduled check-ins" },
      { label: "Active days", value: String(active), foot: "In the last 30" },
      {
        label: "Best weekday",
        value: best ? `${best.pct}%` : "—",
        foot: best ? `${DAY_NAMES[best.day]}s` : "No data yet",
      },
    ];

    for (const item of items) {
      const block = el("div", "heat-metric");
      block.append(el("p", "hm-label", item.label), el("p", "hm-value", item.value), el("p", "hm-foot", item.foot));
      host.append(block);
    }
  }

  function renderWeekChart() {
    const chart = $("#week-chart");
    chart.textContent = "";
    const mondayIndex = (today.getDay() + 6) % 7;
    const thisMonday = addDays(today, -mondayIndex);

    for (let w = 7; w >= 0; w--) {
      const monday = addDays(thisMonday, -w * 7);
      let scheduled = 0;
      let done = 0;
      for (let d = 0; d < 7; d++) {
        const date = addDays(monday, d);
        if (date > today) continue;
        const stats = dayStats(date);
        scheduled += stats.scheduled;
        done += stats.done;
      }
      const pct = scheduled ? Math.round((done / scheduled) * 100) : null;
      const label = `${monday.getDate()} ${monday.toLocaleDateString(undefined, { month: "short" })}`;

      const col = el("div", `bar-col${pct === null ? " bar-empty" : ""}`);
      col.title = `Week of ${label}: ${scheduled ? `${done} of ${scheduled} done (${pct}%)` : "nothing scheduled"}`;
      col.append(el("span", "bar-val", pct === null ? "—" : `${pct}%`));

      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill");
      fill.style.height = `${pct === null ? 0 : Math.max(2, pct)}%`;
      track.append(fill);
      col.append(track, el("span", "bar-label", label));
      chart.append(col);
    }
  }

  function renderBreakdown() {
    const host = $("#habit-breakdown");
    host.textContent = "";
    if (!habits.length) {
      host.append(el("p", "bd-empty", "No habits to compare yet."));
      return;
    }
    for (const habit of habits) {
      const { done, scheduled, pct } = habitStats(habit, 30);
      const row = el("div", "bd-row");

      const top = el("div", "bd-top");
      const name = el("div", "bd-name");
      name.append(el("span", null, habit.emoji), el("em", null, habit.name));
      top.append(name, el("span", "bd-count", scheduled ? `${done}/${scheduled} · ${pct}%` : "—"));

      const track = el("div", "bd-track");
      const fill = el("div", "bd-fill");
      fill.style.width = `${scheduled ? pct : 0}%`;
      fill.style.background = habit.color;
      track.append(fill);

      row.append(top, track);
      host.append(row);
    }
  }

  function renderInsights() {
    renderStats();
    renderHeatmap();
    renderHeatSide();
    renderWeekChart();
    renderBreakdown();
  }

  /* ================= Views ================= */
  function setView(view) {
    state.view = view;
    $$(".tab").forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", active ? "true" : "false");
    });
    $("#view-today").hidden = view !== "today";
    $("#view-insights").hidden = view !== "insights";
    if (view === "insights") renderInsights();
  }

  /* ================= Mutations ================= */
  function render() {
    renderHero();
    renderHabits();
    renderInsights();
  }

  function toggleDay(id, key) {
    const habit = habits.find((h) => h.id === id);
    if (!habit || key > todayKey || key < habit.created) return;
    const wasAll = allTodayDone();
    const logged = !habit.log[key];
    if (logged) habit.log[key] = true;
    else delete habit.log[key];
    saveHabits();
    render();

    if (key === todayKey) {
      if (logged) {
        toast(logged && allTodayDone() ? "All habits done — beautifully kept." : "Done for today — nice.");
        if (!wasAll && allTodayDone()) confettiBurst();
      } else {
        toast("Unchecked for today.");
      }
    } else {
      toast(`${logged ? "Logged" : "Cleared"} ${shortDate(parseKey(key))}`);
    }
  }

  /* ================= Modal ================= */
  const modal = $("#modal");
  const nameInput = $("#habit-name");
  const errorBox = $("#form-error");
  const deleteBtn = $("#delete-habit");

  function buildEmojiGrid() {
    const grid = $("#emoji-grid");
    for (const emoji of EMOJIS) {
      const button = el("button", "emoji-opt", emoji);
      button.type = "button";
      button.dataset.emoji = emoji;
      button.setAttribute("aria-label", `Use ${emoji}`);
      button.setAttribute("aria-pressed", "false");
      grid.append(button);
    }
  }

  function buildColorRow() {
    const row = $("#color-row");
    for (const color of COLORS) {
      const button = el("button", "color-dot");
      button.type = "button";
      button.dataset.color = color;
      button.style.setProperty("--c", color);
      button.setAttribute("aria-label", `Use colour ${color}`);
      button.setAttribute("aria-pressed", "false");
      row.append(button);
    }
  }

  function syncEmojiGrid() {
    $$(".emoji-opt").forEach((button) => {
      const on = button.dataset.emoji === state.emoji;
      button.classList.toggle("selected", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function syncColorRow() {
    $$(".color-dot").forEach((button) => {
      const on = button.dataset.color === state.color;
      button.classList.toggle("selected", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function syncDayPicker() {
    $$("#day-picker button").forEach((button) => {
      const on = state.daySel.has(Number(button.dataset.day));
      button.classList.toggle("on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function resetDeleteBtn() {
    state.deleteArmed = false;
    clearTimeout(state.deleteTimer);
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.remove("armed");
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function openModal(habit) {
    state.editingId = habit ? habit.id : null;
    $("#modal-title").textContent = habit ? "Edit habit" : "New habit";
    $("#save-habit").textContent = habit ? "Save changes" : "Save habit";
    nameInput.value = habit ? habit.name : "";
    nameInput.classList.remove("invalid");
    errorBox.hidden = true;

    state.emoji = habit ? habit.emoji : EMOJIS[0];
    state.color = habit ? habit.color : COLORS[0];
    state.daySel = new Set(habit ? habit.days : WEEKDAYS);

    let schedule = "daily";
    if (habit) {
      const key = [...habit.days].sort((a, b) => a - b).join(",");
      if (key === "0,1,2,3,4,5,6") schedule = "daily";
      else if (key === "1,2,3,4,5") schedule = "weekdays";
      else if (key === "0,6") schedule = "weekends";
      else schedule = "custom";
    }
    $("#habit-schedule").value = schedule;
    $("#day-picker").hidden = schedule !== "custom";
    $("#delete-habit").hidden = !habit;
    resetDeleteBtn();
    syncEmojiGrid();
    syncColorRow();
    syncDayPicker();

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => nameInput.focus(), 40);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    state.editingId = null;
    resetDeleteBtn();
  }

  function scheduleDays() {
    const value = $("#habit-schedule").value;
    if (value === "daily") return [...ALL_DAYS];
    if (value === "weekdays") return [...WEEKDAYS];
    if (value === "weekends") return [...WEEKENDS];
    return [...state.daySel].sort((a, b) => a - b);
  }

  /* ================= Events ================= */
  $("#add-habit").addEventListener("click", () => openModal());
  $("#empty-add").addEventListener("click", () => openModal());

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  $("#habit-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".habit");
    if (!card) return;
    const id = card.dataset.id;
    const action = button.dataset.action;
    if (action === "toggle-today") toggleDay(id, todayKey);
    else if (action === "toggle-day") toggleDay(id, button.dataset.date);
    else if (action === "edit") openModal(habits.find((h) => h.id === id));
  });

  $("#emoji-grid").addEventListener("click", (event) => {
    const button = event.target.closest(".emoji-opt");
    if (!button) return;
    state.emoji = button.dataset.emoji;
    syncEmojiGrid();
  });

  $("#color-row").addEventListener("click", (event) => {
    const button = event.target.closest(".color-dot");
    if (!button) return;
    state.color = button.dataset.color;
    syncColorRow();
  });

  $("#day-picker").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-day]");
    if (!button) return;
    const day = Number(button.dataset.day);
    if (state.daySel.has(day)) state.daySel.delete(day);
    else state.daySel.add(day);
    syncDayPicker();
  });

  $("#habit-schedule").addEventListener("change", (event) => {
    const custom = event.target.value === "custom";
    $("#day-picker").hidden = !custom;
    if (custom && state.daySel.size === 0) state.daySel = new Set([1, 3, 5]);
    syncDayPicker();
  });

  nameInput.addEventListener("input", () => {
    errorBox.hidden = true;
    nameInput.classList.remove("invalid");
  });

  $("#habit-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const days = scheduleDays();

    if (!name) {
      nameInput.classList.add("invalid");
      showError("Give your habit a name so it can keep you honest.");
      nameInput.focus();
      return;
    }
    if (!days.length) {
      showError("Pick at least one day of the week.");
      return;
    }

    if (state.editingId) {
      const habit = habits.find((h) => h.id === state.editingId);
      if (habit) {
        habit.name = name;
        habit.emoji = state.emoji;
        habit.color = state.color;
        habit.days = days;
        saveHabits();
        toast("Habit updated.");
      }
    } else {
      habits.push({
        id: `h-${Date.now().toString(36)}`,
        name,
        emoji: state.emoji,
        color: state.color,
        days,
        log: {},
        created: todayKey,
      });
      saveHabits();
      toast("Habit added — start small.");
      setView("today");
    }
    closeModal();
    render();
  });

  deleteBtn.addEventListener("click", () => {
    if (!state.editingId) return;
    if (!state.deleteArmed) {
      state.deleteArmed = true;
      deleteBtn.textContent = "Tap again to delete";
      deleteBtn.classList.add("armed");
      clearTimeout(state.deleteTimer);
      state.deleteTimer = setTimeout(resetDeleteBtn, 3200);
      return;
    }
    const habit = habits.find((h) => h.id === state.editingId);
    habits = habits.filter((h) => h.id !== state.editingId);
    saveHabits();
    closeModal();
    render();
    toast(habit ? `Deleted “${habit.name}”.` : "Habit deleted.");
  });

  $$("[data-close]").forEach((node) => node.addEventListener("click", closeModal));

  document.addEventListener("keydown", (event) => {
    if (!modal.hidden) {
      if (event.key === "Escape") closeModal();
      return;
    }
    if (event.target instanceof Element && event.target.matches("input, textarea, select")) return;
    if (event.key === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      openModal();
    }
  });

  /* ================= Heatmap tooltip ================= */
  const heatCard = $(".heat-card");
  const heatTip = $("#heat-tip");
  const heatGrid = $("#heatmap");

  heatGrid.addEventListener("pointerover", (event) => {
    const cell = event.target.closest(".heat-cell");
    if (!cell || cell.classList.contains("future") || !cell.dataset.tip) {
      heatTip.hidden = true;
      return;
    }
    heatTip.textContent = cell.dataset.tip;
    heatTip.hidden = false;
    const cardRect = heatCard.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const half = heatTip.offsetWidth / 2;
    const left = clamp(
      cellRect.left - cardRect.left + cellRect.width / 2,
      half + 10,
      cardRect.width - half - 10
    );
    const top = Math.max(cellRect.top - cardRect.top - 8, heatTip.offsetHeight + 8);
    heatTip.style.left = `${left}px`;
    heatTip.style.top = `${top}px`;
  });

  heatGrid.addEventListener("pointerleave", () => {
    heatTip.hidden = true;
  });

  /* ================= Init ================= */
  buildEmojiGrid();
  buildColorRow();
  syncEmojiGrid();
  syncColorRow();
  syncDayPicker();
  setView("today");
  render();
})();
