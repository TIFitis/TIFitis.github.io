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

function updateViewportHeight() {
  // Use the innerHeight at load time to avoid changes when the address bar
  // hides on mobile, which can cause jumpy scrolling.
  viewportHeight = window.innerHeight;
}

function initAmbientBackground(canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const palette = [
    [70, 145, 255],
    [70, 205, 190],
    [155, 120, 245],
    [255, 170, 125],
    [75, 185, 230],
    [235, 200, 115],
  ];
  const fields = [
    { x: 0.08, y: 0.18, radius: 0.43, xWave: 0.10, yWave: 0.07, speed: 0.055, phase: 0.2 },
    { x: 0.86, y: 0.14, radius: 0.37, xWave: 0.08, yWave: 0.09, speed: 0.046, phase: 1.8 },
    { x: 0.82, y: 0.82, radius: 0.41, xWave: 0.10, yWave: 0.06, speed: 0.041, phase: 3.4 },
    { x: 0.14, y: 0.84, radius: 0.35, xWave: 0.07, yWave: 0.09, speed: 0.050, phase: 4.7 },
    { x: 0.52, y: 0.48, radius: 0.32, xWave: 0.12, yWave: 0.10, speed: 0.035, phase: 2.6 },
    { x: 0.55, y: 1.02, radius: 0.29, xWave: 0.09, yWave: 0.05, speed: 0.043, phase: 5.5 },
  ];

  let width = 0;
  let height = 0;
  let animationFrame = null;
  let lastFrame = 0;
  let previousPointer = null;
  const motion = {
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    strength: 0,
    targetStrength: 0,
    scroll: 0,
    lastScrollY: window.scrollY,
  };

  const draw = (timestamp = 0) => {
    context.clearRect(0, 0, width, height);
    const time = timestamp / 1000;
    const compact = width < 700;
    const activeFields = compact ? fields.slice(0, 4) : fields;
    const scale = Math.max(width, height);

    motion.x += (motion.targetX - motion.x) * 0.075;
    motion.y += (motion.targetY - motion.y) * 0.075;
    motion.strength += (motion.targetStrength - motion.strength) * 0.12;
    motion.targetStrength *= 0.94;
    motion.scroll *= 0.9;

    activeFields.forEach((field, index) => {
      let x =
        (field.x + Math.sin(time * field.speed + field.phase) * field.xWave) *
        width;
      let y =
        (field.y + Math.cos(time * field.speed * 0.85 + field.phase) * field.yWave) *
        height;
      const radius = field.radius * scale * (compact ? 0.9 : 1);
      const [red, green, blue] = palette[index];

      x += Math.sin(field.phase + time * 0.12) * motion.scroll * width * 0.035;
      y += Math.cos(field.phase + time * 0.1) * motion.scroll * height * 0.065;

      const pointerX = motion.x * width;
      const pointerY = motion.y * height;
      const deltaX = x - pointerX;
      const deltaY = y - pointerY;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      const influenceRadius = scale * 0.58;
      if (distance < influenceRadius) {
        const influence =
          (1 - distance / influenceRadius) * motion.strength * scale * 0.065;
        x += (deltaX / distance) * influence;
        y += (deltaY / distance) * influence;
      }

      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

      gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.18)`);
      gradient.addColorStop(0.52, `rgba(${red}, ${green}, ${blue}, 0.08)`);
      gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    });

    if (motion.strength > 0.01) {
      const pointerX = motion.x * width;
      const pointerY = motion.y * height;
      const radius = Math.min(scale * 0.24, compact ? 190 : 280);
      const glow = context.createRadialGradient(
        pointerX,
        pointerY,
        0,
        pointerX,
        pointerY,
        radius,
      );
      const alpha = Math.min(0.09, motion.strength * 0.12);
      glow.addColorStop(0, `rgba(95, 175, 255, ${alpha})`);
      glow.addColorStop(0.6, `rgba(125, 150, 245, ${alpha * 0.38})`);
      glow.addColorStop(1, "rgba(125, 150, 245, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    }
  };

  const frame = (timestamp) => {
    animationFrame = null;
    const frameInterval = width < 700 ? 1000 / 24 : 1000 / 30;
    if (timestamp - lastFrame >= frameInterval) {
      draw(timestamp);
      lastFrame = timestamp;
    }
    if (!document.hidden && !reducedMotion.matches) {
      animationFrame = window.requestAnimationFrame(frame);
    }
  };

  const start = () => {
    if (animationFrame !== null) return;
    if (reducedMotion.matches || document.hidden) {
      draw(0);
      return;
    }
    animationFrame = window.requestAnimationFrame(frame);
  };

  const stop = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(performance.now());
  };

  const handlePointerMove = (event) => {
    const x = event.clientX / Math.max(width, 1);
    const y = event.clientY / Math.max(height, 1);
    let speed = 0;
    if (previousPointer) {
      speed = Math.hypot(x - previousPointer.x, y - previousPointer.y);
    }
    previousPointer = { x, y };
    motion.targetX = x;
    motion.targetY = y;
    const baseStrength = event.pointerType === "touch" ? 0.42 : 0.16;
    motion.targetStrength = Math.max(
      motion.targetStrength,
      Math.min(0.62, baseStrength + speed * 5),
    );
  };

  const handlePointerDown = (event) => {
    motion.targetX = event.clientX / Math.max(width, 1);
    motion.targetY = event.clientY / Math.max(height, 1);
    motion.targetStrength = 0.72;
  };

  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - motion.lastScrollY;
    motion.lastScrollY = currentScrollY;
    motion.scroll = Math.max(
      -1,
      Math.min(1, motion.scroll + delta / Math.max(height * 0.32, 1)),
    );
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  const handleMotionPreference = () => {
    stop();
    start();
  };
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", handleMotionPreference);
  } else {
    reducedMotion.addListener(handleMotionPreference);
  }

  resize();
  start();
}

document.addEventListener("DOMContentLoaded", () => {
  const fluidCanvas = document.getElementById("fluid-canvas");
  if (fluidCanvas) initAmbientBackground(fluidCanvas);

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
      window.history.replaceState(null, "", `#${id}`);
      window.scrollTo({ top: clamped * viewportHeight, behavior: "smooth" });
    }
  };

  const initialPanelId = window.location.hash.slice(1);
  const initialPanelIndex = panels.findIndex((panel) => panel.id === initialPanelId);
  if (initialPanelIndex >= 0) {
    currentIndex = initialPanelIndex;
    updateDownArrow();
    window.scrollTo({ top: currentIndex * viewportHeight });
    updatePanels();
  }

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
