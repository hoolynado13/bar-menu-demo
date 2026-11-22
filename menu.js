// Меню: вкладки со скроллспаем и переключатель размера пиццы. Общие эффекты в fx.js.

// Вкладки: жёлтая «таблетка» едет к активному разделу
const tabs = [...document.querySelectorAll('.m-tabs a')];
const pill = document.querySelector('.m-tabs .pill');
const movePill = (a) => {
  tabs.forEach((t) => t.classList.toggle('is-active', t === a));
  pill.style.width = a.offsetWidth + 'px';
  pill.style.transform = `translateX(${a.offsetLeft}px)`;
  const strip = a.parentElement;
  const left = a.offsetLeft;
  const right = left + a.offsetWidth;
  if (left < strip.scrollLeft || right > strip.scrollLeft + strip.clientWidth) {
    strip.scrollTo({ left: left < strip.scrollLeft ? left : right - strip.clientWidth, behavior: still ? 'instant' : 'smooth' });
  }
};
const tabBar=document.querySelector('.m-tabs');
const sections=tabs.map(tab=>document.getElementById(tab.hash.slice(1)));
function syncTab(){
  const top=tabBar.getBoundingClientRect().bottom+28;
  let selected=tabs[0];
  sections.forEach((section,i)=>{
    if(section.getClientRects().length && section.getBoundingClientRect().top<=top)selected=tabs[i];
  });
  if(window.scrollY+innerHeight>=document.documentElement.scrollHeight-2){
    selected=tabs.findLast((tab,i)=>sections[i].getClientRects().length)||selected;
  }
  movePill(selected);
}
function fitTabs(){
  const header=parseFloat(getComputedStyle(tabBar).top)||0;
  root.style.setProperty('--menu-offset',(header+tabBar.offsetHeight+2)+'px');
  syncTab();
}
new ResizeObserver(fitTabs).observe(tabBar);
new ResizeObserver(fitTabs).observe(document.querySelector('.site-header'));
addEventListener('scroll',syncTab,{passive:true});
addEventListener('resize',fitTabs);
fitTabs();

// Размер пиццы: цены пересчитываются с коротким счётчиком
document.querySelectorAll('.size-switch input').forEach((input) => {
  input.addEventListener('change', () => {
    document.querySelectorAll('.price .num').forEach((n) => {
      n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
      countTo(n, +n.dataset['s' + input.value]);
    });
  });
});

// Поиск по меню: прячет то, что не подходит, и подсвечивает совпадение
const search = document.getElementById('menu-search');
const items = [...document.querySelectorAll('.m-section .dots li')];
items.forEach((li) => {
  li.dataset.name = li.querySelector('.name').textContent;
  li.dataset.group = li.closest('.m-section').querySelector('.hand')?.textContent || ''; // «пицца» находит все пиццы
});
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
search.addEventListener('input', () => {
  const q = norm(search.value.trim());
  root.classList.toggle('searching', !!q);
  let hits = 0;
  items.forEach((li) => {
    const name = li.dataset.name;
    const at = norm(name).indexOf(q);
    const hit = !q || at >= 0 || norm(li.textContent).includes(q) || norm(li.dataset.group).includes(q);
    li.classList.toggle('miss', !hit);
    const title = li.querySelector('.name');
    if (q && at >= 0) {
      const mark = document.createElement('mark');
      mark.textContent = name.slice(at, at + q.length);
      title.replaceChildren(name.slice(0, at), mark, name.slice(at + q.length));
    } else title.textContent = name;
    if (hit && q) hits++;
  });
  document.querySelectorAll('.m-section').forEach((s) => {
    s.classList.toggle('no-hit', !!q && !s.querySelector('.dots li:not(.miss)'));
  });
  root.classList.toggle('nothing', !!q && !hits);
});

// Стили пива: нажмите на стиль — появится короткое описание
const note = document.querySelector('.style-note');
document.querySelectorAll('.styles-row button').forEach((b, _, all) => b.addEventListener('click', () => {
  all.forEach((x) => x.setAttribute('aria-pressed', x === b));
  const styleName = document.createElement("b");
  styleName.textContent = b.textContent + ":";
  note.replaceChildren(styleName, " " + b.dataset.note);
  note.classList.remove('swap'); void note.offsetWidth; note.classList.add('swap');
}));

// Смена кадров только пока галерея видна.
const gallery=document.querySelector('.hot-gallery');
if(gallery){
  const slides=[...gallery.querySelectorAll('img')];
  const bar=gallery.querySelector('figcaption');
  const caption=document.createElement('span');
  const count=document.createElement('small');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let current=0,visible=false,timer;
  bar.append(caption,count);
  function show(index){
    current=index;
    slides.forEach((img,i)=>{
      img.classList.toggle('current',i===current);
      img.setAttribute('aria-hidden',String(i!==current));
    });
    caption.textContent=slides[current].alt;
    count.textContent=slides.length>1?(current+1)+' / '+slides.length:'';
    bar.hidden=!caption.textContent&&!count.textContent;
  }
  function schedule(){
    clearInterval(timer);
    if(slides.length>1 && visible && !document.hidden && !motion.matches)
      timer=setInterval(()=>show((current+1)%slides.length),5500);
  }
  if(slides.length){
    show(0);
    new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;schedule()}).observe(gallery);
    document.addEventListener('visibilitychange',schedule);
    motion.addEventListener('change',schedule);
  }
}
