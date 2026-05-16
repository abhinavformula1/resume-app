'use strict';

const express = require('express');
const router  = express.Router();

// POST /api/salesforce/account
// Receives Account data from Salesforce @future(callout=true)
router.post('/salesforce/account', (req, res) => {
  const payload = req.body;

  // Log the incoming payload
  console.log('[salesforce] Account received:', JSON.stringify(payload, null, 2));

  // Return 200 so Salesforce does not log an error
  return res.status(200).json({
    success:  true,
    message:  'Account received successfully.',
    received: payload,
  });
});

module.exports = router;
