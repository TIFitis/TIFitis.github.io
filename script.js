/*
 * JavaScript for Akash Banerjee’s portfolio site.
 *
 * This script uses an IntersectionObserver to detect when elements with
 * the `fade-in` class enter the viewport and applies a `visible` class
 * that triggers CSS transitions defined in styles.css. It also exposes
 * a helper function for smooth scrolling to anchor targets.
 */

let panels = [];

document.addEventListener('DOMContentLoaded', () => {
  panels = Array.from(document.querySelectorAll('.sections > .panel'));
  document.body.style.height = `${panels.length * 100}vh`;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  const updatePanels = () => {
    const scrollPos = window.scrollY;
    const index = Math.floor(scrollPos / window.innerHeight);
    const progress = (scrollPos % window.innerHeight) / window.innerHeight;

    panels.forEach((panel, i) => {
      if (i === index) {
        panel.style.opacity = 1 - progress;
        panel.style.pointerEvents = 'auto';
      } else if (i === index + 1) {
        panel.style.opacity = progress;
        panel.style.pointerEvents = 'auto';
      } else {
        panel.style.opacity = 0;
        panel.style.pointerEvents = 'none';
      }
    });

    document.body.style.setProperty('--bg-offset', `${scrollPos * -0.1}px`);
  };

  window.addEventListener('scroll', updatePanels);
  window.addEventListener('resize', updatePanels);
  updatePanels();
});

/**
 * Smoothly scroll to a section by its id.
 * @param {string} id The id of the element to scroll into view.
 */
function scrollToSection(id) {
  const index = panels.findIndex(p => p.id === id);
  if (index !== -1) {
    window.scrollTo({ top: index * window.innerHeight, behavior: 'smooth' });
  }
}
