// Original PNG rendered as six independently clipped sprite layers.
// Coordinates are normalized so the original material and alpha stay intact.
(() => {
  const source = document.querySelector('img.ribbons');
  if (!source) return;
  const skipReveal = new URLSearchParams(location.search).get('redeemed') === '1';
  if (!skipReveal) document.documentElement.classList.add('motion-pending');
  const pieces = [
    {box:[.105,.10,.075,.145], duration:4.1, drift:-9, turn:9},
    {box:[.01,.211,.15,.345], duration:5.3, drift:12, turn:-7},
    {box:[.025,.55,.08,.12], clip:"polygon(0 0,100% 0,100% 66%,50% 100%,0 100%)", duration:3.8, drift:-11, turn:14},
    {box:[.015,.61,.19,.27], clip:"polygon(45% 0,100% 0,100% 100%,0 100%,0 43%,32% 26%)", duration:4.8, drift:10, turn:-9},
    {box:[.77,.17,.23,.36], duration:5.7, drift:-12, turn:7},
    {box:[.875,.62,.09,.14], duration:4.3, drift:9, turn:-13},
  ];
  const root = document.createElement('div');
  root.className = 'ribbons ribbons-layered';
  root.setAttribute('aria-hidden', 'true');
  pieces.forEach(({box:[x,y,w,h],duration,drift,turn,clip}, i) => {
    const slot = document.createElement('div');
    slot.className = 'ribbon-slot';
    Object.assign(slot.style, {left:`${x*100}%`,top:`${y*100}%`,width:`${w*100}%`,height:`${h*100}%`});
    slot.style.setProperty('--delay', `${.24 + i*.025}s`);
    slot.style.setProperty('--from-x', `${(0.5-x-w/2)*627}px`);
    slot.style.setProperty('--from-y', `${(0.5-y-h/2)*326}px`);
    slot.style.setProperty('--duration', `${duration}s`);
    slot.style.setProperty('--drift', `${drift}px`);
    slot.style.setProperty('--turn', `${turn}deg`);
    const piece = document.createElement('div');
    piece.className = 'ribbon-piece';
    if (clip) piece.style.clipPath = clip;
    const img = document.createElement('img');
    img.src = source.src;
    img.alt = '';
    img.draggable = false;
    Object.assign(img.style, {width:`${100/w}%`,height:`${100/h}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`});
    piece.append(img);
    slot.append(piece);
    root.append(slot);
  });
  source.replaceWith(root);
  if (skipReveal) return;
  // Start content and ribbons on the same clock after prize layout and images load.
  const ready = [window.ready, ...Array.from(root.querySelectorAll('img'), img => img.decode())];
  Promise.allSettled(ready).then(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('motion-pending');
      document.documentElement.classList.add('motion-ready');
    });
  });
})();
