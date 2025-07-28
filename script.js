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

document.addEventListener("DOMContentLoaded", () => {
  panels = Array.from(document.querySelectorAll(".sections > .panel"));

  updateViewportHeight();

  let downArrow;
  const updateArrowPosition = () => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (downArrow) {
      downArrow.style.left = `calc(50% - ${scrollbarWidth / 2}px)`;
    }
  };

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
    updateArrowPosition();
  };

  const updateDownArrow = () => {
    if (currentIndex >= panels.length - 1) {
      downArrow.style.display = "none";
    } else {
      const nextId = panels[currentIndex + 1].id;
      downArrow.href = `#${nextId}`;
      downArrow.style.display = "flex";
    }
    updateArrowPosition();
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
    const scrollPos = window.scrollY;
    const pos = scrollPos / viewportHeight;

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

  };


  const onScroll = () => {
    updatePanels();
    clearTimeout(scrollTimeout);
    if (!autoScrolling) {
      scrollTimeout = setTimeout(() => {
        const rawIndex = Math.round(window.scrollY / viewportHeight);
        if (Math.abs(rawIndex - currentIndex) > 1) {
          currentIndex += Math.sign(rawIndex - currentIndex);
        } else {
          currentIndex = rawIndex;
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
    updateArrowPosition();
  });
  updatePanels();
  window.scrollToSection = (id) => {
    const index = panels.findIndex((p) => p.id === id);
    if (index !== -1) {
      currentIndex = index;
      updateDownArrow();
      window.scrollTo({ top: index * viewportHeight, behavior: "smooth" });
    }
  };
});
