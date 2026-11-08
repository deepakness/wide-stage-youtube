(() => {
  const ON = 'ws-on';
  const TOP = 'ws-top';
  const BTN = 'ws-button';
  const root = document.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // YouTube keeps a hidden ytd-watch-flexy around after leaving a video,
  // so check that it is showing, not just that it exists.
  const onWatchPage = () => {
    const flexy = document.querySelector('ytd-watch-flexy');
    return !!flexy && !flexy.hidden;
  };
  const isOn = () => root.classList.contains(ON);
  const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  // Arrows point out when off (go wide) and in when on (go back).
  const ICON_OFF = 'M3 6h18v12H3z M7 9.5L4.5 12L7 14.5 M17 9.5L19.5 12L17 14.5 M5 12h14';
  const ICON_ON = 'M3 6h18v12H3z M6.5 9.5L9 12L6.5 14.5 M17.5 9.5L15 12L17.5 14.5';

  function setMode(on) {
    root.classList.toggle(ON, on);
    if (!on) hideTop(true);
    updateButton();
    remeasure();
  }

  // YouTube sizes the player controls from the size it last measured, and
  // re-measures only on window resize. Some layouts settle after the switch
  // (comments in the side panel, cinema/default view changes), which left
  // the control bar at wide stage width with the right buttons cut off. So
  // for a few seconds after a switch, re-measure whenever the player resizes.
  let settleObserver = null;
  let settleTimer = 0;
  function remeasure() {
    window.dispatchEvent(new Event('resize'));
    const player = document.getElementById('movie_player');
    if (!player || typeof ResizeObserver !== 'function') return;
    settleObserver?.disconnect();
    clearTimeout(settleTimer);
    let frame = 0;
    settleObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
    settleObserver.observe(player);
    settleTimer = setTimeout(() => {
      settleObserver?.disconnect();
      settleObserver = null;
    }, 3000);
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
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.defaultPrevented || isTyping(e.target)) return;
    if (e.key === '`') {
      if (!onWatchPage()) return;
      e.preventDefault();
      toggle();
    } else if (e.key === 't' && isOn()) {
      // YouTube's cinema mode key. Leave wide stage and let YouTube switch
      // the view, or the change would happen hidden behind the stage.
      setMode(false);
    } else if (e.key === 'Escape' && isOn() && !document.fullscreenElement && !menuOpen()) {
      // Like leaving fullscreen: back to the view from before wide stage.
      // When Escape is closing a menu, let it do only that.
      setMode(false);
    }
  }, true);

  // A menu opened from the top bar, the guide, or the player's settings or
  // right-click menu.
  function menuOpen() {
    if (barMenuOpen()) return true;
    return [...document.querySelectorAll('.ytp-settings-menu, .ytp-contextmenu')]
      .some((d) => getComputedStyle(d).display !== 'none');
  }

  // Same for the cinema mode / default view button. Capture runs before
  // YouTube's own handler, which still gets the click.
  document.addEventListener('click', (e) => {
    if (isOn() && e.target.closest?.('.ytp-size-button')) setMode(false);
  }, true);

  // The top bar (logo, search, account) sits hidden above the stage and
  // slides in while the pointer is in the top strip or over the bar.
  const masthead = () => document.getElementById('masthead-container');
  let hideTimer = 0;
  let pointerOnTop = false;
  // Set while the user moves focus with Tab, so the bar stays for keyboard
  // users but not when a menu closed with Escape hands focus back to it.
  let tabbing = false;

  function showTop() {
    clearTimeout(hideTimer);
    hideTimer = 0;
    root.classList.add(TOP);
  }

  // Keep the bar while the search box has focus (or keyboard focus is in the
  // bar), or while the guide or a menu opened from the bar (account,
  // notifications, create) is open.
  function topInUse() {
    const active = document.activeElement;
    if ((tabbing || isTyping(active)) && masthead()?.contains(active)) return true;
    return barMenuOpen();
  }

  function barMenuOpen() {
    if (document.querySelector('tp-yt-app-drawer#guide[opened]')) return true;
    return [...document.querySelectorAll('ytd-popup-container > tp-yt-iron-dropdown')]
      .some((d) => getComputedStyle(d).display !== 'none');
  }

  function hideTop(now) {
    if (now) {
      clearTimeout(hideTimer);
      hideTimer = 0;
      pointerOnTop = false;
      root.classList.remove(TOP);
      return;
    }
    // A short delay stops the bar flickering when the pointer grazes its edge.
    // While a menu or the search box still needs the bar, keep checking, so
    // the bar goes however the menu closes (click, Escape, picking an item).
    if (hideTimer || !root.classList.contains(TOP)) return;
    hideTimer = setTimeout(function check() {
      hideTimer = 0;
      if (pointerOnTop) return;
      if (topInUse()) hideTimer = setTimeout(check, 300);
      else root.classList.remove(TOP);
    }, 300);
  }

  document.addEventListener('mousemove', (e) => {
    if (!isOn() || document.fullscreenElement) return;
    const bar = masthead();
    const barHeight = bar?.offsetHeight || 56;
    // Open menus and the guide keep the bar through topInUse, not here, so
    // closing one hides the bar without another mouse move.
    pointerOnTop = e.clientY < barHeight || !!bar?.contains(e.target);
    if (pointerOnTop) showTop();
    else hideTop();
  }, { capture: true, passive: true });

  // Pointer left the page, e.g. up into the browser's tab strip.
  document.addEventListener('mouseout', (e) => {
    if (e.relatedTarget) return;
    pointerOnTop = false;
    if (isOn()) hideTop();
  }, true);

  // Show the bar when focus moves into it, such as YouTube's / key for
  // search, then let the check above decide how long it stays.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') tabbing = true;
  }, true);
  document.addEventListener('pointerdown', () => {
    tabbing = false;
  }, true);
  document.addEventListener('focusin', (e) => {
    if (!isOn() || document.fullscreenElement || !masthead()?.contains(e.target)) return;
    showTop();
    if (!pointerOnTop) hideTop();
  }, true);
  document.addEventListener('focusout', (e) => {
    if (isOn() && masthead()?.contains(e.target)) hideTop();
  }, true);

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) hideTop(true);
  });

  // YouTube is a single-page app: leaving the watch page resets the mode.
  document.addEventListener('yt-navigate-finish', () => {
    if (!onWatchPage() && isOn()) setMode(false);
  });
})();
