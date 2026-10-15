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

// Page fade-ins: each page plays its own animation the first time it scrolls into view.
const stages = document.querySelectorAll(".stage");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in-view"); io.unobserve(en.target); }
    });
  }, { threshold: 0.5 });
  stages.forEach((st) => io.observe(st));
} else {
  stages.forEach((st) => st.classList.add("in-view"));
}
