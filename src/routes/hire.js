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

  const { name, email, company } = req.body;

  try {
    // 2. Create Salesforce record
    const { id } = await salesforce.createInquiry({ name, email, company });

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
