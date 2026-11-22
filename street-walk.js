(() => {
  const scene = document.querySelector('.street-walk');
  if (!scene) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  scene.classList.add('walk-enhanced');
  let inView = false;
  let timer = null;

  function walk() {
    if (scene.contains(document.activeElement)) return;
    scene.classList.remove('arrived');
    scene.classList.add('walking');
  }
  function sync() {
    if (inView && !document.hidden && !motion.matches) {
      if (timer === null) {
        walk();
        timer = setInterval(walk, 30000);
      }
    } else {
      clearInterval(timer);
      timer = null;
      scene.classList.remove('walking');
    }
  }
  scene.addEventListener('animationend', event => {
    if (event.animationName === 'walk-to-demo') {
      scene.classList.remove('walking');
      scene.classList.add('arrived');
    }
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= .45;
    sync();
  }, {threshold: [0, .45]}).observe(scene);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
})();
