(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Menü ----
  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    const close = () => { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('is-open')) { close(); toggle.focus(); }
    });
  }

  // ---- Görünen bölümün menüde işaretlenmesi ----
  if ('IntersectionObserver' in window && links) {
    const map = new Map();
    links.querySelectorAll('a[href^="#"]').forEach((a) => {
      const sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec && !a.classList.contains('nav-cta')) map.set(sec, a);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const a = map.get(en.target);
        if (a) { if (en.isIntersecting) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, sec) => io.observe(sec));
  }

  // ---- Açılış videosu: ekran dışındayken durur, hareket azaltma tercihinde oynamaz ----
  const heroVideo = document.querySelector('[data-hero-video]');
  if (heroVideo && !reduceMotion && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) heroVideo.play().catch(() => {});
      else heroVideo.pause();
    }).observe(heroVideo);
  }

  // ---- Açılıştaki ana video: YouTube/Vimeo ise sessiz, döngülü canlı önizleme (geniş ekran, hareket tercihi varsa) ----
  const heroReel = document.querySelector('.hero-reel[data-embed]');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (heroReel && !reduceMotion && !saveData && window.matchMedia('(min-width: 60rem)').matches) {
    const previewSrc = (embed) => {
      try {
        const u = new URL(embed);
        const id = u.pathname.split('/').filter(Boolean).pop();
        if (u.hostname === 'www.youtube-nocookie.com') {
          return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3`;
        }
        if (u.hostname === 'player.vimeo.com') {
          const h = u.searchParams.get('h');
          return `https://player.vimeo.com/video/${id}?${h ? `h=${h}&` : ''}background=1&autoplay=1&muted=1&loop=1`;
        }
      } catch { /* geçersiz adres: önizleme yok */ }
      return '';
    };
    const startPreview = () => {
      const src = previewSrc(heroReel.dataset.embed);
      if (!src) return;
      const frame = document.createElement('iframe');
      frame.className = 'hero-embed';
      frame.src = src;
      frame.title = '';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.allow = 'autoplay; encrypted-media';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.addEventListener('load', () => setTimeout(() => frame.classList.add('is-ready'), 1500));
      heroReel.prepend(frame);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(startPreview, { timeout: 3500 });
    else setTimeout(startPreview, 1800);
  }

  // ---- Kart üzerine gelince sessiz önizleme (yalnızca fare olan cihazlarda) ----
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.reel-item .reel').forEach((card) => {
      const pv = card.querySelector('.reel-preview');
      if (!pv) return;
      card.addEventListener('pointerenter', () => {
        if (!pv.src) pv.src = pv.dataset.src;
        pv.play().then(() => pv.classList.add('is-playing')).catch(() => {});
      });
      card.addEventListener('pointerleave', () => { pv.pause(); pv.classList.remove('is-playing'); });
    });
  }

  // ---- Mobil hızlı iletişim çubuğu: açılış bölümü ve iletişim formu görünürken gizli kalır ----
  const dock = document.querySelector('[data-dock]');
  if (dock && 'IntersectionObserver' in window) {
    const seen = new Set();
    const update = () => dock.classList.toggle('is-on', seen.size === 0);
    const watch = (el) => {
      if (!el) return;
      seen.add(el); // ilk durum: görünür kabul et, gözlemci düzeltir
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) seen.add(el); else seen.delete(el);
        update();
      }, { threshold: 0.15 }).observe(el);
    };
    watch(document.getElementById('top'));
    watch(document.getElementById('iletisim'));
    update();
  }

  // ---- Etkinlik sayacı (kimlik/IP saklanmaz): video oynatma ve iletişim tıklamaları ----
  const beacon = (e, l) => {
    try { navigator.sendBeacon('/api/event', new Blob([JSON.stringify({ e, l })], { type: 'application/json' })); } catch { /* sayım zorunlu değil */ }
  };
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-cta], a[href^="tel:"], a[href*="wa.me"], a[href*="instagram.com"], a[href="#iletisim"]');
    if (a) {
      const href = a.getAttribute('href') || '';
      beacon('cta', a.dataset.cta || (href.startsWith('tel:') ? 'tel' : href.includes('wa.me') ? 'whatsapp' : href.includes('instagram.com') ? 'instagram' : 'form'));
    }
    const card = ev.target.closest('[data-id][data-video], [data-id][data-embed]');
    if (card) beacon('play', card.dataset.id);
  });

  // ---- Çalışma filtresi ----
  const chips = document.querySelectorAll('.chip[data-filter]');
  const items = [...document.querySelectorAll('.reel-item')];
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      items.forEach((li) => { li.hidden = f !== 'all' && li.dataset.category !== f; });
    }),
  );

  // ---- Video oynatıcı (kendi videomuz ya da YouTube/Vimeo gömülü oynatıcı) ----
  const dialog = document.getElementById('player');
  if (dialog && typeof dialog.showModal === 'function') {
    const video = dialog.querySelector('video');
    const embed = dialog.querySelector('.player-embed');
    const title = document.getElementById('player-title');
    const desc = document.getElementById('player-desc');
    let opener = null;
    const stop = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      embed.replaceChildren();
    };
    document.querySelectorAll('[data-video], [data-embed]').forEach((btn) =>
      btn.addEventListener('click', () => {
        opener = btn;
        title.textContent = btn.dataset.title;
        desc.textContent = [btn.dataset.role ? `Rolüm: ${btn.dataset.role}.` : '', btn.dataset.desc || ''].filter(Boolean).join(' ');
        if (btn.dataset.embed) {
          video.hidden = true;
          const frame = document.createElement('iframe');
          frame.src = `${btn.dataset.embed}${btn.dataset.embed.includes('?') ? '&' : '?'}autoplay=1`;
          frame.title = btn.dataset.title;
          frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          frame.allowFullscreen = true;
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          embed.replaceChildren(frame);
          embed.hidden = false;
          dialog.showModal();
        } else {
          embed.hidden = true;
          video.hidden = false;
          video.poster = btn.dataset.poster || '';
          video.src = btn.dataset.video;
          dialog.showModal();
          video.play().catch(() => {});
        }
      }),
    );
    const close = () => dialog.close();
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener('close', () => {
      stop();
      if (opener) opener.focus();
    });
  }

  // ---- Başlık altı el yazısı çizgi: başlık görününce çizilir ----
  const heads = document.querySelectorAll('.section h2');
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); seen.unobserve(en.target); }
    }), { threshold: 0.6 });
    heads.forEach((h2) => seen.observe(h2));
  } else {
    heads.forEach((h2) => h2.classList.add('in'));
  }

  // ---- İletişim formu: her alanın altında hata, üstte bağlantılı özet ----
  const form = document.getElementById('contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const summary = form.querySelector('.form-summary');
    const opened = Date.now();
    const rules = [
      ['name', 'e-name', (v) => v.trim().length >= 2, 'Lütfen adınızı yazın.'],
      ['email', 'e-email', (v) => /^\S+@\S+\.\S+$/.test(v.trim()), 'Geçerli bir e-posta adresi yazın.'],
      ['message', 'e-message', (v) => v.trim().length >= 10, 'Mesajınız en az 10 karakter olmalı.'],
    ];
    const setStatus = (state, text) => { status.dataset.state = state; status.textContent = text; };
    const setError = (input, errEl, text) => {
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      errEl.hidden = !text;
      errEl.textContent = text || '';
    };
    rules.forEach(([name, errId]) => {
      const input = form.elements[name];
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') setError(input, document.getElementById(errId), '');
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('', '');
      summary.hidden = true;
      const data = Object.fromEntries(new FormData(form));
      const problems = [];
      rules.forEach(([name, errId, ok, text]) => {
        const input = form.elements[name];
        const bad = !ok(data[name] || '');
        setError(input, document.getElementById(errId), bad ? text : '');
        if (bad) problems.push([input, text]);
      });
      if (problems.length) {
        summary.replaceChildren();
        const head = document.createElement('p');
        head.textContent = problems.length === 1 ? 'Bir alanı düzeltin:' : `${problems.length} alanı düzeltin:`;
        const list = document.createElement('ul');
        problems.forEach(([input, text]) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#${input.id}`;
          a.textContent = text;
          a.addEventListener('click', (ev) => { ev.preventDefault(); input.focus(); });
          li.append(a);
          list.append(li);
        });
        summary.append(head, list);
        summary.hidden = false;
        summary.focus();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      setStatus('', 'Gönderiliyor…');
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...data, t: opened }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Mesaj gönderilemedi.');
        form.reset();
        setStatus('', 'Mesajınız iletildi. En kısa sürede dönüş yapacağım.');
        status.dataset.state = 'ok';
        // Kâğıt uçak uçar, sonra geri gelir
        const panel = document.querySelector('[data-contact]');
        if (panel && !reduceMotion) {
          panel.classList.add('sent');
          setTimeout(() => { panel.classList.remove('sent'); panel.classList.add('back'); setTimeout(() => panel.classList.remove('back'), 900); }, 2600);
        }
      } catch (err) {
        setStatus('error', err.message || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
