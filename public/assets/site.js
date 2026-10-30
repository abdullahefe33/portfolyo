(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BENTO = ['s7', 's5', 's4', 's4', 's4'];

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

  // ---- Çalışma filtresi (mozaik düzeni görünen kartlara göre yeniden kurulur) ----
  const chips = document.querySelectorAll('.chip[data-filter]');
  const items = [...document.querySelectorAll('.reel-item')];
  const layout = () => {
    let n = 0;
    items.forEach((li) => {
      BENTO.forEach((c) => li.classList.remove(c));
      if (!li.hidden) li.classList.add(BENTO[n++ % BENTO.length]);
    });
  };
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      items.forEach((li) => { li.hidden = f !== 'all' && li.dataset.category !== f; });
      layout();
    }),
  );

  // ---- Video oynatıcı ----
  const dialog = document.getElementById('player');
  if (dialog && typeof dialog.showModal === 'function') {
    const video = dialog.querySelector('video');
    const title = document.getElementById('player-title');
    const desc = document.getElementById('player-desc');
    let opener = null;
    document.querySelectorAll('[data-video]').forEach((btn) =>
      btn.addEventListener('click', () => {
        opener = btn;
        title.textContent = btn.dataset.title;
        desc.textContent = btn.dataset.desc || '';
        video.poster = btn.dataset.poster || '';
        video.src = btn.dataset.video;
        dialog.showModal();
        video.play().catch(() => {});
      }),
    );
    const close = () => dialog.close();
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener('close', () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (opener) opener.focus();
    });
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
      } catch (err) {
        setStatus('error', err.message || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
