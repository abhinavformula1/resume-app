(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     GUIDED ASSISTANT — state machine
  ═══════════════════════════════════════════════════════════ */

  var SLOTS = [
    'Mon 28 Apr · 10:00 AM IST',
    'Mon 28 Apr · 3:00 PM IST',
    'Tue 29 Apr · 11:00 AM IST',
    'Wed 30 Apr · 2:00 PM IST',
    'Thu 1 May · 4:00 PM IST',
  ];

  var TOTAL_STEPS = 7;

  var state = {
    step: 0,
    answers: { name: '', email: '', company: '', role: '', contractType: '', urgency: '', slot: '' },
  };

  var STEPS = [
    {
      key: 'name',
      bot: function () { return t().botGreeting; },
      inputType: 'text',
      placeholder: function () { return t().namePlaceholder; },
      validate: function (v) { return v.trim().length > 0 ? null : t().errors.name; },
    },
    {
      key: 'email',
      bot: function (a) { return t().botEmail(a.name.split(' ')[0]); },
      inputType: 'text',
      placeholder: function () { return t().emailPlaceholder; },
      validate: function (v) {
        if (!v.trim()) return t().errors.emailRequired;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : t().errors.emailInvalid;
      },
    },
    {
      key: 'company',
      bot: function () { return t().botCompany; },
      inputType: 'text',
      placeholder: function () { return t().companyPlaceholder; },
      validate: function (v) { return v.trim().length > 0 ? null : t().errors.company; },
    },
    {
      key: 'role',
      bot: function () { return t().botRole; },
      inputType: 'choice',
      choices: function () { return t().choices.roles; },
    },
    {
      key: 'contractType',
      bot: function () { return t().botContract; },
      inputType: 'choice',
      choices: function () { return t().choices.contracts; },
    },
    {
      key: 'urgency',
      bot: function () { return t().botUrgency; },
      inputType: 'choice',
      choices: function () { return t().choices.urgency; },
    },
    {
      key: 'slot',
      bot: function () { return t().botSlot; },
      inputType: 'slots',
    },
  ];

  /* ── Language toggle ── */
  var LANG = {
    en: {
      teaserText: 'Hi! Looking to hire a Salesforce engineer?',
      teaserCta: "Let's talk",
      botGreeting: "Hi there! I'm Abhinav's assistant. To schedule a quick chat, I'll need a few details. What's your name?",
      botEmail: function (name) { return 'Nice to meet you, ' + name + "! What's your work email?"; },
      botCompany: 'Which company are you from?',
      botRole: 'What kind of role are you looking to fill?',
      botContract: 'Is this a permanent or contract position?',
      botUrgency: 'How soon are you looking to hire?',
      botSlot: 'Great! Pick a time slot that works for you.',
      botConfirm: "Perfect! I've noted everything. Click \"Confirm & Schedule\" to lock in your slot.",
      botDone: function (name, email) { return 'All set, ' + name + "! Your slot is confirmed. I'll send a calendar invite to " + email + '. Looking forward to speaking!'; },
      choices: {
        roles: ['SF Developer', 'SF Architect', 'Tech Lead', 'Consulting', 'Other'],
        contracts: ['Permanent', 'Contract', 'Freelance'],
        urgency: ['Immediately', 'Within 1 month', '3+ months'],
      },
      confirmBtn: 'Confirm & Schedule',
      confirmBtnBusy: 'Scheduling\u2026',
      closeBtn: 'Close',
      namePlaceholder: 'Your full name',
      emailPlaceholder: 'your@company.com',
      companyPlaceholder: 'Company name',
      continueBtn: 'Continue',
      errors: {
        name: 'Please enter your name.',
        emailRequired: 'Email is required.',
        emailInvalid: 'Enter a valid email address.',
        company: 'Please enter your company.',
        network: 'Network error. Please try again.',
        generic: 'Something went wrong. Please try again.',
      },
    },
    fr: {
      teaserText: 'Bonjour! Vous recrutez un ingénieur Salesforce?',
      teaserCta: 'Discutons',
      botGreeting: "Bonjour! Je suis l'assistant d'Abhinav. Pour planifier un échange, j'ai besoin de quelques informations. Quel est votre nom?",
      botEmail: function (name) { return 'Ravi de vous rencontrer, ' + name + '! Quelle est votre adresse email professionnelle?'; },
      botCompany: 'De quelle entreprise venez-vous?',
      botRole: 'Quel type de poste souhaitez-vous pourvoir?',
      botContract: "S'agit-il d'un poste permanent ou en contrat?",
      botUrgency: 'Dans quel délai souhaitez-vous recruter?',
      botSlot: 'Parfait! Choisissez un créneau qui vous convient.',
      botConfirm: 'Parfait! Cliquez sur "Confirmer" pour valider votre créneau.',
      botDone: function (name, email) { return 'Tout est prêt, ' + name + '! Votre créneau est confirmé. Je vous enverrai une invitation à ' + email + '. À bientôt!'; },
      choices: {
        roles: ['Développeur SF', 'Architecte SF', 'Tech Lead', 'Conseil', 'Autre'],
        contracts: ['CDI', 'CDD / Contrat', 'Freelance'],
        urgency: ['Immédiatement', 'Dans 1 mois', '3 mois et plus'],
      },
      confirmBtn: 'Confirmer le créneau',
      confirmBtnBusy: 'Envoi\u2026',
      closeBtn: 'Fermer',
      namePlaceholder: 'Votre nom complet',
      emailPlaceholder: 'vous@entreprise.com',
      companyPlaceholder: "Nom de l'entreprise",
      continueBtn: 'Continuer',
      errors: {
        name: 'Veuillez entrer votre nom.',
        emailRequired: "L'email est requis.",
        emailInvalid: 'Entrez une adresse email valide.',
        company: "Veuillez entrer le nom de l'entreprise.",
        network: 'Erreur réseau. Veuillez réessayer.',
        generic: "Une erreur s'est produite. Veuillez réessayer.",
      },
    },
  };

  var currentLang = 'en';
  function t() { return LANG[currentLang]; }

  function setLang(lang) {
    currentLang = lang;
    document.getElementById('langEN').classList.toggle('lang-active', lang === 'en');
    document.getElementById('langFR').classList.toggle('lang-active', lang === 'fr');
    document.querySelector('.chat-teaser-text').textContent = t().teaserText;
    document.querySelector('.chat-teaser-cta').textContent = t().teaserCta;
  }
  window.setLang = setLang;

  /* ── Chat Launcher ── */
  var teaserShown = false;

  setTimeout(function () {
    var launcher = document.getElementById('chatLauncher');
    launcher.removeAttribute('hidden');
    // Show teaser bubble after launcher appears
    setTimeout(function () {
      if (!teaserShown) showTeaser();
    }, 600);
  }, 5000);

  function showTeaser() {
    teaserShown = true;
    var teaser = document.getElementById('chatTeaser');
    teaser.removeAttribute('hidden');
    var openIcon  = document.querySelector('.chat-fab-icon-open');
    var closeIcon = document.querySelector('.chat-fab-icon-close');
    openIcon.style.display  = 'none';
    closeIcon.style.display = '';
  }

  function hideTeaser() {
    document.getElementById('chatTeaser').setAttribute('hidden', '');
    var openIcon  = document.querySelector('.chat-fab-icon-open');
    var closeIcon = document.querySelector('.chat-fab-icon-close');
    openIcon.style.display  = '';
    closeIcon.style.display = 'none';
  }

  function toggleChatTeaser() {
    var teaser = document.getElementById('chatTeaser');
    if (teaser.hasAttribute('hidden')) {
      showTeaser();
    } else {
      hideTeaser();
    }
  }
  window.toggleChatTeaser = toggleChatTeaser;

  document.getElementById('chatTeaserClose').addEventListener('click', function (e) {
    e.stopPropagation();
    hideTeaser();
  });

  function openAssistant() {
    state.step = 0;
    state.answers = { name: '', email: '', company: '', role: '', contractType: '', urgency: '', slot: '' };
    document.getElementById('gaMessages').innerHTML = '';
    document.getElementById('assistantOverlay').removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    hideTeaser();
    renderStep();
  }
  window.openAssistant = openAssistant;

  function closeAssistant() {
    document.getElementById('assistantOverlay').setAttribute('hidden', '');
    document.body.style.overflow = '';
  }
  window.closeAssistant = closeAssistant;

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAssistant();
  });

  document.getElementById('assistantOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeAssistant();
  });

  function updateProgress() {
    var pct = Math.round((state.step / TOTAL_STEPS) * 100);
    document.getElementById('gaProgressBar').style.width = pct + '%';
  }

  function renderStep() {
    updateProgress();
    if (state.step >= STEPS.length) { renderConfirm(); return; }
    var stepDef = STEPS[state.step];
    var botText = stepDef.bot(state.answers);
    addBotMessage(botText, function () {
      renderInputArea(stepDef);
    });
  }

  function addBotMessage(text, cb) {
    var msgs = document.getElementById('gaMessages');
    var wrap = document.createElement('div');
    wrap.className = 'ga-msg ga-msg-bot ga-msg-enter';
    wrap.innerHTML = '<div class="ga-bubble ga-bubble-bot">' + escHtml(text) + '</div>';
    msgs.appendChild(wrap);
    scrollMessages();
    setTimeout(function () { wrap.classList.remove('ga-msg-enter'); if (cb) cb(); }, 300);
  }

  function addUserMessage(text) {
    var msgs = document.getElementById('gaMessages');
    var wrap = document.createElement('div');
    wrap.className = 'ga-msg ga-msg-user ga-msg-enter';
    wrap.innerHTML = '<div class="ga-bubble ga-bubble-user">' + escHtml(text) + '</div>';
    msgs.appendChild(wrap);
    scrollMessages();
    setTimeout(function () { wrap.classList.remove('ga-msg-enter'); }, 300);
  }

  function renderInputArea(stepDef) {
    var area = document.getElementById('gaInputArea');
    area.innerHTML = '';

    if (stepDef.inputType === 'text') {
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'ga-text-input';
      inp.placeholder = stepDef.placeholder ? stepDef.placeholder() : '';
      var err = document.createElement('div');
      err.className = 'ga-input-err';
      var btn = document.createElement('button');
      btn.className = 'ga-send-btn';
      btn.textContent = t().continueBtn;
      btn.onclick = function () {
        var val = inp.value;
        var e = stepDef.validate(val);
        if (e) { err.textContent = e; return; }
        err.textContent = '';
        state.answers[stepDef.key] = val.trim();
        addUserMessage(val.trim());
        area.innerHTML = '';
        state.step++;
        setTimeout(renderStep, 400);
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.onclick(); });
      area.appendChild(inp);
      area.appendChild(err);
      area.appendChild(btn);
      setTimeout(function () { inp.focus(); }, 50);

    } else if (stepDef.inputType === 'choice') {
      var grid = document.createElement('div');
      grid.className = 'ga-choice-grid';
      stepDef.choices().forEach(function (choice) {
        var btn = document.createElement('button');
        btn.className = 'ga-choice-btn';
        btn.textContent = choice;
        btn.onclick = function () {
          state.answers[stepDef.key] = choice;
          addUserMessage(choice);
          area.innerHTML = '';
          state.step++;
          setTimeout(renderStep, 400);
        };
        grid.appendChild(btn);
      });
      area.appendChild(grid);

    } else if (stepDef.inputType === 'slots') {
      var slotGrid = document.createElement('div');
      slotGrid.className = 'ga-slot-grid';
      SLOTS.forEach(function (slot) {
        var btn = document.createElement('button');
        btn.className = 'ga-slot-btn';
        btn.textContent = slot;
        btn.onclick = function () {
          state.answers.slot = slot;
          addUserMessage(slot);
          area.innerHTML = '';
          state.step++;
          setTimeout(renderStep, 400);
        };
        slotGrid.appendChild(btn);
      });
      area.appendChild(slotGrid);
    }
  }

  function renderConfirm() {
    updateProgress();
    var a = state.answers;
    addBotMessage(
      t().botConfirm,
      function () {
        var area = document.getElementById('gaInputArea');
        area.innerHTML = '';

        var summary = document.createElement('div');
        summary.className = 'ga-confirm-summary';
        summary.innerHTML =
          '<div class="ga-summary-row"><span>Name</span><strong>' + escHtml(a.name) + '</strong></div>' +
          '<div class="ga-summary-row"><span>Email</span><strong>' + escHtml(a.email) + '</strong></div>' +
          '<div class="ga-summary-row"><span>Company</span><strong>' + escHtml(a.company) + '</strong></div>' +
          '<div class="ga-summary-row"><span>Role</span><strong>' + escHtml(a.role) + '</strong></div>' +
          '<div class="ga-summary-row"><span>Type</span><strong>' + escHtml(a.contractType) + '</strong></div>' +
          '<div class="ga-summary-row"><span>Urgency</span><strong>' + escHtml(a.urgency) + '</strong></div>' +
          '<div class="ga-summary-row"><span>Slot</span><strong>' + escHtml(a.slot) + '</strong></div>';

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'ga-send-btn';
        confirmBtn.textContent = t().confirmBtn;
        confirmBtn.onclick = function () { submitAssistant(confirmBtn); };

        var errDiv = document.createElement('div');
        errDiv.className = 'ga-input-err';
        errDiv.id = 'gaSubmitErr';

        area.appendChild(summary);
        area.appendChild(confirmBtn);
        area.appendChild(errDiv);
      }
    );
  }

  async function submitAssistant(btn) {
    btn.disabled = true;
    btn.textContent = t().confirmBtnBusy;
    document.getElementById('gaSubmitErr').textContent = '';

    var a = state.answers;
    try {
      var res = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: a.name,
          email: a.email,
          company: a.company,
          role: a.role,
          contractType: a.contractType,
          urgency: a.urgency,
          slot: a.slot,
        }),
      });
      var data = await res.json();
      if (res.ok && data.success) {
        renderDone();
      } else {
        document.getElementById('gaSubmitErr').textContent = (data && data.error) || 'Something went wrong. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Confirm & Schedule';
      }
    } catch (_) {
      document.getElementById('gaSubmitErr').textContent = 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Confirm & Schedule';
    }
  }

  function renderDone() {
    document.getElementById('gaProgressBar').style.width = '100%';
    var area = document.getElementById('gaInputArea');
    area.innerHTML = '';
    addBotMessage(
      t().botDone(state.answers.name.split(' ')[0], state.answers.email),
      function () {
        var done = document.createElement('div');
        done.className = 'ga-done';
        done.innerHTML =
          '<div class="ga-done-check">&#10003;</div>' +
          '<div class="ga-done-slot">' + escHtml(state.answers.slot) + '</div>' +
          '<button class="ga-done-close" onclick="closeAssistant()">' + t().closeBtn + '</button>';
        area.appendChild(done);
      }
    );
  }

  function scrollMessages() {
    var msgs = document.getElementById('gaMessages');
    msgs.scrollTop = msgs.scrollHeight;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════════════════
     LEGACY HIRE ME MODAL (kept as-is)
  ═══════════════════════════════════════════════════════════ */

  function closeHireMe() {
    const overlay = document.getElementById('hireMeOverlay');
    overlay.setAttribute('hidden', '');
    document.getElementById('hireMeForm').reset();
    ['hm-name', 'hm-email', 'hm-company'].forEach(function (id) {
      clearErr(id);
    });
    document.getElementById('hm-global-error').hidden = true;
    document.getElementById('hm-success').hidden = true;
    document.getElementById('hireMeForm').hidden = false;
    document.getElementById('hm-submit-btn').disabled = false;
  }
  window.closeHireMe = closeHireMe;

  // Close on overlay background click
  document.getElementById('hireMeOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeHireMe();
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeHireMe();
  });

  function setErr(fieldId, msg) {
    var input = document.getElementById(fieldId);
    var errEl = document.getElementById(fieldId + '-err');
    if (input) input.classList.add('hm-err');
    if (errEl) errEl.textContent = msg;
  }

  function clearErr(fieldId) {
    var input = document.getElementById(fieldId);
    var errEl = document.getElementById(fieldId + '-err');
    if (input) input.classList.remove('hm-err');
    if (errEl) errEl.textContent = '';
  }

  function validate() {
    var name    = document.getElementById('hm-name').value.trim();
    var email   = document.getElementById('hm-email').value.trim();
    var company = document.getElementById('hm-company').value.trim();
    var ok = true;
    ['hm-name', 'hm-email', 'hm-company'].forEach(clearErr);

    if (!name)    { setErr('hm-name', 'Full name is required.'); ok = false; }
    if (!email)   { setErr('hm-email', 'Work email is required.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr('hm-email', 'Enter a valid email address.'); ok = false;
    }
    if (!company) { setErr('hm-company', 'Company name is required.'); ok = false; }

    return ok;
  }

  document.getElementById('hireMeForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validate()) return;

    var btn       = document.getElementById('hm-submit-btn');
    var globalErr = document.getElementById('hm-global-error');
    btn.disabled = true;
    btn.textContent = 'Sending\u2026';
    globalErr.hidden = true;

    var payload = {
      name:    document.getElementById('hm-name').value.trim(),
      email:   document.getElementById('hm-email').value.trim(),
      company: document.getElementById('hm-company').value.trim(),
    };

    try {
      var res  = await fetch('/api/hire', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      var data = await res.json();
      if (res.ok && data.success) {
        document.getElementById('hireMeForm').hidden = true;
        document.getElementById('hm-success').hidden = false;
      } else {
        globalErr.textContent = (data && data.error) || t().errors.generic;
        globalErr.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    } catch (_) {
      globalErr.textContent = 'Network error. Please check your connection and try again.';
      globalErr.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  });
})();
