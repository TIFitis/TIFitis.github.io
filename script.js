/*
 * JavaScript for Akash Banerjee’s portfolio site.
 *
 * This script uses an IntersectionObserver to detect when elements with
 * the `fade-in` class enter the viewport and applies a `visible` class
 * that triggers CSS transitions defined in styles.css. It also exposes
 * a helper function for smooth scrolling to anchor targets.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Set up an observer to watch for elements that should fade into view.
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  // Observe all elements with the fade-in class.
  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });

  // Update background offset for subtle parallax effect.
  const updateBgOffset = () => {
    const offset = window.scrollY * -0.1;
    document.body.style.setProperty('--bg-offset', `${offset}px`);
  };
  window.addEventListener('scroll', updateBgOffset);
  updateBgOffset();
});

/**
 * Smoothly scroll to a section by its id.
 * @param {string} id The id of the element to scroll into view.
 */
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}