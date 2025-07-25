/*
 * JavaScript for Akash Banerjee’s portfolio site.
 *
 * This script uses an IntersectionObserver to detect when elements with
 * the `fade-in` class enter the viewport and applies a `visible` class
 * that triggers CSS transitions defined in styles.css. It also exposes
 * a helper function for smooth scrolling to anchor targets.
 */

let panels = [];

document.addEventListener("DOMContentLoaded", () => {
  panels = Array.from(document.querySelectorAll(".sections > .panel"));
  document.body.style.height = `${panels.length * 100}vh`;

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
  const FOCUS_PADDING = 0.15; // dead zone before crossfading starts
  let autoScrolling = false;
  let scrollTimeout;

  const updatePanels = () => {
    const scrollPos = window.scrollY;
    const pos = scrollPos / window.innerHeight;

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

    document.body.style.setProperty("--bg-offset", `${scrollPos * -0.1}px`);
  };

  const onScroll = () => {
    updatePanels();
    clearTimeout(scrollTimeout);
    if (!autoScrolling) {
      scrollTimeout = setTimeout(() => {
        const index = Math.round(window.scrollY / window.innerHeight);
        autoScrolling = true;
        window.scrollTo({
          top: index * window.innerHeight,
          behavior: "smooth",
        });
        setTimeout(() => {
          autoScrolling = false;
        }, 400);
      }, 80);
    }
  };

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", updatePanels);
  updatePanels();
});

/**
 * Smoothly scroll to a section by its id.
 * @param {string} id The id of the element to scroll into view.
 */
function scrollToSection(id) {
  const index = panels.findIndex((p) => p.id === id);
  if (index !== -1) {
    window.scrollTo({ top: index * window.innerHeight, behavior: "smooth" });
  }
}
