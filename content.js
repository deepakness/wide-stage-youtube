(() => {
  const ON = 'ws-on';
  const BTN = 'ws-button';
  const root = document.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const onWatchPage = () => !!document.querySelector('ytd-watch-flexy');

  // Arrows point out when off (go wide) and in when on (go back).
  const ICON_OFF = 'M3 6h18v12H3z M7 9.5L4.5 12L7 14.5 M17 9.5L19.5 12L17 14.5 M5 12h14';
  const ICON_ON = 'M3 6h18v12H3z M6.5 9.5L9 12L6.5 14.5 M17.5 9.5L15 12L17.5 14.5';

  function setMode(on) {
    root.classList.toggle(ON, on);
    updateButton();
    // YouTube re-measures the player on window resize.
    window.dispatchEvent(new Event('resize'));
  }

  const toggle = () => setMode(!root.classList.contains(ON));

  function updateButton() {
    const btn = document.querySelector('.' + BTN);
    if (!btn) return;
    const on = root.classList.contains(ON);
    const label = on ? 'Exit wide stage (`)' : 'Wide stage (`)';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', label);
    btn.setAttribute('data-title-no-tooltip', label);
    btn.title = label;
    btn.querySelector('path').setAttribute('d', on ? ICON_ON : ICON_OFF);
  }

  function makeButton(ref) {
    const btn = document.createElement('button');
    btn.className = 'ytp-button ' + BTN;
    const svg = document.createElementNS(SVG_NS, 'svg');
    // Match the size of YouTube's own icons. The newer player draws on a
    // 24 grid, the older one on a 36 grid with padding around the glyph.
    const refSvg = ref && ref.querySelector('svg');
    const grid36 = refSvg && refSvg.getAttribute('viewBox') === '0 0 36 36';
    svg.setAttribute('viewBox', grid36 ? '-6 -6 36 36' : '0 0 24 24');
    svg.setAttribute('width', refSvg?.getAttribute('width') || '100%');
    svg.setAttribute('height', refSvg?.getAttribute('height') || '100%');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    btn.appendChild(svg);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    return btn;
  }

  // Put the button just before YouTube's fullscreen button.
  function ensureButton() {
    const player = document.getElementById('movie_player');
    if (!player || player.querySelector('.' + BTN)) return;
    const fs = player.querySelector('.ytp-fullscreen-button');
    const parent = fs?.parentNode || player.querySelector('.ytp-right-controls');
    if (!parent) return;
    parent.insertBefore(makeButton(fs), fs || null);
    updateButton();
  }

  // YouTube rebuilds the player controls at times, so re-add the button when it goes missing.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureButton();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  ensureButton();

  document.addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.defaultPrevented || !onWatchPage()) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    toggle();
  }, true);

  // YouTube is a single-page app: leaving the watch page resets the mode.
  document.addEventListener('yt-navigate-finish', () => {
    if (!onWatchPage() && root.classList.contains(ON)) setMode(false);
  });
})();
