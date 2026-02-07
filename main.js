/* ============================
   DMC Voucher Wallet — main.js
   ============================ */

(function () {
  'use strict';

  // -------------------------
  // NAV SCROLL STATE
  // -------------------------
  const nav = document.getElementById('nav');
  let lastScrollY = 0;

  function onScroll() {
    const y = window.scrollY;
    if (y > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScrollY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // -------------------------
  // SMOOTH ANCHOR SCROLL
  // -------------------------
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      var offset = 80;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  // -------------------------
  // SCROLL-TRIGGERED ANIMATIONS
  // -------------------------
  var animElements = document.querySelectorAll('.anim, .anim-fade');
  var observed = new Set();

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !observed.has(entry.target)) {
        observed.add(entry.target);
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        var animType = el.getAttribute('data-anim') || 'fade-up';

        setTimeout(function () {
          animateIn(el, animType);
        }, delay);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  animElements.forEach(function (el) {
    observer.observe(el);
  });

  function animateIn(el, type) {
    var params = {
      targets: el,
      duration: 800,
      easing: 'easeOutCubic',
      opacity: [0, 1]
    };

    if (type === 'fade-up') {
      params.translateY = [32, 0];
    } else if (type === 'scale-in') {
      params.scale = [0.9, 1];
    }

    anime(params);

    el.classList.add('is-visible');
  }

  // -------------------------
  // HERO ORB ANIMATION
  // -------------------------
  anime({
    targets: '.hero-orb-1',
    translateX: [0, 40],
    translateY: [0, -30],
    scale: [1, 1.08],
    duration: 8000,
    easing: 'easeInOutSine',
    direction: 'alternate',
    loop: true
  });

  anime({
    targets: '.hero-orb-2',
    translateX: [0, -30],
    translateY: [0, 25],
    scale: [1, 1.05],
    duration: 10000,
    easing: 'easeInOutSine',
    direction: 'alternate',
    loop: true
  });

  anime({
    targets: '.hero-orb-3',
    translateX: [0, 20],
    translateY: [0, -40],
    scale: [1, 1.1],
    duration: 12000,
    easing: 'easeInOutSine',
    direction: 'alternate',
    loop: true
  });

  // -------------------------
  // IMMERSIVE EXPANDING RINGS
  // -------------------------
  var immersiveSection = document.getElementById('immersive');
  var ringsAnimated = false;

  var ringObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !ringsAnimated) {
        ringsAnimated = true;
        animateRings();
        animateCounters();
      }
    });
  }, { threshold: 0.3 });

  if (immersiveSection) {
    ringObserver.observe(immersiveSection);
  }

  function animateRings() {
    anime({
      targets: '.immersive-shape-1',
      scale: [0.6, 1],
      opacity: [0, 0.08],
      duration: 1200,
      easing: 'easeOutCubic',
      delay: 0
    });

    anime({
      targets: '.immersive-shape-2',
      scale: [0.5, 1],
      opacity: [0, 0.06],
      duration: 1400,
      easing: 'easeOutCubic',
      delay: 150
    });

    anime({
      targets: '.immersive-shape-3',
      scale: [0.4, 1],
      opacity: [0, 0.04],
      duration: 1600,
      easing: 'easeOutCubic',
      delay: 300
    });

    anime({
      targets: '.immersive-shape-4',
      scale: [0.3, 1],
      opacity: [0, 0.03],
      duration: 1800,
      easing: 'easeOutCubic',
      delay: 450
    });

    // Continuous subtle pulse
    setTimeout(function () {
      anime({
        targets: '.immersive-shape',
        scale: function (el, i) {
          return [1, 1 + 0.03 * (i + 1)];
        },
        duration: 4000,
        easing: 'easeInOutSine',
        direction: 'alternate',
        loop: true
      });
    }, 2000);
  }

  // -------------------------
  // COUNTER ANIMATION
  // -------------------------
  function animateCounters() {
    var counters = document.querySelectorAll('.immersive-stat-number[data-count]');
    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var obj = { val: 0 };
      anime({
        targets: obj,
        val: target,
        duration: 1400,
        easing: 'easeOutExpo',
        round: 1,
        delay: 400,
        update: function () {
          el.textContent = obj.val;
        }
      });
    });
  }

  // -------------------------
  // HERO ENTRANCE SEQUENCE
  // -------------------------
  // Wait for page load to trigger hero animations
  window.addEventListener('load', function () {
    var heroElements = document.querySelectorAll('.hero .anim-fade');
    heroElements.forEach(function (el) {
      var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
      setTimeout(function () {
        animateIn(el, 'fade-up');
      }, delay + 200);
    });
  });

  // -------------------------
  // BUTTON HOVER RIPPLE
  // -------------------------
  document.querySelectorAll('.btn-primary').forEach(function (btn) {
    btn.addEventListener('mouseenter', function () {
      anime({
        targets: this,
        boxShadow: [
          '0 0 0 0 rgba(108, 99, 255, 0), 0 2px 8px rgba(0,0,0,0.2)',
          '0 0 28px rgba(108, 99, 255, 0.3), 0 4px 16px rgba(0,0,0,0.3)'
        ],
        duration: 400,
        easing: 'easeOutCubic'
      });
    });

    btn.addEventListener('mouseleave', function () {
      anime({
        targets: this,
        boxShadow: '0 0 0 0 rgba(108, 99, 255, 0), 0 2px 8px rgba(0,0,0,0.2)',
        duration: 500,
        easing: 'easeOutCubic'
      });
    });
  });

  // -------------------------
  // PROBLEM CARD HOVER GLOW
  // -------------------------
  document.querySelectorAll('.problem-card, .feature-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      card.style.background =
        'radial-gradient(circle 200px at ' + x + 'px ' + y + 'px, ' +
        'rgba(108, 99, 255, 0.04), transparent), var(--color-bg-card)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.background = '';
    });
  });

})();
