// Leaves swaying in a light wind.
//
// The template picture is never edited. A transparent WebGL canvas sits on top of it and, only inside
// soft-edged areas around the leaf shadows, redraws the SAME picture with each point nudged a couple of
// pixels by a slow, smooth wind field (a gentle looping sway that never stops and travels across the branches).
// Nothing is scaled, nothing is recoloured, and outside the leaf areas the original picture shows untouched.
//
// The picture it redraws comes from wind-data.js (a small embedded copy, see tools/make-wind-data.py), so it
// also works when index.html is opened straight from disk. If WebGL is not available, nothing changes here
// and the simple CSS sway in style.css keeps running instead.
(() => {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Leaf areas per page: [centre x, centre y, radius x, radius y] as fractions of the page (same as the CSS masks).
  const AREAS = {
    page2: [[0.70, 0.06, 0.60, 0.21], [0.08, 0.22, 0.30, 0.34], [0.06, 0.60, 0.22, 0.15]],
    page4: [[0.85, 0.12, 0.40, 0.24], [0.10, 0.18, 0.35, 0.30], [0.08, 0.85, 0.22, 0.16]],
  };

  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;                       // (0,0) = top-left of the page
    void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    precision highp float;
    uniform sampler2D uTex;
    uniform float uT;                       // seconds
    uniform float uAspect;                  // page width / height
    uniform float uRamp;                    // 0 -> 1 over the first seconds, so the wind eases in
    uniform vec4 uE[3];                     // leaf areas
    varying vec2 vUv;
    float area(vec4 e) { return 1.0 - smoothstep(0.5, 1.0, length((vUv - e.xy) / e.zw)); }
    // One whole leaf cluster's sway: it moves round a small, gently flattened loop (never reverses direction
    // abruptly, so it never looks like it's thrown or caught) plus a smaller, quicker loop riding on top of
    // it. Every point in the cluster moves together, the way a real cluster of leaves sways as one on its
    // branch - only the leaf's own gentle flutter differs slightly within it. Looping (instead of swinging
    // back and forth) keeps it moving at a steady pace all the time the page is open, not just after it loads.
    vec2 sway(float i) {
      float th1 = uT * (0.85 + i * 0.07) + i * 2.4;    // main loop, about every 7s
      float th2 = uT * (2.0  + i * 0.12) + i * 1.1 + 1.0;  // faster loop riding on top, about every 3s
      return vec2(cos(th1), 0.7 * sin(th1)) * 0.0155 + vec2(cos(th2), 0.7 * sin(th2)) * 0.0035;
    }
    void main() {
      float a0 = area(uE[0]), a1 = area(uE[1]), a2 = area(uE[2]);
      float w = max(a0, max(a1, a2));
      float wsum = a0 + a1 + a2;
      float gust = 0.85 + 0.15 * sin(uT * 0.21 + 0.8);   // the breeze swells and eases a little
      vec2 d = wsum > 0.0005 ? (a0 * sway(0.0) + a1 * sway(1.0) + a2 * sway(2.0)) / wsum : vec2(0.0);
      d *= gust * uRamp;
      d.y *= uAspect;                                    // equal pixel movement up/down and sideways
      vec2 uv = vUv + d;
      vec3 c = texture2D(uTex, vec2(uv.x, 1.0 - uv.y)).rgb;
      gl_FragColor = vec4(c * w, w);                     // premultiplied: only the leaf areas cover the original
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function start(stage) {
    const img = stage.querySelector("img.bg");
    const areas = AREAS[stage.id];
    if (!img || !areas) return;

    const canvas = document.createElement("canvas");
    canvas.className = "wind";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) return;

    let prog, uT, uAspect, uRamp, tex;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one big triangle
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uT = gl.getUniformLocation(prog, "uT");
    uAspect = gl.getUniformLocation(prog, "uAspect");
    uRamp = gl.getUniformLocation(prog, "uRamp");
    gl.uniform4fv(gl.getUniformLocation(prog, "uE"), new Float32Array(areas.flat()));
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
    gl.clearColor(0, 0, 0, 0);

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Upload the picture at the size it is shown on screen, so it lines up 1:1 with the picture underneath.
    let ready = false, source = img;
    function upload() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.round(stage.clientWidth * dpr));
      const h = Math.max(2, Math.round(stage.clientHeight * dpr));
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      const ctx = tmp.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, w, h);
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);   // throws if the browser blocks it
      gl.uniform1f(uAspect, w / h);
      ready = true;
    }

    let running = false, visible = true, raf = 0, t0 = 0;
    function frame(now) {
      if (!t0) t0 = now;                                   // the wind starts from calm...
      const k = Math.min(1, (now - t0) / 3000);            // ...and eases in over 3 seconds
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, now / 1000);
      gl.uniform1f(uRamp, k * k * (3 - 2 * k));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    function update() {
      const should = ready && visible && !document.hidden;
      if (should && !running) { running = true; t0 = 0; raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }

    const go = (src) => {
      source = src;
      try { upload(); } catch (e) { return; }        // cannot read the picture -> keep the CSS sway
      img.after(canvas);
      stage.classList.add("wind-on");                 // hides the CSS sway
      update();
      let timer, lastW = stage.clientWidth, lastH = stage.clientHeight;
      new ResizeObserver(() => {
        if (stage.clientWidth === lastW && stage.clientHeight === lastH) return;   // nothing really changed
        lastW = stage.clientWidth; lastH = stage.clientHeight;
        clearTimeout(timer);
        timer = setTimeout(() => { try { upload(); } catch (e) {} }, 150);
      }).observe(stage);
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; update(); }, { threshold: 0.01 }).observe(stage);
      document.addEventListener("visibilitychange", update);
    };
    const embedded = window.WIND_TEX && window.WIND_TEX[stage.id];
    const load = embedded
      ? new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = embedded; })
      : (img.decode ? img.decode() : Promise.resolve()).then(() => img);
    load.then(go, () => go(img));
  }

  const boot = () => document.querySelectorAll(".stage").forEach(start);
  if (document.readyState === "complete") boot(); else window.addEventListener("load", boot);
})();
