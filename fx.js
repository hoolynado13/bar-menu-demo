// Общее: «открыто сейчас», шапка, плавный счётчик для цен пиццы.
const root = document.documentElement;
root.classList.replace('no-js', 'js');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Высота липкой шапки (нужна липким вкладкам меню)
const header = document.querySelector('.site-header');
const setHeaderH = () => {
  const sticky = getComputedStyle(header).position === 'sticky';
  root.style.setProperty('--header-h', sticky ? header.offsetHeight + 'px' : '0px');
};
setHeaderH();
addEventListener('resize', setHeaderH);

// Плавный счётчик до числа (цены при смене размера пиццы)
const priceFrames=new WeakMap();
function countTo(el, to, ms = 400) {
  cancelAnimationFrame(priceFrames.get(el));
  const from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
  if (still) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
    if (k < 1) priceFrames.set(el,requestAnimationFrame(step));
  };
  priceFrames.set(el,requestAnimationFrame(step));
}

// График бара в Санкт-Петербурге. После полуночи ещё может идти предыдущая смена.
const barClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Moscow', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function openState(now) {
  const parts = Object.fromEntries(barClock.formatToParts(now).map(({ type, value }) => [type, value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const clock = document.documentElement.dataset;
  function shift(weekday) {
    const late = weekday === 5 || weekday === 6;
    const start = (late ? clock.lateopen : clock.earlyopen) || '13:00';
    const end = (late ? clock.lateend : clock.earlyend) || (late ? '01:00' : '00:00');
    const minutes = value => Number(value.slice(0,2)) * 60 + Number(value.slice(3));
    return { start, end, from: minutes(start), to: minutes(end) };
  }
  const today = shift(day);
  const previous = (day + 6) % 7;
  const last = shift(previous);
  if (minute >= today.from && (today.to <= today.from || minute < today.to)) {
    return {open:true, day, until:today.end, left:today.to-minute+(today.to<=today.from?1440:0)};
  }
  if (last.to < last.from && minute < last.to) {
    return {open:true, day:previous, until:last.end, left:last.to-minute};
  }
  if (minute < today.from) return {open:false, day, next:today.start, left:today.from-minute};
  const tomorrow = shift((day+1)%7);
  return {open:false, day, next:tomorrow.start, left:1440-minute+tomorrow.from};
}
const plate = document.querySelector('.plate');
function renderHours() {
  const st = openState(new Date());
  const left = (st.left >= 60 ? Math.floor(st.left / 60) + ' ч ' : '') + st.left % 60 + ' мин';
  const status = st.open ? 'Открыто до ' + st.until : 'Закрыто, откроемся в ' + st.next;
  for (const el of [...document.querySelectorAll('.open-now'), plate]) {
    el.classList.toggle('is-open', st.open);
    el.classList.toggle('is-closed', !st.open);
  }
  document.querySelectorAll('.open-now').forEach((el) => {
    el.innerHTML = '<i></i>' + status + (st.open ? ', ещё ' : ', через ') + left;
  });
  plate.setAttribute('aria-label', status + '. Часы работы и контакты');
  plate.querySelector('.plate-text').innerHTML = st.open ? 'Открыто<b>до ' + st.until + '</b>' : 'Закрыто<b>с ' + st.next + '</b>';
  document.querySelectorAll('.hours li[data-days]').forEach((li) => {
    li.classList.toggle('today', li.dataset.days.split(',').includes(String(st.day)));
  });
}
function scheduleHours() {
  renderHours();
  setTimeout(scheduleHours, 60000 - Date.now() % 60000);
}
scheduleHours();
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderHours(); });

// Шапка-фасад: сжатие при прокрутке, табличка часов на сегодня, мобильное меню-доска
const nav = document.getElementById('site-nav');
const links = [...nav.querySelectorAll('a')];
const current = nav.querySelector('[aria-current="page"]');
addEventListener('scroll', () => header.classList.toggle('is-scrolled', scrollY > 40), { passive: true });
new ResizeObserver(setHeaderH).observe(header);

const menuBtn = document.querySelector('.menu-btn');
const menuClosedLabel = menuBtn.textContent;
const setMenu = (open) => {
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.textContent = open ? 'Закрыть' : menuClosedLabel;
  if (open) (current || links[0]).focus({ preventScroll: true });
};
menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
links.forEach((a, i) => { a.style.setProperty('--i', i); a.addEventListener('click', () => setMenu(false)); });
matchMedia('(max-width: 860px)').addEventListener('change', () => setMenu(false));

// Бокал на главной: нажмите и держите, чтобы налить; полный бокал можно «выпить»
function fullGlass(glass) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  glass.querySelector('.foam').animate([
    {transform:'scaleY(1)'},
    {transform:'translateY(-6px) scaleY(1.32) rotate(-2deg)',offset:.32},
    {transform:'translateY(2px) scaleY(.96)',offset:.7},
    {transform:'none'}
  ], {duration:520,easing:'ease-out'});
  for (const [left, drift, height, size] of [[24,-18,32,7],[48,-10,52,5],[78,4,42,9],[110,14,56,6],[139,23,33,5]]) {
    const drop=document.createElement('i');
    drop.className='foam-drop';
    drop.style.cssText='left:'+left+'px;width:'+size+'px;height:'+size+'px';
    glass.append(drop);
    const burst=drop.animate([
      {transform:'translate(0,0) scale(.5)',opacity:0},
      {opacity:1,offset:.16},
      {transform:'translate('+drift+'px,-'+height+'px)',offset:.55},
      {transform:'translate('+drift*1.6+'px,-8px) scale(.45)',opacity:0}
    ],{duration:470+size*12,easing:'ease-out'});
    burst.onfinish=()=>drop.remove();
  }
}

function introduceGlass(box) {
  const target = box.querySelector('.glass-wrap');
  if (still || window !== window.top || location.hash || scrollY > 2 || !target.getClientRects().length) return;
  try {
    if (sessionStorage.getItem('demo-glass-intro')) return;
    sessionStorage.setItem('demo-glass-intro', '1');
  } catch { return; }

  const stage = document.createElement('div');
  stage.className = 'glass-intro';
  stage.inert = true;
  stage.setAttribute('aria-hidden', 'true');
  const veil = document.createElement('div');
  veil.className = 'glass-intro-veil';
  const mug = target.cloneNode(true);
  mug.removeAttribute('role');
  mug.removeAttribute('tabindex');
  const brand = document.createElement('span');
  brand.className = 'glass-intro-brand';
  let letterIndex = 0;
  for (const character of 'Демо Бар') {
    if (character === ' ') {
      brand.append(' ');
      continue;
    }
    const letter = document.createElement('span');
    letter.textContent = character;
    letter.style.animationDelay = (70 + letterIndex * 60) + 'ms';
    brand.append(letter);
    letterIndex++;
  }
  stage.append(veil, mug, brand);
  document.body.append(stage);
  target.style.opacity = '0';
  const bowl = mug.querySelector('.glass');
  const beer = mug.querySelector('.beer');
  const stream = mug.querySelector('.stream');
  const start = performance.now();
  const listeners = new AbortController();
  let frame;
  let toasted=false;
  function finish() {
    cancelAnimationFrame(frame);
    listeners.abort();
    stage.remove();
    target.style.removeProperty('opacity');
  }
  for (const event of ['pointerdown','keydown','scroll','resize','pagehide']) {
    window.addEventListener(event, finish, {passive:true, signal:listeners.signal});
  }
  document.addEventListener('visibilitychange', finish, {signal:listeners.signal});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',finish,{signal:listeners.signal});

  function paint(now) {
    const elapsed = now - start;
    const fill = Math.min(1, elapsed / 1100);
    if(fill===1&&!toasted){toasted=true;fullGlass(mug)}
    const progress = Math.max(0, Math.min(1, (elapsed - 1210) / 660));
    const flight = progress * progress * (3 - 2 * progress);
    const dest = target.getBoundingClientRect();
    const width = mug.offsetWidth, height = mug.offsetHeight;
    const x = (stage.clientWidth - width) / 2;
    const y = (stage.clientHeight - height) / 2;
    beer.style.height = (82 * fill) + '%';
    stream.style.height = (58 + 254 * (1 - 0.82 * fill)) + 'px';
    stream.style.opacity = Math.min(1, elapsed / 90, Math.max(0, (1180 - elapsed) / 90));
    veil.style.opacity = 1 - flight;
    brand.style.opacity = Math.max(0, 1 - progress * 3);
    const pop=Math.min(1,elapsed/470);
    const entrance=1-Math.exp(-5*pop)*Math.cos(9*pop);
    const scale = .58+.28*entrance+(dest.width / width-.86)*flight;
    const handleOffset = (width - bowl.offsetWidth) * scale / 2;
    mug.style.transform = 'translate(' + (handleOffset * (1 - flight) + (dest.left - x) * flight) + 'px,' +
      ((dest.top - y) * flight - 22 * Math.sin(Math.PI * flight)) + 'px) scale(' + scale + ')';
    if (progress === 1) {
      finish();
      target.animate([
        {transform:'none'}, {transform:'scale(1.05,.94)',offset:.2},
        {transform:'translateY(-9px) rotate(-2deg)',offset:.52}, {transform:'none'}
      ],{duration:350,easing:'ease-out'});
    }
    else frame = requestAnimationFrame(paint);
  }
  paint(start);
}

document.querySelectorAll('.pour').forEach((box) => {
  const glass = box.querySelector('.glass-wrap');
  const caption = box.querySelector('.pour-caption');
  const say = (html) => { if(caption.innerHTML!==html)caption.innerHTML = html; };
  let level = 1, pouring = false, draining = false, raf = 0, last = 0;
  const set = (v) => {
    if (v>=1 && level<1) fullGlass(glass);
    level = v;
    box.style.setProperty('--level', Math.min(level, 1));
    box.style.setProperty('--head', Math.max(0, Math.min(1, (level - .9) * 6)));
    box.classList.toggle('empty', level < .03);
    box.classList.toggle('over', level > 1.12);
  };
  const tick = (t) => {
    const dt = last ? (t - last) / 1000 : 0;
    last = t;
    if (pouring) set(level + dt * (level < 1 ? .45 : .2));
    if (level > 1.12) say('<b>Пена через край!</b> Отпустите, бармен у нас аккуратнее.');
    raf = pouring ? requestAnimationFrame(tick) : 0;
  };
  const start = (e) => {
    e.preventDefault();
    box.classList.add('manual');
    if(draining||pouring)return;
    if (level >= 1) return drink();
    pouring = true; last = 0;
    box.classList.add('pouring');
    say('Наливаем…');
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (!pouring) return;
    pouring = false;
    box.classList.remove('pouring');
    if (level > 1.12) { set(1); say('Пену сдули. <b>Нажмите на бокал, чтобы выпить.</b>'); }
    else if (level >= 1) say('<b>Полный!</b> Нажмите ещё раз, чтобы выпить.');
    else say(`Налито на ${Math.round(level * 100)}%. Держите дольше.`);
  };
  const drink = () => {
    draining=true;
    const from = level, t0 = performance.now();
    say('Хорошо пошло. <b>Нажмите и держите, чтобы налить ещё.</b>');
    const step = (t) => {
      const k = still ? 1 : Math.min(1, (t - t0) / 900);
      set(from * (1 - k));
      if (k < 1) requestAnimationFrame(step);else draining=false;
    };
    requestAnimationFrame(step);
  };
  glass.addEventListener('pointerdown', start);
  addEventListener('pointerup', stop);
  addEventListener('pointercancel',stop);addEventListener('blur',stop);
  glass.addEventListener('pointerleave', stop);
  glass.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    box.classList.add('manual');
    if(e.repeat||draining||pouring)return;
    if (level >= 1) return drink();
    set(1);
    say('<b>Полный!</b> Нажмите ещё раз, чтобы выпить.');
  });
  set(1);
  introduceGlass(box);
});

// «Подходит ли нам?»: выбор повода показывает ответ
const fit = document.querySelector('.fit');
if (fit) {
  const answer = fit.querySelector('.fit-answer');
  fit.querySelectorAll('input').forEach((r) => r.addEventListener('change', () => {
    const tpl = document.getElementById('fit-' + r.value);
    answer.innerHTML = tpl.innerHTML;
    answer.classList.remove('swap'); void answer.offsetWidth; answer.classList.add('swap');
  }));
  fit.querySelector('input:checked')?.dispatchEvent(new Event('change'));
}

// Меловое подчёркивание рукописных заголовков, когда они на экране
const chalk = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); chalk.unobserve(e.target); }
}, { rootMargin: '0px 0px -15% 0px' });
document.querySelectorAll('.hand').forEach((h) => chalk.observe(h));

// Пробка «наверх»
const toTop = document.querySelector('.to-top');
if (toTop) {
  addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 700), { passive: true });
  toTop.addEventListener('click', () => {
    toTop.classList.add('pop');
    setTimeout(() => toTop.classList.remove('pop'), 500);
    scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    document.querySelector('.logo')?.focus({ preventScroll: true });
  });
}

// Наклейка «Хорошее место 2026» шлёпается на дверь, когда её видно
const stickerIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('slap'); stickerIO.unobserve(e.target); }
}, { threshold: .6 });
document.querySelectorAll('.sticker').forEach((s) => stickerIO.observe(s));

const entrancePhoto = document.querySelector('.pin-photo');
if (entrancePhoto && !still) {
  const entranceObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      entrancePhoto.classList.add('in-view');
      entranceObserver.disconnect();
    }
  }, { threshold: 0.35 });
  entranceObserver.observe(entrancePhoto);
}

// The decorative layer stays behind each section's content.
const bubbleObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('bubbles-visible', entry.isIntersecting);
});
for (const [index,section] of [...document.querySelectorAll('main > section, .site-footer')].entries()) {
  let layer=section.querySelector(':scope > .hero-bubbles');
  if (!layer) {
    layer=document.createElement('div');
    layer.className='hero-bubbles ambient-bubbles';
    layer.setAttribute('aria-hidden','true');
    for (const [i,x] of [3,94,16,82,46,62].entries()) {
      const bubble=document.createElement('i');
      const phase=(index*7+i*5)%23;
      bubble.style.cssText='--x:'+x+'%;--s:'+(12+(i*9+index*3)%23)+'px;--d:'+(19+i)+'s;--w:-'+phase+'s;--drift:'+(i%2?-14:16)+'px';
      layer.append(bubble);
    }
    section.prepend(layer);
  }
  section.classList.add('bubble-section');
  bubbleObserver.observe(section);
}

const review = document.querySelector('.visit-review');
if (review && !still) {
  const revealAward = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    review.classList.add('award-seen');
    revealAward.disconnect();
  }, {threshold:.55});
  revealAward.observe(review);
}
