/* ============================================================
   THE HUNGRY VIDEOGRAPHER — shared interactions
   ============================================================ */

/* ============ PRELOADER (home only) ============ */
const loader = document.getElementById('loader');
if (loader) {
  const pct = document.getElementById('pct');
  let p = 0;
  document.body.style.overflow = 'hidden';
  const pint = setInterval(() => {
    p = Math.min(100, p + Math.random() * 22);
    pct.textContent = 'LOADING ' + Math.floor(p) + '%';
    if (p >= 100) {
      clearInterval(pint);
      setTimeout(() => { loader.classList.add('done'); document.body.style.overflow = 'auto'; }, 350);
    }
  }, 160);
}

/* ============ CURSOR ============ */
const cur = document.getElementById('cursor');
if (cur) {
  let mx = 0, my = 0, cx = 0, cy = 0;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function loop() {
    cx += (mx - cx) * .2; cy += (my - cy) * .2;
    cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,.card,.svc,.post-card').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('big'));
    el.addEventListener('mouseleave', () => cur.classList.remove('big'));
  });
}

/* ============ NAV ============ */
const nav = document.getElementById('nav');
if (nav) addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

const burger = document.getElementById('burger');
const mmenu = document.getElementById('mmenu');
if (burger && mmenu) {
  burger.addEventListener('click', () => { burger.classList.toggle('open'); mmenu.classList.toggle('open'); });
  mmenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open'); mmenu.classList.remove('open');
  }));
}

/* highlight current page in nav */
document.querySelectorAll('.nav-links a').forEach(a => {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (a.getAttribute('href') === page) a.classList.add('active');
});

/* ============ REVEAL ON SCROLL ============ */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ============ COUNTERS (commas + decimals) ============ */
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, target = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
  let n = 0; const inc = target / 55;
  const t = setInterval(() => {
    n = Math.min(target, n + inc);
    el.textContent = dec ? n.toFixed(dec) : Math.floor(n).toLocaleString('en-US');
    if (n >= target) { el.textContent = dec ? target.toFixed(dec) : target.toLocaleString('en-US'); clearInterval(t); }
  }, 24);
  cio.unobserve(el);
}), { threshold: .5 });
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

/* ============ HERO ROTATOR (home only) ============ */
const rot = document.getElementById('rotator');
if (rot) {
  const roles = ['VIDEO EDITOR', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'GRAPHIC DESIGNER', 'ONLINE SAFETY TRAINER', 'DIGITAL STRATEGIST'];
  let ri = 0, ci = 0, del = false;
  (function type() {
    const word = roles[ri];
    rot.textContent = word.slice(0, ci);
    if (!del) {
      if (ci < word.length) { ci++; setTimeout(type, 55); }
      else setTimeout(() => { del = true; type(); }, 1500);
    } else {
      if (ci > 0) { ci--; setTimeout(type, 26); }
      else { del = false; ri = (ri + 1) % roles.length; setTimeout(type, 240); }
    }
  })();
}

/* ============ BAND PARALLAX ============ */
const bandImg = document.querySelector('.band img');
if (bandImg) {
  addEventListener('scroll', () => {
    const r = bandImg.parentElement.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) {
      bandImg.style.transform = 'scale(1.18) translateY(' + ((r.top - innerHeight / 2) * .08) + 'px)';
    }
  }, { passive: true });
}

/* ============ TESTIMONIAL SLIDER (home only) ============ */
const tnav = document.getElementById('tnav');
if (tnav) {
  const slides = document.querySelectorAll('.slide');
  const dots = tnav.querySelectorAll('button');
  let ti = 0;
  const show = i => {
    slides.forEach((s, k) => s.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    ti = i;
  };
  dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
  setInterval(() => show((ti + 1) % slides.length), 6000);
}

/* ============ MARQUEE seamless loop (home only) ============ */
const mtrack = document.getElementById('mtrack');
if (mtrack) mtrack.innerHTML += mtrack.innerHTML;

/* ============ FOOTER YEAR ============ */
const yr = document.getElementById('year');
if (yr) yr.textContent = new Date().getFullYear();

/* ============ LOGIN → ADMIN SWAP ============ */
document.querySelectorAll('.login-link').forEach(a => {
  if (sessionStorage.getItem('thv_admin_ok') === '1') { a.textContent = 'Admin'; a.href = 'admin.html'; }
});
