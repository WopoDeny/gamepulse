import { useEffect } from 'react';

export function useScrollReveal(dependencies = []) {
  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]:not(.is-visible)');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
