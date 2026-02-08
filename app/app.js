(function () {
  'use strict';

  // =============================
  // Init - ALWAYS clear booking code so travelers must re-enter
  // =============================
  localStorage.removeItem('bookingCode');
  var bookingCode = null; // Force activation screen
  var vouchers = [];
  var selectedVoucher = null;

  // =============================
  // STATE
  // =============================
  var currentScreen = 'activation';
  var currentFilter = 'all';
  var listScrollPos = 0;

  // =============================
  // DOM REFS
  // =============================
  var screens = {
    activation: document.getElementById('screen-activation'),
    list: document.getElementById('screen-list'),
    detail: document.getElementById('screen-detail'),
    redemption: document.getElementById('screen-redemption')
  };

  var activationForm = document.getElementById('activation-form');
  var bookingInput = document.getElementById('booking-input');
  var filterBar = document.getElementById('filter-bar');
  var voucherListEl = document.getElementById('voucher-list');
  var detailBack = document.getElementById('detail-back');
  var termsToggle = document.getElementById('terms-toggle');
  var termsBody = document.getElementById('terms-body');
  var useVoucherBtn = document.getElementById('use-voucher-btn');
  var doneBtn = document.getElementById('done-btn');

  // =============================
  // SCREEN ROUTER
  // =============================
  function navigateTo(target, direction) {
    if (target === currentScreen) return;

    var from = screens[currentScreen];
    var to = screens[target];

    // Save list scroll position
    if (currentScreen === 'list') {
      listScrollPos = screens.list.scrollTop;
    }

    // Determine animation based on direction
    var animConfig = getTransitionConfig(currentScreen, target, direction);

    // Set up screens for transition
    from.classList.add('screen--leaving');
    from.classList.remove('screen--active');
    to.classList.add('screen--entering');
    to.style.display = 'flex';

    // Initial position of incoming screen
    anime.set(to, animConfig.enterFrom);

    // Animate out
    anime({
      targets: from,
      ...animConfig.leaveAnim,
      duration: 350,
      easing: 'easeInOutCubic',
      complete: function () {
        from.classList.remove('screen--leaving');
        from.style.display = 'none';
        from.style.transform = '';
        from.style.opacity = '';
      }
    });

    // Animate in
    anime({
      targets: to,
      ...animConfig.enterAnim,
      duration: 350,
      easing: 'easeInOutCubic',
      complete: function () {
        to.classList.remove('screen--entering');
        to.classList.add('screen--active');
        to.style.transform = '';
        to.style.opacity = '';

        // Restore list scroll position
        if (target === 'list') {
          screens.list.scrollTop = listScrollPos;
        }

        // Run post-transition effects
        if (target === 'redemption') {
          startRedemptionGlow();
        }
      }
    });

    currentScreen = target;
  }

  function getTransitionConfig(from, to, direction) {
    // Activation → List: fade + scale up
    if (from === 'activation' && to === 'list') {
      return {
        enterFrom: { opacity: 0, scale: 0.92 },
        leaveAnim: { opacity: 0, scale: 1.05 },
        enterAnim: { opacity: 1, scale: 1 }
      };
    }

    // List → Detail: slide left
    if (from === 'list' && to === 'detail') {
      return {
        enterFrom: { translateX: '100%', opacity: 0.5 },
        leaveAnim: { translateX: '-30%', opacity: 0.5 },
        enterAnim: { translateX: '0%', opacity: 1 }
      };
    }

    // Detail → List (back): slide right
    if (from === 'detail' && to === 'list') {
      return {
        enterFrom: { translateX: '-30%', opacity: 0.5 },
        leaveAnim: { translateX: '100%', opacity: 0.5 },
        enterAnim: { translateX: '0%', opacity: 1 }
      };
    }

    // Detail → Redemption: slide up
    if (from === 'detail' && to === 'redemption') {
      return {
        enterFrom: { translateY: '100%', opacity: 0.5 },
        leaveAnim: { translateY: '-20%', opacity: 0 },
        enterAnim: { translateY: '0%', opacity: 1 }
      };
    }

    // Redemption → List: slide down + fade
    if (from === 'redemption' && to === 'list') {
      return {
        enterFrom: { opacity: 0, scale: 0.95 },
        leaveAnim: { translateY: '100%', opacity: 0 },
        enterAnim: { opacity: 1, scale: 1 }
      };
    }

    // Default: simple fade
    return {
      enterFrom: { opacity: 0 },
      leaveAnim: { opacity: 0 },
      enterAnim: { opacity: 1 }
    };
  }

  // =============================
  // RENDER VOUCHER LIST
  // =============================
  function renderVoucherList() {
    var filtered = currentFilter === 'all'
      ? vouchers
      : vouchers.filter(function (v) { return v.category === currentFilter; });

    if (filtered.length === 0) {
      voucherListEl.innerHTML = '<div class="voucher-list-empty">No vouchers in this category.</div>';
      return;
    }

    voucherListEl.innerHTML = filtered.map(function (v) {
      var bgStyle = v.image_url ? 'style="background-image: url(\'' + v.image_url + '\')"' : '';
      var logoImg = v.logo_url ? '<img src="' + v.logo_url + '" class="voucher-logo-overlay">' : '';
      var redeemedBadge = v.is_redeemed ? '<div class="redeemed-badge">USED</div>' : '';
      var redeemedClass = v.is_redeemed ? ' voucher-card--redeemed' : '';

      return (
        '<div class="voucher-card' + redeemedClass + '" data-id="' + v.id + '" ' + bgStyle + '>' +
        redeemedBadge +
        logoImg +
        '<div class="voucher-card-top">' +
        '<span class="voucher-card-venue">' + escapeHtml(v.venue) + '</span>' +
        '<span class="voucher-card-discount">' + escapeHtml(v.discount) + '</span>' +
        '</div>' +
        '<p class="voucher-card-desc">' + escapeHtml(v.shortDesc) + '</p>' +
        '<div class="voucher-card-footer">' +
        '<span class="voucher-card-tag" data-cat="' + v.category + '">' + escapeHtml(v.categoryLabel) + '</span>' +
        '<span class="voucher-card-expiry">Until ' + escapeHtml(v.expiry) + '</span>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    // Bind card clicks
    voucherListEl.querySelectorAll('.voucher-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'), 10);
        openVoucherDetail(id);
      });
    });
  }

  // =============================
  // VOUCHER DETAIL
  // =============================
  function openVoucherDetail(id) {
    var voucher = vouchers.find(function (v) { return v.id === id; });
    if (!voucher) return;

    selectedVoucher = voucher;

    document.getElementById('detail-category').textContent = voucher.categoryLabel;
    document.getElementById('detail-category').setAttribute('data-cat', voucher.category);
    document.getElementById('detail-venue').textContent = voucher.venue;
    document.getElementById('detail-discount').textContent = voucher.discount;
    document.getElementById('detail-description').textContent = voucher.fullDesc;
    document.getElementById('detail-terms-text').textContent = voucher.terms;
    document.getElementById('detail-location').textContent = voucher.location;
    document.getElementById('detail-expiry').textContent = 'Valid until ' + voucher.expiry;

    // Reset terms collapse
    termsToggle.classList.remove('open');
    termsBody.classList.remove('open');

    // Handle Redeemed State
    var useBtn = document.getElementById('use-voucher-btn');
    if (voucher.is_redeemed) {
      useBtn.disabled = true;
      useBtn.textContent = 'Voucher Used';
      useBtn.classList.add('btn-disabled');
    } else {
      useBtn.disabled = false;
      useBtn.textContent = 'Use Voucher';
      useBtn.classList.remove('btn-disabled');
    }

    navigateTo('detail');
  }

  // =============================
  // REDEMPTION
  // =============================
  var glowAnimation = null;

  function startRedemptionGlow() {
    var card = document.getElementById('redemption-card');
    card.classList.add('glow');

    // Pulsing glow animation
    if (glowAnimation) glowAnimation.pause();
    glowAnimation = anime({
      targets: card,
      boxShadow: [
        '0 0 40px rgba(0, 201, 167, 0.2), 0 0 80px rgba(0, 201, 167, 0.1)',
        '0 0 60px rgba(0, 201, 167, 0.35), 0 0 120px rgba(0, 201, 167, 0.15)',
        '0 0 40px rgba(0, 201, 167, 0.2), 0 0 80px rgba(0, 201, 167, 0.1)'
      ],
      duration: 2000,
      easing: 'easeInOutSine',
      loop: true
    });

    // Checkmark entrance animation
    anime({
      targets: '.redemption-icon svg circle',
      strokeDashoffset: [anime.setDashoffset, 0],
      duration: 800,
      easing: 'easeOutCubic'
    });

    anime({
      targets: '.redemption-icon svg path',
      strokeDashoffset: [anime.setDashoffset, 0],
      duration: 600,
      delay: 400,
      easing: 'easeOutCubic'
    });
  }

  function stopRedemptionGlow() {
    var card = document.getElementById('redemption-card');
    card.classList.remove('glow');
    if (glowAnimation) {
      glowAnimation.pause();
      glowAnimation = null;
    }
    card.style.boxShadow = '';
  }

  // =============================
  // EVENT HANDLERS
  // =============================

  // Activation form
  activationForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = bookingInput.value.trim();
    if (!val) {
      bookingInput.focus();
      // Shake animation
      anime({
        targets: bookingInput,
        translateX: [0, -8, 8, -6, 6, -3, 3, 0],
        duration: 500,
        easing: 'easeInOutSine'
      });
      return;
    }
    // Validate via API
    fetch('/api/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: val })
    })
      .then(response => response.json())
      .then(data => {
        if (data.valid) {
          // Save code and load vouchers
          // alert('Validation Successful! Loading vouchers...');
          localStorage.setItem('bookingCode', val);
          loadVouchers(val);
        } else {
          // alert('Validation Failed: Invalid Code');
          bookingInput.classList.add('error');
          // Shake animation
          anime({
            targets: bookingInput,
            translateX: [0, -8, 8, -6, 6, -3, 3, 0],
            duration: 500,
            easing: 'easeInOutSine'
          });
        }
      })
      .catch(error => console.error('Error validating code:', error));
  });

  // Filter chips
  filterBar.addEventListener('click', function (e) {
    var chip = e.target.closest('.filter-chip');
    if (!chip) return;

    var filter = chip.getAttribute('data-filter');
    if (filter === currentFilter) return;

    currentFilter = filter;

    // Update active chip
    filterBar.querySelectorAll('.filter-chip').forEach(function (c) {
      c.classList.remove('filter-chip--active');
    });
    chip.classList.add('filter-chip--active');

    renderVoucherList();
  });

  // Detail back button
  detailBack.addEventListener('click', function () {
    navigateTo('list', 'back');
  });

  // Terms toggle
  termsToggle.addEventListener('click', function () {
    this.classList.toggle('open');
    termsBody.classList.toggle('open');
  });

  // Use voucher button
  // Use voucher button (Redeem with PIN)
  useVoucherBtn.addEventListener('click', function () {
    if (!selectedVoucher) return;
    openRedeemModal(selectedVoucher.id);
  });

  // Done button
  doneBtn.addEventListener('click', function () {
    stopRedemptionGlow();
    navigateTo('list');
  });

  // =============================
  // ENTRANCE ANIMATION
  // =============================
  window.addEventListener('load', function () {
    anime({
      targets: '.activation-logo',
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 200
    });

    anime({
      targets: '.activation-title',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 350
    });

    anime({
      targets: '.activation-sub',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 450
    });

    anime({
      targets: '.activation-form',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 550
    });

    anime({
      targets: '.activation-note',
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 700
    });
  });

  // =============================
  // REDEMPTION LOGIC
  // =============================
  window.currentVoucherId = null;
  const pinInput = document.getElementById('pin-input');
  const pinDots = document.querySelectorAll('.pin-dot');

  window.openRedeemModal = function (voucherId) {
    window.currentVoucherId = voucherId;
    document.getElementById('modal-redeem').classList.add('active');
    pinInput.value = '';
    updatePinDisplay();
    pinInput.focus();
  };

  window.closeRedeemModal = function () {
    document.getElementById('modal-redeem').classList.remove('active');
    window.currentVoucherId = null;
  };

  window.closeSuccessModal = function () {
    document.getElementById('modal-success').classList.remove('active');
    // Refresh vouchers to update redemption status
    const code = localStorage.getItem('bookingCode');
    if (code) loadVouchers(code);
    navigateTo('list');
  };

  pinInput.addEventListener('input', function (e) {
    updatePinDisplay();
    if (this.value.length === 4) {
      submitRedemption(this.value);
    }
  });

  function updatePinDisplay() {
    const val = pinInput.value;
    pinDots.forEach((dot, i) => {
      if (i < val.length) dot.classList.add('filled');
      else dot.classList.remove('filled');
    });
  }

  function submitRedemption(pin) {
    const bookingCode = localStorage.getItem('bookingCode');
    fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher_id: window.currentVoucherId,
        booking_code: bookingCode,
        pin: pin
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeRedeemModal();
          document.getElementById('modal-success').classList.add('active');
        } else {
          alert(data.error || 'Invalid PIN');
          pinInput.value = '';
          updatePinDisplay();
        }
      })
      .catch(err => alert('Network error'));
  }

  // =============================
  // HELPERS
  // =============================
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // =============================
  // INIT LOGIC
  // =============================
  function loadVouchers(code) {
    // Fetch vouchers visible for this booking code
    console.log('Fetching vouchers for', code);
    fetch('/api/vouchers?booking_code=' + code)
      .then(function (response) {
        if (response.status === 401) {
          // If unauthorized (invalid code or session), go to activation
          console.warn('Unauthorized booking code');
          localStorage.removeItem('bookingCode');
          navigateTo('activation');
          return null;
        }
        return response.json();
      })
      .then(function (data) {
        if (!data) return;

        console.log('Vouchers loaded:', data);
        vouchers = data.data || [];
        renderVoucherList();

        // Use history state to restore view
        if (window.location.hash === '#detail' && window.currentVoucherId) {
          openVoucherDetail(window.currentVoucherId);
        } else {
          navigateTo('list');
        }
      })
      .catch(function (err) { console.error(err); });
  }

  if (bookingCode) {
    loadVouchers(bookingCode);
  } else {
    // Small delay to ensure transitions work if invoked immediately
    setTimeout(function () {
      navigateTo('activation');
    }, 50);
  }

})();
