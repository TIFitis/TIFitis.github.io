/*
 * JavaScript for Akash Banerjee’s portfolio site.
 *
 * This script uses an IntersectionObserver to detect when elements with
 * the `fade-in` class enter the viewport and applies a `visible` class
 * that triggers CSS transitions defined in styles.css. It also exposes
 * a helper function for smooth scrolling to anchor targets.
 */

let panels = [];

function getViewportHeight() {
  return window.visualViewport
    ? window.visualViewport.height
    : document.documentElement.clientHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  panels = Array.from(document.querySelectorAll(".sections > .panel"));

  const setBodyHeight = () => {
    document.body.style.height = `${panels.length * getViewportHeight()}px`;
  };

  setBodyHeight();

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
  let pulseTimeout;

  const triggerBackgroundPulse = () => {
    document.body.classList.add("bg-pulse");
    clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(
      () => document.body.classList.remove("bg-pulse"),
      700,
    );
  };

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
    const viewport = getViewportHeight();
    const scrollPos = window.scrollY;
    const pos = scrollPos / viewport;

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
    });

    document.body.style.setProperty("--bg-scroll", `${scrollPos * -0.2}px`);
  };

  const onScroll = () => {
    updatePanels();
    clearTimeout(scrollTimeout);
    if (!autoScrolling) {
      scrollTimeout = setTimeout(() => {
        const viewport = getViewportHeight();
        const index = Math.round(window.scrollY / viewport);
        autoScrolling = true;
        window.scrollTo({
          top: index * viewport,
          behavior: "smooth",
        });
        triggerBackgroundPulse();
        setTimeout(() => {
          autoScrolling = false;
        }, 400);
      }, 80);
    }
  };

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", () => {
    setBodyHeight();
    updatePanels();
  });
  updatePanels();
});

/**
 * Smoothly scroll to a section by its id.
 * @param {string} id The id of the element to scroll into view.
 */
function scrollToSection(id) {
  const index = panels.findIndex((p) => p.id === id);
  if (index !== -1) {
    const viewport = getViewportHeight();
    window.scrollTo({ top: index * viewport, behavior: "smooth" });
    triggerBackgroundPulse();
  }
}
