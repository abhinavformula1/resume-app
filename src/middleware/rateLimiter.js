'use strict';

const rateLimit = require('express-rate-limit');
const config    = require('../config');

const hireLimiter = rateLimit({
  windowMs:       config.rateLimit.windowMs,
  max:            config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:  false,
  message: {
    success: false,
    code:    'RATE_LIMIT_ERROR',
    error:   'Too many requests from this IP. Please try again in an hour.',
  },
  skip: () => config.server.env === 'test',
});

module.exports = { hireLimiter };
