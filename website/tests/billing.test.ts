import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { createHmac } from 'node:crypto';
import type { Subscription, Transaction } from '@paddle/paddle-node-sdk';
import { accessFromSubscription, syncSubscriptionToUser, userIdFromCustomData } from '../lib/subscription-sync';
import { verifyPaddleSignature, ipInCidrs } from '../lib/paddle-webhook';
import { fetchProStatusDirect, isRowPro } from '../lib/usage-client';
import { getPaddle } from '../lib/paddle-server';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import { POST as sync } from '../app/api/paddle/sync/route';
import { POST as webhook } from '../app/api/paddle/webhook/route';
import { POST as portal } from '../app/api/paddle/portal/route';
import { GET as reconcile } from '../app/api/cron/downgrade-expired/route';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-11T12:00:00Z');
const future = '2099-11-11T00:00:00Z';
const originalFetch = globalThis.fetch;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://billing-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.PADDLE_API_KEY = 'pdl_sdbx_test';
process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'test_token';
process.env.NEXT_PUBLIC_PADDLE_PRICE_ID = 'pri_pro';

type Row = Record<string, string | boolean | number | null>;
let rows: Row[] = [];
let beforePatch: (() => void) | null = null;
let beforeInsert: (() => void) | null = null;
let failReads = false;
let writes = 0;

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub_test', customerId: 'ctm_test', status: 'active',
    customData: { user_id: USER }, updatedAt: '2026-10-11T00:00:00Z',
    currentBillingPeriod: { startsAt: '2026-10-01T00:00:00Z', endsAt: future },
    nextBilledAt: future, scheduledChange: null, items: [{ price: { id: 'pri_pro' } }],
    ...overrides,
  } as Subscription;
}
function row(overrides: Row = {}): Row {
  return { user_id: USER, is_pro: false, pro_expires_at: null, pro_granted_by: null,
    paddle_subscription_id: null, paddle_updated_at: null, subscription_status: null,
    prompts_count: 4, ...overrides };
}
function matches(record: Row, params: URLSearchParams): boolean {
  return [...params].every(([key, value]) => {
    if (['select', 'order', 'limit', 'on_conflict'].includes(key)) return true;
    if (key === 'or') return record.paddle_subscription_id != null ||
      (record.is_pro === true && record.pro_granted_by == null && record.pro_expires_at != null &&
        new Date(String(record.pro_expires_at)) <= new Date());
    const [op, ...rest] = value.split('.');
    const expected = rest.join('.');
    if (op === 'is') return expected === 'null' && record[key] == null;
    if (op === 'eq') return String(record[key]) === expected;
    if (op === 'lte') return record[key] != null && String(record[key]) <= expected;
    if (op === 'gt') return String(record[key]) > expected;
    throw new Error(`Unhandled filter ${key}=${value}`);
  });
}

beforeEach(() => {
  rows = []; writes = 0; beforePatch = null; beforeInsert = null; failReads = false;
  delete process.env.VERCEL;
  process.env.CRON_SECRET = 'cron-secret';
  process.env.PADDLE_WEBHOOK_SECRET = 'webhook-secret';
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.host, 'billing-test.supabase.co', `Unexpected network request: ${url.host}`);
    assert.equal(url.pathname, '/rest/v1/user_usage');
    const method = init?.method ?? 'GET';
    if (method === 'GET' && failReads) return Response.json({ message: 'unavailable' }, { status: 503 });
    if (method === 'PATCH') { const hook = beforePatch; beforePatch = null; hook?.(); }
    if (method === 'POST') { const hook = beforeInsert; beforeInsert = null; hook?.(); }
    let found = rows.filter((r) => matches(r, url.searchParams));
    if (method === 'GET') {
      found = found.sort((a, b) => String(a.user_id).localeCompare(String(b.user_id)));
      const limit = Number(url.searchParams.get('limit') ?? Infinity);
      return Response.json(found.slice(0, limit));
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(String(init?.body));
      found.forEach((r) => Object.assign(r, patch)); writes += found.length;
      return Response.json(found);
    }
    if (method === 'POST') {
      const inserted = JSON.parse(String(init?.body));
      if (rows.some((r) => r.user_id === inserted.user_id)) return Response.json([]);
      rows.push(row(inserted)); writes++;
      return Response.json([inserted], { status: 201 });
    }
    throw new Error(`Unexpected method ${method}`);
  };
});
afterEach(() => { globalThis.fetch = originalFetch; mock.restoreAll(); });

for (const status of ['active', 'trialing', 'past_due'] as const) {
  test(`${status} grants Pro`, () => assert.equal(accessFromSubscription(sub({ status }), NOW).isPro, true));
}
for (const status of ['paused', 'canceled'] as const) {
  test(`${status} revokes Pro immediately`, () => assert.equal(accessFromSubscription(sub({ status }), NOW).isPro, false));
}
test('cancel and pause end access at the exact scheduled boundary', () => {
  for (const action of ['cancel', 'pause'] as const) {
    const subscription = sub({ scheduledChange: { action, effectiveAt: NOW.toISOString(), resumeAt: null } });
    assert.equal(accessFromSubscription(subscription, new Date(NOW.getTime() - 1)).isPro, true);
    assert.equal(accessFromSubscription(subscription, NOW).isPro, false);
  }
});
test('past-due recovery extends grace even if the billing period has ended', () => {
  const access = accessFromSubscription(sub({ status: 'past_due', currentBillingPeriod: {
    startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z',
  } }), NOW);
  assert.equal(access.isPro, true);
  assert.equal(access.proExpiresAt, '2026-10-14T12:00:00.000Z');
});
test('an expired active snapshot cannot claim effective Pro access', () => {
  assert.equal(accessFromSubscription(sub({ currentBillingPeriod: {
    startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z',
  } }), NOW).isPro, false);
});
test('custom data must contain a UUID', () => {
  for (const value of [null, {}, 'abc', { user_id: '../../user' }, { user_id: 1 }]) assert.equal(userIdFromCustomData(value), null);
  assert.equal(userIdFromCustomData({ user_id: USER }), USER);
});
test('signature checks tampering, expiry, future timestamps, rotation, and malformed digests', () => {
  const body = '{"data":{}}';
  const digest = createHmac('sha256', 'secret').update(`1000:${body}`).digest('hex');
  const header = `ts=1000;h1=${digest}`;
  assert.equal(verifyPaddleSignature(body, header, 'secret', 300, 1000), true);
  assert.equal(verifyPaddleSignature(body, `ts=1000;h1=bad;h1=${digest}`, 'secret', 300, 1000), true);
  assert.equal(verifyPaddleSignature(body + ' ', header, 'secret', 300, 1000), false);
  for (const time of [699, 1301]) assert.equal(verifyPaddleSignature(body, header, 'secret', 300, time), false);
  assert.equal(verifyPaddleSignature(body, header + 'a', 'secret', 300, 1000), false);
  assert.equal(verifyPaddleSignature(body, null, 'secret'), false);
});
test('IP allowlist accepts only matching valid addresses', () => {
  assert.equal(ipInCidrs('::ffff:34.237.3.244', ['34.237.3.244/32']), true);
  assert.equal(ipInCidrs('34.237.3.245', ['34.237.3.244/32']), false);
  assert.equal(ipInCidrs('999.1.1.1', ['0.0.0.0/0']), false);
});
test('sync creates an absent usage row and preserves existing usage counters', async () => {
  assert.equal((await syncSubscriptionToUser(sub())).status, 'synced');
  assert.equal(rows[0].is_pro, true);
  await syncSubscriptionToUser(sub({ status: 'canceled' }));
  assert.equal(rows[0].is_pro, false);
  assert.equal(rows[0].prompts_count, 4);
});
test('duplicate webhook processing is harmless', async () => {
  await syncSubscriptionToUser(sub());
  const first = { ...rows[0] };
  await syncSubscriptionToUser(sub());
  assert.deepEqual(rows[0], first);
});
test('older snapshots cannot revoke a newer active subscription', async () => {
  rows = [row({ paddle_subscription_id: 'sub_test', paddle_updated_at: '2026-10-12T00:00:00Z', is_pro: true })];
  assert.equal((await syncSubscriptionToUser(sub({ status: 'canceled' }))).status, 'stale');
  assert.equal(writes, 0);
});
test('concurrent cancellation cannot overwrite a newer renewal', async () => {
  rows = [row({ paddle_subscription_id: 'sub_test', paddle_updated_at: '2026-10-10T00:00:00Z' })];
  beforePatch = () => Object.assign(rows[0], { paddle_updated_at: '2026-10-12T00:00:00Z', is_pro: true });
  assert.equal((await syncSubscriptionToUser(sub({ status: 'canceled' }))).status, 'stale');
  assert.equal(rows[0].is_pro, true);
  assert.equal(writes, 0);
});
test('a concurrent founder grant survives cancellation', async () => {
  rows = [row({ paddle_subscription_id: 'sub_test' })];
  beforePatch = () => Object.assign(rows[0], { pro_granted_by: OTHER, is_pro: true });
  await syncSubscriptionToUser(sub({ status: 'canceled' }));
  assert.equal(rows[0].is_pro, true);
  assert.equal(rows[0].pro_granted_by, OTHER);
});
test('concurrent row creation preserves the founder grant', async () => {
  beforeInsert = () => { rows.push(row({ pro_granted_by: OTHER, is_pro: true })); };
  await syncSubscriptionToUser(sub({ status: 'canceled' }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].is_pro, true);
});
test('a canceled secondary subscription does not disable another active subscription', async () => {
  rows = [row({ paddle_subscription_id: 'sub_other', subscription_status: 'active', is_pro: true })];
  assert.equal((await syncSubscriptionToUser(sub({ status: 'canceled' }))).status, 'ignored');
  assert.equal(writes, 0);
});
test('an unrelated price cannot grant Pro', async () => {
  const wrong = sub({ items: [{ price: { id: 'pri_other' } }] as Subscription['items'] });
  assert.equal((await syncSubscriptionToUser(wrong)).status, 'ignored');
  assert.equal(writes, 0);
});
test('linked subscription without custom data can still revoke access', async () => {
  rows = [row({ paddle_subscription_id: 'sub_test', is_pro: true })];
  await syncSubscriptionToUser(sub({ status: 'canceled', customData: null }));
  assert.equal(rows[0].is_pro, false);
});
test('database lookup errors are retried instead of acknowledged as unlinked', async () => {
  failReads = true;
  await assert.rejects(syncSubscriptionToUser(sub({ customData: null })));
});
test('custom data cannot move an existing subscription to another user', async () => {
  rows = [row({ user_id: OTHER, paddle_subscription_id: 'sub_test' })];
  await assert.rejects(syncSubscriptionToUser(sub()), /ownership/);
  assert.equal(writes, 0);
});
function signedRequest(value: unknown) {
  const body = JSON.stringify(value);
  const ts = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', 'webhook-secret').update(`${ts}:${body}`).digest('hex');
  return new Request('https://test/api/paddle/webhook', { method: 'POST', body,
    headers: { 'paddle-signature': `ts=${ts};h1=${signature}` } });
}
test('malformed signed webhook bodies return 400 instead of crashing', async () => {
  for (const value of [null, {}, { event_type: 3 }, { event_type: 'subscription.updated', data: { id: '../../' } }]) {
    assert.equal((await webhook(signedRequest(value))).status, 400);
  }
});
test('unsigned webhook rejected before fetching the IP allowlist', async () => {
  process.env.VERCEL = '1';
  assert.equal((await webhook(new Request('https://test', { method: 'POST', body: '{}' }))).status, 401);
});
test('valid webhook fetches current subscription state', async () => {
  mock.method(getPaddle().subscriptions, 'get', async () => sub());
  const result = await webhook(signedRequest({ event_type: 'subscription.updated', data: { id: 'sub_test' } }));
  assert.equal(result.status, 200);
  assert.equal(rows[0].is_pro, true);
});
function signIn() {
  mock.method(getSupabaseAdmin().auth, 'getUser', async () => ({ data: { user: { id: USER } }, error: null }));
}
function purchaseRequest(transactionId = 'txn_test') {
  return new Request('https://test/api/paddle/sync', { method: 'POST', headers: {
    Authorization: 'Bearer signed-token', 'Content-Type': 'application/json',
  }, body: JSON.stringify({ transactionId }) });
}
function transaction(overrides: Partial<Transaction> = {}) {
  return { id: 'txn_test', customerId: 'ctm_test', subscriptionId: 'sub_test', status: 'completed',
    customData: { user_id: USER }, ...overrides } as Transaction;
}
test('sync and portal require authentication', async () => {
  assert.equal((await sync(new Request('https://test', { method: 'POST' }))).status, 401);
  assert.equal((await portal(new Request('https://test', { method: 'POST' }))).status, 401);
});
test('sync rejects invalid transaction IDs', async () => {
  signIn();
  assert.equal((await sync(purchaseRequest('../test'))).status, 400);
});
test('sync rejects a transaction belonging to another user', async () => {
  signIn();
  mock.method(getPaddle().transactions, 'get', async () => transaction({ customData: { user_id: OTHER } }));
  assert.equal((await sync(purchaseRequest())).status, 403);
});
test('sync waits while Paddle is creating the subscription', async () => {
  signIn();
  mock.method(getPaddle().transactions, 'get', async () => transaction({ subscriptionId: null }));
  assert.equal((await (await sync(purchaseRequest())).json()).pending, true);
});
test('sync also verifies subscription ownership before any writes', async () => {
  signIn();
  mock.method(getPaddle().transactions, 'get', async () => transaction());
  mock.method(getPaddle().subscriptions, 'get', async () => sub({ customData: { user_id: OTHER } }));
  assert.equal((await sync(purchaseRequest())).status, 403);
  assert.equal(writes, 0);
});
test('a stale sync returns the current access instead of a false activation failure', async () => {
  signIn();
  rows = [row({ paddle_subscription_id: 'sub_test', paddle_updated_at: '2026-10-12T00:00:00Z', is_pro: true })];
  mock.method(getPaddle().transactions, 'get', async () => transaction());
  mock.method(getPaddle().subscriptions, 'get', async () => sub());
  assert.equal((await (await sync(purchaseRequest())).json()).isPro, true);
});
test('portal checks ownership before creating a session', async () => {
  signIn(); rows = [row({ paddle_subscription_id: 'sub_test' })];
  mock.method(getPaddle().subscriptions, 'get', async () => sub({ customData: { user_id: OTHER } }));
  assert.equal((await portal(purchaseRequest())).status, 403);
});
test('cron fails closed when its secret is missing', async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await reconcile(new Request('https://test', { headers: { Authorization: 'Bearer undefined' } }))).status, 401);
});
test('cron recovers missed renewals even after access has been disabled', async () => {
  rows = [row({ paddle_subscription_id: 'sub_test', is_pro: false })];
  mock.method(getPaddle().subscriptions, 'get', async () => sub());
  const result = await reconcile(new Request('https://test', { headers: { Authorization: 'Bearer cron-secret' } }));
  assert.equal(result.status, 200);
  assert.equal(rows[0].is_pro, true);
});
test('cron cannot revoke a new purchase racing a legacy expiry', async () => {
  rows = [row({ is_pro: true, pro_expires_at: '2020-01-01T00:00:00Z' })];
  beforePatch = () => Object.assign(rows[0], { paddle_subscription_id: 'sub_test', pro_expires_at: future });
  await reconcile(new Request('https://test', { headers: { Authorization: 'Bearer cron-secret' } }));
  assert.equal(rows[0].is_pro, true);
});
test('cron paginates without skipping expired users when records stop matching', async () => {
  rows = Array.from({ length: 105 }, (_, i) => row({ user_id: String(i).padStart(4, '0'), is_pro: true, pro_expires_at: '2020-01-01T00:00:00Z' }));
  const result = await reconcile(new Request('https://test', { headers: { Authorization: 'Bearer cron-secret' } }));
  assert.equal((await result.json()).downgraded, 105);
});
test('client status distinguishes a failed read from a free account', async () => {
  failReads = true;
  await assert.rejects(fetchProStatusDirect(USER, 'token'), /Could not load/);
});
test('client status respects expiry and rejects invalid dates', () => {
  assert.equal(isRowPro({ is_pro: true, pro_expires_at: future }), true);
  assert.equal(isRowPro({ is_pro: true, pro_expires_at: '2020-01-01' }), false);
  assert.equal(isRowPro({ is_pro: true, pro_expires_at: 'invalid' }), false);
});

test('changing the checkout price does not revoke an already-linked legacy subscriber', async () => {
  rows = [row({ paddle_subscription_id: 'sub_test', is_pro: true })];
  await syncSubscriptionToUser(sub({ items: [{ price: { id: 'pri_legacy' } }] as Subscription['items'] }));
  assert.equal(rows[0].is_pro, true);
});
