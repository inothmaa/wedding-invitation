// Google Form (RSVP) link.
const RSVP_URL = "https://forms.gle/uUjxgGeFLMhGLZ7v5";

// Countdown to the wedding day (04.12.2026, local time) - reaches 0 : 0 : 0 : 0 the moment it arrives.
const WEDDING_DATE = new Date(2026, 11, 4, 0, 0, 0);
const cdDays = document.getElementById("cd-days");
if (cdDays) {
  const cdHours = document.getElementById("cd-hours");
  const cdMins = document.getElementById("cd-mins");
  const cdSecs = document.getElementById("cd-secs");
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const diff = Math.max(0, WEDDING_DATE - new Date());
    cdDays.textContent = Math.floor(diff / 86400000);
    cdHours.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    cdMins.textContent = pad(Math.floor((diff % 3600000) / 60000));
    cdSecs.textContent = pad(Math.floor((diff % 60000) / 1000));
  };
  tick();
  setInterval(tick, 1000);
}

// A normal link (not a script-opened window) so it opens reliably, including in WhatsApp's in-app browser.
const rsvpLink = document.getElementById("rsvp");
if (RSVP_URL) {
  rsvpLink.href = RSVP_URL;
  rsvpLink.target = "_blank";
  rsvpLink.rel = "noopener";
}

// Start the fade-in only once the invitation fonts have loaded (or after 3s at most,
// so a slow connection never leaves the page blank).
const fontsReady = () => document.documentElement.classList.add("fonts-ready");
if (document.fonts && document.fonts.load) {
  Promise.race([
    Promise.all([
      '400 1em "Cormorant Garamond"',
      '500 1em "Cormorant Garamond"',
      '600 1em "Cormorant Garamond"',
      'italic 500 1em "Cormorant Garamond"',
      '400 1em "Mrs Saint Delafield"',
      '400 1em "Ms Madi"',
      '500 1em "Playfair Display"',
      '400 1em "Marck Script"',
      '400 1em "EB Garamond"',
      '400 1em "Parisienne"',
      '400 1em "Great Vibes"',
      '400 1em "Hurricane"',
      '500 1em "EB Garamond"',
    ].map((f) => document.fonts.load(f))),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]).then(fontsReady, fontsReady);
} else {
  fontsReady();
}

// Background music: starts by itself when the invitation opens. Browsers (and WhatsApp's in-app browser)
// only allow sound after the visitor's first touch/click, so if the automatic start is blocked it begins
// on that first touch instead. There is nothing to see or press on the page.
const bgm = document.getElementById("bgm");
if (bgm) {
  bgm.volume = 0.7;
  const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
  const start = () => {
    bgm.play().then(() => events.forEach((e) => window.removeEventListener(e, start, true))).catch(() => {});
  };
  events.forEach((e) => window.addEventListener(e, start, true));
  bgm.play().then(() => events.forEach((e) => window.removeEventListener(e, start, true))).catch(() => {});
  // Try again at every moment the browser might allow it: once the song can play, when the page has fully
  // loaded, and when the page is shown again (reload / coming back to the tab).
  ["canplay", "loadeddata"].forEach((e) => bgm.addEventListener(e, start));
  window.addEventListener("load", start);
  window.addEventListener("pageshow", start);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
}

// Page fade-ins: whichever page is currently on screen plays its animation, and every other page is reset,
// so each page plays again every time you come back to it - scrolling down or up.
const deck = document.querySelector(".deck");
const stages = Array.from(document.querySelectorAll(".stage"));
let current = null;
const updateCurrent = () => {
  const mid = deck.scrollTop + deck.clientHeight * 0.45;
  let now = stages[stages.length - 1];
  for (const st of stages) { if (st.offsetTop + st.offsetHeight > mid) { now = st; break; } }
  if (now === current) return;
  current = now;
  stages.forEach((st) => st.classList.toggle("in-view", st === now));
};
deck.addEventListener("scroll", updateCurrent, { passive: true });
window.addEventListener("resize", updateCurrent);
updateCurrent();

// Opening envelope: waits until the visitor taps the wax seal. That tap opens the envelope and, because it is a
// real touch, also lets the background music start.
(() => {
  const root = document.documentElement;
  const env = document.getElementById("envelope");
  if (!env) { root.classList.remove("sealed"); return; }
  const seal = env.querySelector(".seal");
  let started = false;
  const pick = new URLSearchParams(location.search).get("anim");
  env.dataset.anim = ["1", "2", "3", "4"].includes(pick) ? pick : "1";
  const open = () => {
    if (started) return;
    started = true;
    if (bgm) bgm.play().catch(() => {});
    env.classList.add("open");
    root.classList.add("opening");
    setTimeout(() => root.classList.remove("sealed"), 900);
    setTimeout(() => env.classList.add("gone"), 2700);
  };
  if (seal) {
    seal.addEventListener("click", open);
    seal.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  } else {
    open();
  }
})();
