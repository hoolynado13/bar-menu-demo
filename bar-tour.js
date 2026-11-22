(() => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const stops = Array.from(gallery.querySelectorAll('figure'));
  if (stops.length < 2) return;
  const street = stops.splice(3, 1)[0];
  if (street) stops.unshift(street);
  const make = (tag, cls) => Object.assign(document.createElement(tag), {className:cls});
  const stage = make('div','tour-stage');
  const route = make('div','tour-route');
  const controls = make('div','tour-controls');
  const count = make('span','tour-count');
  count.setAttribute('aria-live','polite');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = [];
  let current = 0, progress = 0, frame = 0;
  const last = stops.length - 1;
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 40 '+(last*64));
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(svgNS,'path');
  let d='M20 0';
  for(let i=0;i<last;i++) d+=' c'+(i%2?-20:20)+' 22 '+(i%2?-20:20)+' 42 0 64';
  path.setAttribute('d',d);
  const trace=path.cloneNode();trace.classList.add('tour-trace');
  svg.append(path,trace);
  const marker=make('i','tour-marker');
  marker.setAttribute('aria-hidden','true');
  const rail=make('div','tour-rail');
  rail.append(svg,marker);
  route.append(rail);
  function paint(value){
    progress=value;
    const length=path.getTotalLength();
    const point=path.getPointAtLength(length*value);
    trace.style.strokeDasharray=length+' '+length;
    trace.style.strokeDashoffset=length*(1-value);
    marker.style.left=point.x/40*100+'%';
    marker.style.top=point.y/(last*64)*100+'%';
  }
  function move(to){
    if(to<0||to>last)return;
    const previous=current;
    current=to;
    stops.forEach((fig,i)=>{
      fig.classList.toggle('is-current',i===to);
      fig.setAttribute('aria-hidden',String(i!==to));
      buttons[i].setAttribute('aria-pressed',String(i===to));
    });
    const title=stops[to].querySelector('figcaption').textContent;
    count.textContent=(to+1)+' / '+stops.length+' · '+title;
    prev.disabled=to===0;next.disabled=to===last;
    cancelAnimationFrame(frame);
    const goal=to/last, from=progress;
    if(reduced.matches || previous===to){paint(goal);return}
    const duration=450+Math.abs(goal-from)*400;
    const start=performance.now();
    function travel(now){
      const t=Math.min(1,(now-start)/duration);
      paint(from+(goal-from)*t*t*(3-2*t));
      if(t<1)frame=requestAnimationFrame(travel);
    }
    frame=requestAnimationFrame(travel);
  }
  stops.forEach((fig,i)=>{
    const image=fig.querySelector('img');
    const button=make('button','tour-stop');
    button.type='button';
    const thumb=image.cloneNode(false);thumb.alt='';thumb.removeAttribute('id');
    const label=make('span','tour-label');label.textContent=fig.querySelector('figcaption').textContent;
    button.append(thumb,label);
    button.onclick=()=>move(i);
    buttons.push(button);route.append(button);
    stage.append(fig);
  });
  function arrow(name,offset){
    const b=make('button','tour-arrow');b.type='button';
    b.setAttribute('aria-label',name);b.onclick=()=>move(current+offset);return b;
  }
  const prev=arrow('Предыдущее место',-1),next=arrow('Следующее место',1);
  const switcher=make('div','tour-switcher');
  switcher.setAttribute('role','group');
  switcher.setAttribute('aria-label','Переключение мест');
  switcher.append(prev,next);
  controls.append(count,switcher);
  const viewer=make('div','tour-viewer');
  viewer.append(stage,controls);
  gallery.classList.add('bar-tour');gallery.replaceChildren(viewer,route);
  route.onkeydown=e=>{
    const offset={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];
    if(!offset)return;
    e.preventDefault();const to=Math.max(0,Math.min(last,current+offset));
    move(to);buttons[to].focus({preventScroll:true});
  };
  move(0);
})();
