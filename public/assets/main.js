(function () {
  'use strict';

  /* ── Google Sign-In ──────────────────────────────────────────
     Paste your OAuth 2.0 Client ID here after creating it in
     GCP Console → APIs & Services → Credentials.
     Leave empty ('') to skip the Google sign-in pre-step.
  ─────────────────────────────────────────────────────────── */
  var GOOGLE_CLIENT_ID = '647206478056-rd95imm61c309o4tc5ekddgkmk50fdvp.apps.googleusercontent.com';

  // Persisted site-level profile (survives tab session)
  var siteProfile = (function () {
    try { return JSON.parse(sessionStorage.getItem('portfolio_profile') || 'null'); } catch (_) { return null; }
  }());

  function saveSiteProfile(p) {
    siteProfile = p;
    try { sessionStorage.setItem('portfolio_profile', JSON.stringify(p)); } catch (_) {}
  }

  function initGoogleSignIn() {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: false,
    });
    // Render button in welcome overlay if shown
    var welcomeBtn = document.getElementById('welcomeGoogleBtn');
    if (welcomeBtn && welcomeBtn.childElementCount === 0) {
      google.accounts.id.renderButton(welcomeBtn, {
        theme: 'filled_black', size: 'large', text: 'continue_with',
        shape: 'rectangular', width: 280,
      });
    }
  }

  function showWelcomeOverlay() {
    var overlay = document.getElementById('welcomeOverlay');
    if (!overlay) return;
    overlay.removeAttribute('hidden');
    // Render Google button once GIS loads
    if (window.google && window.google.accounts) {
      initGoogleSignIn();
    }
  }

  function hideWelcomeOverlay() {
    var overlay = document.getElementById('welcomeOverlay');
    if (overlay) overlay.setAttribute('hidden', '');
  }

  function handleGoogleSignIn(response) {
    try {
      var payload = JSON.parse(atob(response.credential.split('.')[1]));
      var profile = { name: payload.name, email: payload.email, picture: payload.picture };
      saveSiteProfile(profile);

      // Close welcome overlay if open
      hideWelcomeOverlay();

      // If chat is currently open, apply profile to it
      var chatOpen = !document.getElementById('assistantOverlay').hasAttribute('hidden');
      if (chatOpen) {
        applyGoogleProfileToChat(profile);
      }
    } catch (e) {
      hideWelcomeOverlay();
    }
  }

  function applyGoogleProfileToChat(profile) {
    state.googleProfile  = profile;
    state.answers.name   = profile.name;
    state.answers.email  = profile.email;
    state.showGoogleStep = false;

    var avatar = document.querySelector('.ga-avatar');
    if (avatar && profile.picture) {
      avatar.innerHTML = '<img src="' + profile.picture + '" alt="' + profile.name + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
      avatar.style.background = 'none';
      avatar.style.padding = '0';
    }
    var headerName = document.querySelector('.ga-header-name');
    if (headerName) headerName.textContent = profile.name.split(' ')[0] + "'s session";

    state.step = 2;
    document.getElementById('gaMessages').innerHTML = '';
    var first = profile.name.split(' ')[0];
    addBotMessage('Welcome, ' + first + '! I have your details from Google. Just a few more questions.');
    renderStep();
  }

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
    googleProfile: null,
    showGoogleStep: false,
    minimised: false,
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
    // Update teaser bubble text
    var teaserText = document.querySelector('.chat-teaser-text');
    var teaserCta  = document.querySelector('.chat-teaser-cta');
    if (teaserText) teaserText.textContent = t().teaserText;
    if (teaserCta)  teaserCta.textContent  = t().teaserCta;
    // If assistant is open, restart it in the new language
    var overlay = document.getElementById('assistantOverlay');
    if (!overlay.hasAttribute('hidden')) {
      openAssistant();
    }
  }
  window.setLang = setLang;

  /* ── Chat Launcher ── */
  var teaserShown = false;

  // Show welcome overlay on first visit (unless session already set)
  if (!siteProfile) {
    showWelcomeOverlay();
  }

  // Guest button on welcome overlay
  document.getElementById('welcomeGuestBtn').addEventListener('click', function () {
    saveSiteProfile({ type: 'guest' });
    hideWelcomeOverlay();
  });

  // Init Google Sign-In once the GIS library has loaded
  if (GOOGLE_CLIENT_ID) {
    var _gsiPoll = setInterval(function () {
      if (window.google && window.google.accounts) {
        clearInterval(_gsiPoll);
        initGoogleSignIn();
      }
    }, 200);
  }

  // ── Resizable chat panel ──────────────────────────────────────
  (function () {
    var handle  = document.getElementById('gaResizeHandle');
    var overlay = document.getElementById('assistantOverlay');
    if (!handle || !overlay) return;
    var dragging = false, startX, startW;

    handle.addEventListener('mousedown', function (e) {
      dragging = true;
      startX = e.clientX;
      startW = overlay.offsetWidth;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var newW = Math.min(680, Math.max(300, startW + (startX - e.clientX)));
      overlay.style.width = newW + 'px';
    });
    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    });
  }());

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
    if (state.minimised) {
      resumeAssistant();
      return;
    }
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
    state.answers  = { name: '', email: '', company: '', role: '', contractType: '', urgency: '', slot: '' };
    state.googleProfile  = null;
    state.showGoogleStep = false;
    // Reset avatar and header
    var avatar = document.querySelector('.ga-avatar');
    if (avatar) { avatar.innerHTML = 'AK'; avatar.style.background = ''; avatar.style.padding = ''; }
    var headerName = document.querySelector('.ga-header-name');
    if (headerName) headerName.textContent = "Abhinav's Assistant";
    document.getElementById('gaMessages').innerHTML = '';
    document.getElementById('assistantOverlay').removeAttribute('hidden');
    hideTeaser();
    // If already signed in from welcome screen, skip sign-in step
    if (siteProfile && siteProfile.type !== 'guest') {
      applyGoogleProfileToChat(siteProfile);
    } else {
      state.showGoogleStep = !!(GOOGLE_CLIENT_ID && window.google && (!siteProfile));
      renderStep();
    }
  }
  window.openAssistant = openAssistant;

  function closeAssistant() {
    state.minimised = false;
    document.getElementById('assistantOverlay').setAttribute('hidden', '');
  }
  window.closeAssistant = closeAssistant;

  function minimiseAssistant() {
    state.minimised = true;
    document.getElementById('assistantOverlay').setAttribute('hidden', '');
    var launcher = document.getElementById('chatLauncher');
    launcher.removeAttribute('hidden');
    document.querySelector('.chat-fab-icon-open').style.display = '';
    document.querySelector('.chat-fab-icon-close').style.display = 'none';
  }
  window.minimiseAssistant = minimiseAssistant;

  function resumeAssistant() {
    state.minimised = false;
    document.getElementById('assistantOverlay').removeAttribute('hidden');
    hideTeaser();
  }
  window.resumeAssistant = resumeAssistant;

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

  function renderGoogleStep() {
    var area = document.getElementById('gaInputArea');
    area.innerHTML = '';

    addBotMessage("Hi! To save time, you can sign in with Google — I'll auto-fill your name and email. Or continue as a guest and I'll ask you a couple of questions.");

    var wrap = document.createElement('div');
    wrap.className = 'ga-google-step';

    var googleBtnDiv = document.createElement('div');
    googleBtnDiv.id = 'googleSignInBtn';
    googleBtnDiv.className = 'ga-google-btn-wrap';

    var sep = document.createElement('div');
    sep.className = 'ga-google-sep';
    sep.textContent = 'or';

    var guestBtn = document.createElement('button');
    guestBtn.className = 'ga-guest-btn';
    guestBtn.textContent = 'Continue as Guest';
    guestBtn.onclick = function () {
      state.showGoogleStep = false;
      document.getElementById('gaMessages').innerHTML = '';
      renderStep();
    };

    wrap.appendChild(googleBtnDiv);
    wrap.appendChild(sep);
    wrap.appendChild(guestBtn);
    area.appendChild(wrap);

    if (window.google && window.google.accounts && GOOGLE_CLIENT_ID) {
      google.accounts.id.renderButton(googleBtnDiv, {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 260,
      });
    }
  }

  function renderStep() {
    if (state.showGoogleStep) { renderGoogleStep(); return; }
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

        var summaryBtn = document.createElement('button');
        summaryBtn.className = 'ga-summary-btn';
        summaryBtn.textContent = 'Get AI Summary';
        summaryBtn.onclick = function () { requestSummary(summaryBtn); };

        var summaryOut = document.createElement('div');
        summaryOut.className = 'ga-summary-out';
        summaryOut.id = 'gaSummaryOut';

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'ga-send-btn';
        confirmBtn.style.marginTop = '4px';
        confirmBtn.textContent = t().confirmBtn;
        confirmBtn.onclick = function () { submitAssistant(confirmBtn); };

        var errDiv = document.createElement('div');
        errDiv.className = 'ga-input-err';
        errDiv.id = 'gaSubmitErr';

        area.appendChild(summary);
        area.appendChild(summaryBtn);
        area.appendChild(summaryOut);
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

        var checkEl = document.createElement('div');
        checkEl.className = 'ga-done-check';
        checkEl.innerHTML = '&#10003;';

        var slotEl = document.createElement('div');
        slotEl.className = 'ga-done-slot';
        slotEl.textContent = state.answers.slot;

        var summaryBtn = document.createElement('button');
        summaryBtn.className = 'ga-summary-btn';
        summaryBtn.textContent = 'Get AI Summary';
        summaryBtn.onclick = function () { requestSummary(summaryBtn); };

        var summaryOut = document.createElement('div');
        summaryOut.className = 'ga-summary-out';
        summaryOut.id = 'gaSummaryOut';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'ga-done-close';
        closeBtn.textContent = t().closeBtn;
        closeBtn.onclick = closeAssistant;

        done.appendChild(checkEl);
        done.appendChild(slotEl);
        done.appendChild(summaryBtn);
        done.appendChild(summaryOut);
        done.appendChild(closeBtn);
        area.appendChild(done);
      }
    );
  }

  async function requestSummary(btn) {
    btn.disabled = true;
    btn.textContent = 'Generating\u2026';
    var out = document.getElementById('gaSummaryOut');
    out.textContent = '';
    out.className = 'ga-summary-out';

    try {
      var res = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         state.answers.name,
          company:      state.answers.company,
          role:         state.answers.role,
          contractType: state.answers.contractType,
          urgency:      state.answers.urgency,
          slot:         state.answers.slot,
        }),
      });
      var data = await res.json();
      if (res.ok && data.summary) {
        out.textContent = data.summary;
        out.className = 'ga-summary-out ga-summary-ready';
        btn.textContent = 'Copy Summary';
        btn.disabled = false;
        btn.onclick = function () {
          navigator.clipboard.writeText(data.summary).then(function () {
            btn.textContent = 'Copied!';
            setTimeout(function () { btn.textContent = 'Copy Summary'; }, 2000);
          });
        };
      } else {
        out.textContent = data.error || 'Could not generate summary.';
        out.className = 'ga-summary-out ga-summary-err';
        btn.textContent = 'Retry';
        btn.disabled = false;
        btn.onclick = function () { requestSummary(btn); };
      }
    } catch (_) {
      out.textContent = 'Network error. Please try again.';
      out.className = 'ga-summary-out ga-summary-err';
      btn.textContent = 'Retry';
      btn.disabled = false;
        btn.onclick = function () { requestSummary(btn); };
    }
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
