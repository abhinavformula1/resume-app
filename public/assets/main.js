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
      bot: "Hi there! I'm Abhinav's assistant. To schedule a quick chat, I'll need a few details. What's your name?",
      inputType: 'text',
      placeholder: 'Your full name',
      validate: function (v) { return v.trim().length > 0 ? null : 'Please enter your name.'; },
    },
    {
      key: 'email',
      bot: function (a) { return 'Nice to meet you, ' + a.name.split(' ')[0] + '! What\'s your work email?'; },
      inputType: 'text',
      placeholder: 'your@company.com',
      validate: function (v) {
        if (!v.trim()) return 'Email is required.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Enter a valid email address.';
      },
    },
    {
      key: 'company',
      bot: 'Which company are you from?',
      inputType: 'text',
      placeholder: 'Company name',
      validate: function (v) { return v.trim().length > 0 ? null : 'Please enter your company.'; },
    },
    {
      key: 'role',
      bot: 'What kind of role are you looking to fill?',
      inputType: 'choice',
      choices: ['SF Developer', 'SF Architect', 'Tech Lead', 'Consulting', 'Other'],
    },
    {
      key: 'contractType',
      bot: 'Is this a permanent or contract position?',
      inputType: 'choice',
      choices: ['Permanent', 'Contract', 'Freelance'],
    },
    {
      key: 'urgency',
      bot: 'How soon are you looking to hire?',
      inputType: 'choice',
      choices: ['Immediately', 'Within 1 month', '3+ months'],
    },
    {
      key: 'slot',
      bot: 'Great! Pick a time slot that works for you.',
      inputType: 'slots',
    },
  ];

  function openAssistant() {
    state.step = 0;
    state.answers = { name: '', email: '', company: '', role: '', contractType: '', urgency: '', slot: '' };
    document.getElementById('gaMessages').innerHTML = '';
    document.getElementById('assistantOverlay').removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
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
    var botText = typeof stepDef.bot === 'function' ? stepDef.bot(state.answers) : stepDef.bot;
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
      inp.placeholder = stepDef.placeholder || '';
      var err = document.createElement('div');
      err.className = 'ga-input-err';
      var btn = document.createElement('button');
      btn.className = 'ga-send-btn';
      btn.textContent = 'Continue';
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
      stepDef.choices.forEach(function (choice) {
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
      'Perfect! I\'ve noted everything. Click "Confirm & Schedule" to lock in your slot.',
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
        confirmBtn.textContent = 'Confirm & Schedule';
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
    btn.textContent = 'Scheduling\u2026';
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
      'All set, ' + state.answers.name.split(' ')[0] + '! Your slot is confirmed. I\'ll send a calendar invite to ' + state.answers.email + '. Looking forward to speaking!',
      function () {
        var done = document.createElement('div');
        done.className = 'ga-done';
        done.innerHTML =
          '<div class="ga-done-check">&#10003;</div>' +
          '<div class="ga-done-slot">' + escHtml(state.answers.slot) + '</div>' +
          '<button class="ga-done-close" onclick="closeAssistant()">Close</button>';
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
        globalErr.textContent = (data && data.error) || 'Something went wrong. Please try again.';
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
