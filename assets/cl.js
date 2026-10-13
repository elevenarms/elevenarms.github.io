// Small modern touches for an old-fashioned board. Every feature is optional: without
// JavaScript the page still reads, links work and images open as plain files.

// "posted 3 days ago" next to absolute dates
(function relativeDates() {
  const fmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const t of document.querySelectorAll('time[data-ago]')) {
    // compare calendar days in local time ("2026-10-13" alone would parse as UTC midnight)
    const [y, m, d] = t.getAttribute('datetime').split('-').map(Number);
    if (!y || !m || !d) continue;
    const now = new Date();
    const days = Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    const ago = Math.abs(days) < 1 ? 'today' : Math.abs(days) < 45 ? fmt.format(days, 'day') : fmt.format(Math.round(days / 30), 'month');
    const s = document.createElement('span');
    s.className = 'ago'; s.textContent = ` (${ago})`;
    t.after(s);
  }
})();

// Click a picture to see it full size; arrow keys step through the post's pictures
(function lightbox() {
  const imgs = [...document.querySelectorAll('figure img')];
  if (!imgs.length || !window.HTMLDialogElement) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML = '<img alt=""><p><span class="cap"></span><span><button type="button" data-prev>‹ prev</button> <button type="button" data-next>next ›</button> <button type="button" data-close>close</button></span></p>';
  document.body.append(dlg);
  const big = dlg.querySelector('img'), cap = dlg.querySelector('.cap');
  let i = 0;
  const show = (n) => {
    i = (n + imgs.length) % imgs.length;
    big.src = imgs[i].currentSrc || imgs[i].src; big.alt = imgs[i].alt;
    cap.textContent = `image ${i + 1} of ${imgs.length}`;
  };
  imgs.forEach((im, n) => im.addEventListener('click', () => { show(n); dlg.showModal(); }));
  dlg.querySelector('[data-prev]').onclick = () => show(i - 1);
  dlg.querySelector('[data-next]').onclick = () => show(i + 1);
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
})();

// ☆ favorite (remembered in this browser only) and share
(function actions() {
  const fav = document.querySelector('[data-fav]');
  if (fav) {
    const key = 'fav:' + location.pathname;
    let on = false;
    try { on = localStorage.getItem(key) === '1'; } catch {}
    const paint = () => { fav.setAttribute('aria-pressed', on); fav.textContent = on ? '★ favorited' : '☆ favorite'; };
    paint();
    fav.addEventListener('click', () => {
      on = !on; paint();
      try { on ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch {}
    });
  }
  const share = document.querySelector('[data-share]');
  if (share) share.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); share.textContent = 'link copied'; setTimeout(() => (share.textContent = 'share'), 1800); }
    } catch {}
  });
})();

// search box on the board: filter listings as you type
(function filter() {
  const q = document.querySelector('[data-filter]');
  if (!q) return;
  const rows = [...document.querySelectorAll('.listing')];
  const empty = document.querySelector('[data-empty]');
  q.addEventListener('input', () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const r of rows) {
      const hit = words.every(w => r.textContent.toLowerCase().includes(w));
      r.hidden = !hit; shown += hit;
    }
    if (empty) empty.hidden = shown > 0;
  });
})();
