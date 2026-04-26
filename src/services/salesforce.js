'use strict';

const https  = require('https');
const crypto = require('crypto');
const config = require('../config');
const { SalesforceError, SalesforceAuthError } = require('../errors');

// ── Token cache (in-memory) ───────────────────────────────────────────────────
let _tokenCache = null; // { accessToken, instanceUrl, expiresAt }
const TOKEN_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

// ── JWT Builder ───────────────────────────────────────────────────────────────
function buildJwt() {
  const { clientId, username, privateKey, loginUrl } = config.salesforce;
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: clientId,
    sub: username,
    aud: loginUrl,
    exp: now + 300,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey, 'base64url');

  return `${signingInput}.${signature}`;
}

// ── Token Fetcher ─────────────────────────────────────────────────────────────
function fetchAccessToken() {
  const { loginUrl } = config.salesforce;
  const jwt  = buildJwt();
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion:  jwt,
  }).toString();

  const url = new URL('/services/oauth2/token', loginUrl);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (res.statusCode !== 200 || data.error) {
              return reject(new SalesforceAuthError(
                `SF token error: ${data.error} — ${data.error_description}`
              ));
            }
            resolve({
              accessToken: data.access_token,
              instanceUrl: data.instance_url,
              expiresAt:   Date.now() + 60 * 60 * 1000,
            });
          } catch (e) {
            reject(new SalesforceError(`Failed to parse SF token response: ${e.message}`));
          }
        });
      }
    );
    req.on('error', (e) => reject(new SalesforceError(`SF network error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

// ── Token Cache ───────────────────────────────────────────────────────────────
async function getToken() {
  if (_tokenCache && _tokenCache.expiresAt - Date.now() > TOKEN_BUFFER_MS) {
    return _tokenCache;
  }
  _tokenCache = await fetchAccessToken();
  return _tokenCache;
}

// ── Salesforce REST POST ──────────────────────────────────────────────────────
function sfPost(instanceUrl, accessToken, sobjectPath, payload) {
  const body = JSON.stringify(payload);
  const url  = new URL(
    `/services/data/${config.salesforce.apiVersion}/sobjects/${sobjectPath}`,
    instanceUrl
  );

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'POST',
        headers:  {
          'Authorization':  `Bearer ${accessToken}`,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            reject(new SalesforceError(`Failed to parse SF API response: ${e.message}`));
          }
        });
      }
    );
    req.on('error', (e) => reject(new SalesforceError(`SF network error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Creates a Recruiter_Inquiry__c record in Salesforce.
 * Retries once on 401 (expired token).
 *
 * @param {{ name: string, email: string, company: string }} data
 * @returns {Promise<{ id: string }>}
 */
async function createInquiry(data, retry = true) {
  const { accessToken, instanceUrl } = await getToken();

  const payload = {
    Recruiter_Name__c:    data.name,
    Recruiter_Email__c:   data.email,
    Recruiter_Company__c: data.company,
    Submission_Date__c:   new Date().toISOString(),
  };

  const { status, data: result } = await sfPost(
    instanceUrl, accessToken, 'Recruiter_Inquiry__c', payload
  );

  if (status === 401 && retry) {
    _tokenCache = null;
    return createInquiry(data, false);
  }

  if (status !== 201) {
    const msg = Array.isArray(result) ? result[0]?.message : JSON.stringify(result);
    throw new SalesforceError(
      `Record creation failed (HTTP ${status})`, msg
    );
  }

  return { id: result.id };
}

module.exports = { createInquiry };
