/*
 * JavaScript for Akash Banerjee’s portfolio site.
 *
 * This script uses an IntersectionObserver to detect when elements with
 * the `fade-in` class enter the viewport and applies a `visible` class
 * that triggers CSS transitions defined in styles.css. It also exposes
 * a helper function for smooth scrolling to anchor targets.
 */

let panels = [];
let viewportHeight;
let currentIndex = 0;

// Icy background engine (WebGL, lightweight, calm, interactive)
class IceBackground {
  constructor(canvas) {
    this.canvas = canvas;
    const opts = { antialias: true, alpha: true };
    this.gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    this.timeStart = performance.now() / 1000;
    this.t = 0;
    this.ripples = [];
    this.maxRipples = 8;
    if (!this.gl) {
      console.warn("WebGL not available; ice background disabled");
      return;
    }
    const gl = this.gl;
    // Create program
    const vs = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main(){
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_rippleCount;
      uniform vec2 u_ripples[8];
      uniform float u_rippleTimes[8];
      uniform float u_rippleAmps[8];

      // Hash and value noise
      float rand(vec2 p){
        return fract(sin(dot(p, vec2(41.0, 289.0))) * 43758.5453);
      }
      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = rand(i);
        float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0));
        float d = rand(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0 - 2.0*f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
        for(int i=0;i<5;i++){
          v += a * noise(p);
          p = m * p * 1.7;
          a *= 0.5;
        }
        return v;
      }

      // Height function: slow icy motion + subtle ripples from interactions
      float heightAt(vec2 uv){
        // Keep aspect ratio consistent
        uv.x *= u_res.x / u_res.y;
        // Slow drift in time
        float t = u_time * 0.06;
        float base = fbm(uv * 2.4 + vec2(0.0, t)) * 1.0;
        // Frozen feel: add a higher-frequency, very low amplitude detail
        base += 0.10 * fbm(uv * 8.0 + vec2(t * 0.2, -t * 0.15));
        // Ripples from interactions
        float rippleSum = 0.0;
        for(int i=0;i<8;i++){
          vec2 rp = u_ripples[i];
          float dt = max(0.0, u_time - u_rippleTimes[i]);
          // Map rp from [0,1] to UV space
          vec2 ruv = rp; ruv.x *= u_res.x / u_res.y;
          float d = distance(uv, ruv);
          float w = sin(d * 50.0 - dt * 5.0);
          float env = exp(-d * 2.5) * exp(-dt * 1.0);
          // Only accumulate active ripples (no dynamic break to improve compatibility)
          float active = step(float(i) + 0.5, u_rippleCount);
          rippleSum += active * u_rippleAmps[i] * w * env;
        }
        return base + rippleSum;
      }

      void main(){
        vec2 uv = v_uv;
        // Compute height and approximate normals
        float h = heightAt(uv);
        float eps = 1.0 / u_res.y; // small offset
        float hx = heightAt(uv + vec2(eps, 0.0)) - h;
        float hy = heightAt(uv + vec2(0.0, eps)) - h;
        vec3 n = normalize(vec3(-hx * 2.0, -hy * 2.0, 1.0));

        // Lighting: cool directional light + subtle specular
        vec3 lightDir = normalize(vec3(-0.3, 0.6, 0.75));
        float diff = clamp(dot(n, lightDir), 0.0, 1.0);
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float spec = pow(max(dot(reflect(-lightDir, n), viewDir), 0.0), 48.0) * 0.3;

        // Icy palette
        vec3 deep = vec3(0.76, 0.88, 1.0);
        vec3 base = vec3(0.91, 0.96, 1.0);
        vec3 col = mix(base, deep, 0.35 + 0.25 * h);
        col += diff * 0.22;
        col += spec * 0.18;

        // Soft vignette for depth
        vec2 d = uv - 0.5;
        float vign = smoothstep(0.9, 0.0, dot(d, d));
        col *= 0.95 + 0.05 * vign;

        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const program = this._createProgram(vs, fs);
    if (!program) {
      // Fallback to 2D renderer if shader fails
      this.gl = null;
      this.fallback = new IceFallback2D(canvas);
      return;
    }
    this.program = program;
    gl.useProgram(program);

    // Quad buffer
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    this.u_time = gl.getUniformLocation(program, "u_time");
    this.u_res = gl.getUniformLocation(program, "u_res");
    this.u_rippleCount = gl.getUniformLocation(program, "u_rippleCount");
    this.u_ripples = gl.getUniformLocation(program, "u_ripples[0]");
    this.u_rippleTimes = gl.getUniformLocation(program, "u_rippleTimes[0]");
    this.u_rippleAmps = gl.getUniformLocation(program, "u_rippleAmps[0]");

    this._resize();
    window.addEventListener("resize", () => this._resize());
    this._loop();
  }

  _createShader(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  _createProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = this._createShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this._createShader(gl.FRAGMENT_SHADER, fsSrc);
    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prg));
      return null;
    }
    return prg;
  }

  _resize() {
    const gl = this.gl;
    if (!gl) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  addRipple(nx, ny, amp = 0.025) {
    if (!this.gl) return;
    const t = this.t;
    this.ripples.push({ x: nx, y: ny, time: t, amp });
    if (this.ripples.length > this.maxRipples) this.ripples.shift();
  }

  _uploadUniforms() {
    const gl = this.gl;
    gl.uniform1f(this.u_time, this.t);
    gl.uniform2f(this.u_res, this.canvas.width, this.canvas.height);
    const count = Math.min(this.ripples.length, this.maxRipples);
    gl.uniform1f(this.u_rippleCount, count);
    const rp = new Float32Array(this.maxRipples * 2);
    const rt = new Float32Array(this.maxRipples);
    const ra = new Float32Array(this.maxRipples);
    for (let i = 0; i < count; i++) {
      rp[i * 2 + 0] = this.ripples[i].x;
      rp[i * 2 + 1] = this.ripples[i].y;
      rt[i] = this.ripples[i].time;
      ra[i] = this.ripples[i].amp;
    }
    gl.uniform2fv(this.u_ripples, rp);
    gl.uniform1fv(this.u_rippleTimes, rt);
    gl.uniform1fv(this.u_rippleAmps, ra);
  }

  _loop() {
    const gl = this.gl;
    if (!gl) {
      if (this.fallback) this.fallback._loop();
      return;
    }
    this.t = performance.now() / 1000 - this.timeStart;
    gl.useProgram(this.program);
    // Clear not strictly needed for full-screen draw, but keeps buffer tidy
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this._uploadUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(() => this._loop());
  }
}

// 2D Canvas fallback for environments without working WebGL
class IceFallback2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t0 = performance.now() / 1000;
    this.t = 0;
    this.ripples = [];
    this.maxRipples = 12;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }
  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.dpr = dpr;
  }
  addRipple(nx, ny, amp = 0.025) {
    const t = this.t;
    this.ripples.push({ x: nx, y: ny, time: t, amp });
    if (this.ripples.length > this.maxRipples) this.ripples.shift();
  }
  _drawBase(ctx, w, h, t) {
    // Slow-moving radial gradient to mimic icy drift
    const cx = w * (0.5 + 0.03 * Math.sin(t * 0.2));
    const cy = h * (0.45 + 0.03 * Math.cos(t * 0.25));
    const r = Math.max(w, h) * 0.9;
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(235,245,255,1)');
    g.addColorStop(0.4, 'rgba(215,235,255,0.9)');
    g.addColorStop(0.75, 'rgba(190,220,245,0.85)');
    g.addColorStop(1, 'rgba(170,205,235,0.8)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  _drawRipples(ctx, w, h, t) {
    for (const r of this.ripples) {
      const dt = Math.max(0, t - r.time);
      const cx = r.x * w;
      const cy = r.y * h;
      const radius = (60 + 120 * r.amp) * dt; // expanding ring
      const fade = Math.exp(-dt * 1.2);
      const alpha = 0.12 * r.amp * fade;
      const grad = ctx.createRadialGradient(cx, cy, Math.max(1, radius * 0.6), cx, cy, Math.max(1, radius));
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  _loop() {
    this.t = performance.now() / 1000 - this.t0;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    this._drawBase(ctx, w, h, this.t);
    this._drawRipples(ctx, w, h, this.t);
    requestAnimationFrame(() => this._loop());
  }
}

function updateViewportHeight() {
  // Use the innerHeight at load time to avoid changes when the address bar
  // hides on mobile, which can cause jumpy scrolling.
  viewportHeight = window.innerHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  const fluidCanvas = document.getElementById("fluid-canvas");
  let ice;
  if (fluidCanvas) {
    ice = new IceBackground(fluidCanvas);
    // Optional debug: bring canvas above content to verify layering
    const debugIce = /ice[-_]?debug/i.test(location.hash + location.search);
    if (debugIce) {
      fluidCanvas.style.zIndex = '2000';
      fluidCanvas.style.opacity = '0.9';
      fluidCanvas.style.pointerEvents = 'none';
    }
    // Seed a subtle initial ripple so motion is immediately visible
    setTimeout(() => {
      ice.addRipple(0.5, 0.55, 0.02);
      ice.addRipple(0.35, 0.45, 0.015);
      ice.addRipple(0.65, 0.48, 0.015);
    }, 300);
    // Map events to soft ripples
    const pointerRipple = (() => {
      let last = 0;
      return (e, amp = 0.015) => {
        const now = Date.now();
        if (now - last < 80) return;
        last = now;
        const touch = e.touches && e.touches[0];
        const cx = touch ? touch.clientX : e.clientX;
        const cy = touch ? touch.clientY : e.clientY;
        const nx = cx / window.innerWidth;
        const ny = cy / window.innerHeight;
        ice.addRipple(nx, ny, amp);
      };
    })();
    ["pointermove", "mousemove"].forEach((evt) =>
      window.addEventListener(evt, (e) => pointerRipple(e, 0.02), { passive: true }),
    );
    ["pointerdown", "mousedown", "touchstart"].forEach((evt) =>
      window.addEventListener(evt, (e) => pointerRipple(e, 0.035), { passive: true }),
    );
    window.addEventListener(
      "touchmove",
      (e) => pointerRipple(e, 0.02),
      { passive: true },
    );
    // Scroll-driven occasional ripples
    let lastScroll = 0;
    window.addEventListener(
      "scroll",
      () => {
        const now = Date.now();
        if (now - lastScroll < 220) return;
        lastScroll = now;
        const progress = Math.min(
          1,
          Math.max(0, window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)),
        );
        const nx = 0.1 + 0.8 * progress;
        const ny = 0.46 + 0.1 * Math.sin(progress * 6.28318);
        ice.addRipple(nx, ny, 0.02);
      },
      { passive: true },
    );
  }

  panels = Array.from(document.querySelectorAll(".sections > .panel"));

  updateViewportHeight();

  let downArrow;
  const createDownArrow = () => {
    const arrowSvg =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>';

    downArrow = document.createElement("a");
    downArrow.className = "down-arrow";
    downArrow.setAttribute("aria-label", "Next section");
    downArrow.innerHTML = arrowSvg;
    downArrow.addEventListener("click", (e) => {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, panels.length - 1);
      const nextId = panels[nextIndex].id;
      window.scrollToSection(nextId);
    });
    document.body.appendChild(downArrow);
  };

  const updateDownArrow = () => {
    if (currentIndex >= panels.length - 1) {
      downArrow.style.display = "none";
    } else {
      const nextId = panels[currentIndex + 1].id;
      downArrow.href = `#${nextId}`;
      downArrow.style.display = "flex";
    }
  };

  let interactionTimeout;
  const hideArrow = () => {
    if (downArrow) {
      downArrow.classList.add("hidden");
    }
  };
  const showArrow = () => {
    if (downArrow && downArrow.style.display !== "none") {
      downArrow.classList.remove("hidden");
    }
  };
  const scheduleArrowShow = () => {
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(showArrow, 3000);
  };
  const handleInteraction = (e) => {
    if (downArrow && (e.target === downArrow || downArrow.contains(e.target))) {
      return;
    }
    hideArrow();
    scheduleArrowShow();
  };

  const setBodyHeight = () => {
    document.body.style.height = `${panels.length * viewportHeight}px`;
  };

  setBodyHeight();
  createDownArrow();
  updateDownArrow();

  ["scroll", "keydown", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, handleInteraction, { passive: true })
  );

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

  const CROSSFADE_DISTANCE = 0.25; // amount of scroll to transition between sections
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const FOCUS_PADDING = isTouch ? 0.08 : 0.2; // rubberband zone
  let autoScrolling = false;
  let scrollTimeout;
  let formFocusActive = false;
  let focusedPanel = null;

  panels.forEach((panel) => {
    panel.addEventListener(
      "wheel",
      (e) => {
        const atTop = panel.scrollTop === 0;
        const atBottom =
          panel.scrollHeight - panel.scrollTop <= panel.clientHeight + 1;
        if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
          e.preventDefault();
          window.scrollBy({ top: e.deltaY });
        }
      },
      { passive: false },
    );

    let startY = 0;
    panel.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    });
    panel.addEventListener(
      "touchmove",
      (e) => {
        const deltaY = startY - e.touches[0].clientY;
        const atTop = panel.scrollTop === 0;
        const atBottom =
          panel.scrollHeight - panel.scrollTop <= panel.clientHeight + 1;
        if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
          window.scrollBy({ top: deltaY });
          e.preventDefault();
        }
      },
      { passive: false },
    );
  });

  const updatePanels = () => {
    const maxScroll = (panels.length - 1) * viewportHeight;
    const scrollPos = Math.min(Math.max(window.scrollY, 0), maxScroll);
    const pos = scrollPos / viewportHeight;

    // When a form input is focused on mobile, disable transform on its panel
    if (formFocusActive && focusedPanel) {
      panels.forEach((panel) => {
        if (panel === focusedPanel) {
          panel.style.opacity = 1;
          panel.style.transform = "none";
          panel.style.pointerEvents = "auto";
          panel.style.zIndex = 100;
        } else {
          panel.style.opacity = 0; // fully hide other panels while focusing inputs
          panel.style.transform = "scale(0.98)";
          panel.style.pointerEvents = "none";
          panel.style.zIndex = 1;
        }
      });
      return;
    }

    panels.forEach((panel, i) => {
      const diff = i - pos;
      const absDiff = Math.abs(diff);
      const offset = Math.max(absDiff - FOCUS_PADDING, 0);
      const clamped = Math.min(offset / CROSSFADE_DISTANCE, 1);
      const opacity = 1 - clamped;
      const scale = 1 - clamped * 0.05;
      panel.style.opacity = opacity;
      panel.style.transform = `scale(${scale})`;
      panel.style.pointerEvents = opacity > 0.1 ? "auto" : "none";
      panel.style.zIndex = Math.round(opacity * 100);
    });

  };


  const onScroll = () => {
    updatePanels();
    // Do not snap panels while typing in a form field
    if (formFocusActive) return;
    clearTimeout(scrollTimeout);
    if (!autoScrolling) {
      scrollTimeout = setTimeout(() => {
        const rawIndex = Math.round(window.scrollY / viewportHeight);
        const maxIndex = panels.length - 1;
        const targetIndex = Math.max(0, Math.min(rawIndex, maxIndex));
        if (Math.abs(targetIndex - currentIndex) > 1) {
          currentIndex += Math.sign(targetIndex - currentIndex);
        } else {
          currentIndex = targetIndex;
        }
        updateDownArrow();
        autoScrolling = true;
        window.scrollTo({
          top: currentIndex * viewportHeight,
          behavior: "smooth",
        });
        setTimeout(() => {
          autoScrolling = false;
        }, 400);
      }, 80);
    }
  };

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", () => {
    updateViewportHeight();
    setBodyHeight();
    updatePanels();
  });
  updatePanels();
  window.scrollToSection = (id) => {
    const index = panels.findIndex((p) => p.id === id);
    if (index !== -1) {
      const clamped = Math.max(0, Math.min(index, panels.length - 1));
      currentIndex = clamped;
      updateDownArrow();
      window.scrollTo({ top: clamped * viewportHeight, behavior: "smooth" });
    }
  };

  // Reduce mobile input issues: track focus and disable transforms/snapping
  const isFormControl = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
  const updateFocusState = () => {
    const ae = document.activeElement;
    if (isFormControl(ae)) {
      formFocusActive = true;
      focusedPanel = ae.closest(".panel") || null;
    } else {
      formFocusActive = false;
      focusedPanel = null;
    }
    updatePanels();
  };
  document.addEventListener("focusin", updateFocusState, true);
  document.addEventListener("focusout", updateFocusState, true);

  // No special key handling required for the new background
});
