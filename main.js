/* ============================================================
   Calitoy Content — Front-end JS
   ============================================================ */
(function () {
  'use strict';

  var WORKER_URL = 'https://email-capture.calitoy.workers.dev';

  /* ---------- Mobile nav toggle ---------- */
  var hamburger = document.querySelector('.hamburger');
  var mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('active');
    });
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
      });
    });
  }

  /* ---------- Stripe checkout (shared Cloudflare Worker) ---------- */
  window.calitoyCheckout = function (priceId, productName) {
    if (!priceId) { alert('This plan is set up for manual onboarding. Please submit a brief and our team will follow up.'); return; }
    fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checkout',
        priceId: priceId,
        productName: productName,
        metadata: { company: 'calitoy-content' }
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.url) { window.location.href = data.url; }
        else { alert('Checkout error. Please try again.'); }
      })
      .catch(function () { alert('Network error. Please try again.'); });
  };

  /* ---------- Generic lead form handler ---------- */
  function bindLeadForm(formId, source, successMsg) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msgDiv = form.querySelector('.form-message') || document.getElementById('form-message');
      var submitBtn = form.querySelector('[type="submit"]');
      var originalText = submitBtn ? submitBtn.textContent : 'Submit';

      var data = { source: source };
      form.querySelectorAll('input, select, textarea').forEach(function (field) {
        if (!field.name) return;
        if (field.type === 'checkbox') {
          if (field.checked) {
            data[field.name] = data[field.name] ? data[field.name] + ', ' + field.value : field.value;
          }
        } else {
          data[field.name] = field.value;
        }
      });

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      if (msgDiv) { msgDiv.className = 'form-message'; msgDiv.style.display = 'none'; }

      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function () {
          if (msgDiv) { msgDiv.className = 'form-message success'; msgDiv.textContent = successMsg; msgDiv.style.display = 'block'; }
          form.reset();
          form.querySelectorAll('.checkbox-item.checked').forEach(function (c) { c.classList.remove('checked'); });
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
          if (msgDiv) { msgDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        })
        .catch(function () {
          if (msgDiv) { msgDiv.className = 'form-message error'; msgDiv.textContent = 'There was an error submitting your request. Please try again or email us directly.'; msgDiv.style.display = 'block'; }
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
        });
    });
  }

  bindLeadForm('client-form', 'calitoy-content-client', 'Thank you. Your content engine request has been received — our team will reach out within 24 hours.');
  bindLeadForm('agency-form', 'calitoy-content-agency', 'Thank you. Our partnerships team will contact you to set up your white-label agency account.');
  bindLeadForm('login-form', 'calitoy-content-login', 'The client portal is launching soon. We have added you to the early-access list.');

  /* ---------- Checkbox item styling ---------- */
  document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      cb.closest('.checkbox-item').classList.toggle('checked', cb.checked);
    });
  });

  /* ---------- Package option selection ---------- */
  var pkgInput = document.getElementById('selected_package');
  document.querySelectorAll('.pkg-option').forEach(function (opt) {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.pkg-option').forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      if (pkgInput) { pkgInput.value = opt.getAttribute('data-package') || ''; }
    });
  });

  /* ---------- Multi-step form (brief) ---------- */
  var msForm = document.getElementById('brief-form');
  if (msForm) {
    var steps = Array.prototype.slice.call(msForm.querySelectorAll('.form-step'));
    var stepperItems = Array.prototype.slice.call(document.querySelectorAll('.stepper-item'));
    var progressBar = document.querySelector('.stepper-progress');
    var current = 0;

    function showStep(idx) {
      steps.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
      stepperItems.forEach(function (it, i) {
        it.classList.toggle('active', i === idx);
        it.classList.toggle('done', i < idx);
      });
      if (progressBar && stepperItems.length > 1) {
        progressBar.style.width = (idx / (stepperItems.length - 1)) * 90 + '%';
      }
      window.scrollTo({ top: msForm.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
      current = idx;
    }

    function validateStep(idx) {
      var required = steps[idx].querySelectorAll('[required]');
      for (var i = 0; i < required.length; i++) {
        if (!required[i].value) {
          required[i].reportValidity();
          return false;
        }
      }
      return true;
    }

    msForm.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (validateStep(current) && current < steps.length - 1) { showStep(current + 1); }
      });
    });
    msForm.querySelectorAll('[data-prev]').forEach(function (btn) {
      btn.addEventListener('click', function () { if (current > 0) showStep(current - 1); });
    });

    msForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep(current)) return;
      var msgDiv = document.getElementById('form-message');
      var submitBtn = msForm.querySelector('[type="submit"]');
      var data = { source: 'calitoy-content-brief' };
      msForm.querySelectorAll('input, select, textarea').forEach(function (field) {
        if (!field.name) return;
        if (field.type === 'checkbox') {
          if (field.checked) { data[field.name] = data[field.name] ? data[field.name] + ', ' + field.value : field.value; }
        } else if (field.value) { data[field.name] = field.value; }
      });

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function () {
          if (msgDiv) { msgDiv.className = 'form-message success'; msgDiv.textContent = 'Your content brief has been submitted. Our team will review it and follow up within 24 hours to launch your content engine.'; msgDiv.style.display = 'block'; }
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Content Brief'; }
          if (msgDiv) { msgDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        })
        .catch(function () {
          if (msgDiv) { msgDiv.className = 'form-message error'; msgDiv.textContent = 'There was an error submitting your brief. Please try again.'; msgDiv.style.display = 'block'; }
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Content Brief'; }
        });
    });

    showStep(0);
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }
})();
