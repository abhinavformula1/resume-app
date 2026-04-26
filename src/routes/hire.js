'use strict';

const express                    = require('express');
const { body, validationResult } = require('express-validator');
const { hireLimiter }            = require('../middleware/rateLimiter');
const salesforce                 = require('../services/salesforce');
const { ValidationError }        = require('../errors');

const router = express.Router();

// ── Validation rules ──────────────────────────────────────────────────────────
const validateHire = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Work email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('company')
    .trim()
    .notEmpty().withMessage('Company name is required.')
    .isLength({ max: 255 }).withMessage('Company must be 255 characters or fewer.'),

  // Guided assistant fields (optional — not sent by legacy modal)
  body('role').optional().trim().isLength({ max: 100 }),
  body('contractType').optional().trim().isLength({ max: 50 }),
  body('urgency').optional().trim().isLength({ max: 50 }),
  body('slot').optional().trim().isLength({ max: 100 }),
];

// ── POST /api/hire ────────────────────────────────────────────────────────────
router.post('/hire', hireLimiter, validateHire, async (req, res, next) => {
  // 1. Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError(
      errors.array()[0].msg,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    ));
  }

  const { name, email, company, role, contractType, urgency, slot } = req.body;

  // Build a rich description from guided assistant answers (if present)
  const notes = [
    role         && `Role: ${role}`,
    contractType && `Type: ${contractType}`,
    urgency      && `Urgency: ${urgency}`,
    slot         && `Requested slot: ${slot}`,
  ].filter(Boolean).join('\n');

  try {
    // 2. Create Salesforce record
    const { id } = await salesforce.createInquiry({ name, email, company, notes });

    return res.status(200).json({
      success:  true,
      message:  'Inquiry submitted successfully.',
      recordId: id,
    });
  } catch (err) {
    // 3. Pass to global error handler
    return next(err);
  }
});

module.exports = router;
