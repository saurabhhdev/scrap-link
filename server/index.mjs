import { createHash, createHmac, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createReadStream, existsSync } from 'node:fs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { Server as SocketServer } from 'socket.io';
import { User } from './src/models/User.js';
import { ScrapLot } from './src/models/ScrapLot.js';
import { RecyclerOffer } from './src/models/RecyclerOffer.js';
import { RecyclerFacility } from './src/models/RecyclerFacility.js';
import { HandoverRecord } from './src/models/HandoverRecord.js';
import { Transaction } from './src/models/LedgerTransaction.js';
import { Payment } from './src/models/Payment.js';
import { AuditLog } from './src/models/AuditLog.js';
import { Notification } from './src/models/Notification.js';
import { PlatformState } from './src/models/PlatformState.js';
import { evaluateWeightedMatches } from './src/matching/weightedStrategy.js';
import { configureMongoDns } from './mongoDns.js';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = fileURLToPath(new URL('..', import.meta.url));
dotenv.config({ path: join(rootDirectory, '.env') });
const mongoDnsOptions = configureMongoDns(process.env.MONGO_DNS_SERVERS || '');
const port = Number(process.env.PORT || 8787);
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scraplink';
const isProduction = process.env.NODE_ENV === 'production';
const sampleMode = process.env.SAMPLE_MODE === 'true';
const tokenSecret = process.env.JWT_SECRET || (isProduction ? '' : 'local-development-only-change-this-secret');
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
const sessionTtlMs = Math.max(5 * 60_000, Number(process.env.SESSION_TTL_MINUTES || 480) * 60_000);
const requestLimitWindowMs = 60_000;
const requestLimit = Math.max(10, Number(process.env.RATE_LIMIT_PER_MINUTE || 120));
const loginLimit = Math.max(3, Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE || 10));
const rateBuckets = new Map();

async function provisionAdminFromEnvironment() {
  const phone = String(process.env.ADMIN_PHONE || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!phone && !password) return;
  if (!phone || password.length < 12) throw new Error('Set both ADMIN_PHONE and an ADMIN_PASSWORD with at least 12 characters.');
  const existing = await User.findOne({ phone });
  if (!existing) await User.create({ name: process.env.ADMIN_NAME || 'Administrator', phone, passwordHash: await passwordHash(password), role: 'admin', isDemo: sampleMode });
}

const materialAliases = { hard_plastic: 'hdpe', metal_iron: 'metal', copper_brass: 'copper' };
const normalizeMaterial = (material) => materialAliases[material] || material;
const haversineKm = (from, to) => {
  const radians = (degree) => degree * Math.PI / 180;
  const dLat = radians(to[1] - from[1]); const dLng = radians(to[0] - from[0]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from[1])) * Math.cos(radians(to[1])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const initialStore = () => ({ version: 1, pickups: [], collectors: [], recyclers: [], batches: [], materials: [], prices: [] });
const digest = (value) => `0x${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
const event = (stage, title, description, location, actorName, actorRole, metricHighlight) => ({
  stage, title, description, timestamp: new Date().toISOString(), location, actorName, actorRole,
  hashDigest: digest({ stage, title, location, at: Date.now() }).slice(0, 22), ...(metricHighlight ? { metricHighlight } : {})
});

let store;
async function loadStore() {
  const state = await PlatformState.findOne({ key: 'primary' }).lean();
  store = state ? { version: state.version, pickups: state.pickups || [], collectors: state.collectors || [], recyclers: state.recyclers || [], batches: state.batches || [], materials: state.materials || [], prices: state.prices || [] } : initialStore();
  if (!state) await saveStore();
}
async function saveStore() {
  await PlatformState.updateOne({ key: 'primary' }, { $set: { key: 'primary', ...store } }, { upsert: true });
}

function send(response, status, body, requestId) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...(requestId ? { 'X-Request-Id': requestId } : {}) });
  response.end(JSON.stringify(body));
}
function failure(response, status, message, requestId) { send(response, status, { error: { message } }, requestId); }
async function body(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) { length += chunk.length; if (length > 1_000_000) throw Object.assign(new Error('Request body is too large.'), { status: 413 }); chunks.push(chunk); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
async function passwordHash(password) { return bcrypt.hash(password, 12); }
async function passwordMatches(password, stored) {
  if (password.length > 128) return false;
  if (/^\$2[aby]\$/.test(String(stored || ''))) return bcrypt.compare(password, stored);
  const [salt, expectedHex] = String(stored || '').split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex'); const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function createToken(user) {
  if (!tokenSecret) throw new Error('JWT_SECRET must be configured in production.');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: String(user._id), role: user.role, exp: Math.floor(Date.now() / 1000) + Math.floor(sessionTtlMs / 1000), ver: user.tokenVersion || 0 })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  return `${signingInput}.${createHmac('sha256', tokenSecret).update(signingInput).digest('base64url')}`;
}
async function verifyToken(token) {
  if (!token || !tokenSecret) return null;
  const [header, payload, signature, extra] = String(token).split('.');
  if (!header || !payload || !signature || extra) return null;
  const signingInput = `${header}.${payload}`;
  const expected = createHmac('sha256', tokenSecret).update(signingInput).digest(); let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const tokenHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (tokenHeader.alg !== 'HS256' || tokenHeader.typ !== 'JWT') return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!mongoose.isValidObjectId(claims.sub) || claims.exp <= Date.now() / 1000) return null;
    const user = await User.findOne({ _id: claims.sub, isActive: true }).select('+tokenVersion').lean();
    if (!user || (user.tokenVersion || 0) !== claims.ver) return null;
    return user;
  } catch { return null; }
}
async function authorization(request, roles) {
  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const record = await verifyToken(token);
  if (!record) throw Object.assign(new Error('Authentication is required.'), { status: 401 });
  if (roles && !roles.includes(record.role)) throw Object.assign(new Error('You do not have permission for this action.'), { status: 403 });
  return { id: String(record._id), name: record.name, phone: record.phone, role: record.role, email: record.email, identity: record.identity, isDemo: Boolean(record.isDemo), subtitle: record.profile?.subtitle, ward: record.profile?.ward, eShramNo: record.profile?.eShramNo, photoUrl: record.profile?.photoUrl, recyclerProfile: record.recyclerProfile };
}
function clientIp(request) { return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim(); }
function allowRequest(request, kind = 'api') {
  const now = Date.now(); const limit = kind === 'login' ? loginLimit : requestLimit; const key = `${kind}:${clientIp(request)}`; const bucket = rateBuckets.get(key) || { startedAt: now, count: 0 };
  if (now - bucket.startedAt >= requestLimitWindowMs) { bucket.startedAt = now; bucket.count = 0; }
  bucket.count += 1; rateBuckets.set(key, bucket);
  return bucket.count <= limit;
}
function pickupById(id) {
  const pickup = store.pickups.find((entry) => entry.id === id);
  if (!pickup) throw Object.assign(new Error('Pickup was not found.'), { status: 404 });
  return pickup;
}
function makeId(prefix) { return `${prefix}-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`; }
async function audit(actor, action, entityType, entityId, summary, metadata = {}) { await AuditLog.create({ actorId: actor.id, actorRole: actor.role, action, entityType, entityId, summary, metadata, isDemo: Boolean(actor.isDemo) }); }
function latestRate(materialId, isDemo = false) { const material = normalizeMaterial(String(materialId || '')); const observations = (store.prices || []).filter((price) => Boolean(price.isDemo) === isDemo && normalizeMaterial(price.materialId) === material).sort((a, b) => String(b.date).localeCompare(String(a.date))); return Number(observations[0]?.amount || 0); }
function safeText(value, maxLength = 160) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''; }
let realtime;
function publishUpdate({ users = [], roles = [], resource, action, entityId, isDemo = false }) {
  if (!realtime) return;
  const payload = { resource, action, ...(entityId ? { entityId } : {}), at: new Date().toISOString() };
  for (const id of new Set(users.map(String))) realtime.to(`user:${id}`).emit('platform:update', payload);
  for (const role of new Set(roles)) realtime.to(`role:${role}:${isDemo ? 'demo' : 'live'}`).emit('platform:update', payload);
}
function publicUser(user) {
  return { id: String(user._id), name: user.name, phone: user.phone, role: user.role, email: user.email, isDemo: Boolean(user.isDemo), subtitle: user.profile?.subtitle, ward: user.profile?.ward, eShramNo: user.profile?.eShramNo, photoUrl: user.profile?.photoUrl, identity: user.identity };
}
async function createNotifications(userIds, { title, message, type = 'info', resource, entityId, isDemo = false }) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) return [];
  const documents = await Notification.insertMany(uniqueIds.map((userId) => ({ userId, title, message, type, resource, entityId, isDemo })));
  for (const notification of documents) publishUpdate({ users: [String(notification.userId)], resource: 'notifications', action: 'created', entityId: String(notification._id), isDemo });
  return documents;
}
function toCollector(user, metrics = {}) {
  const profile = user.profile || {};
  return { id: String(user._id), name: user.name, hindiName: '', photoUrl: profile.photoUrl || '', phone: user.phone, rating: 0, reviewCount: 0, totalPickups: metrics.totalPickups || 0, totalWasteKg: metrics.totalWasteKg || 0, monthlyEarnings: metrics.monthlyEarnings || 0, distanceKm: 0, acceptedMaterials: [], isVerified: Boolean(user.isVerified), verificationBadges: [], govtIdNumber: profile.eShramNo || '', ayushmanCardNo: '', cpcbTrainingCert: '', vehicleType: '', vehiclePlateNo: '', todayPickups: metrics.todayPickups || 0, todayEarnings: metrics.todayEarnings || 0, pendingRequestsCount: metrics.pendingRequestsCount || 0, completedPickupsCount: metrics.totalPickups || 0, status: 'available', currentLocation: { lat: 0, lng: 0, areaName: profile.ward || '' } };
}
function toRecycler(user, facility = {}, metrics = {}) {
  return { id: String(user._id), name: facility.name || user.recyclerProfile?.facilityName || user.name, facilityType: '', cpcbLicenseNo: user.identity || '', location: facility.city || user.recyclerProfile?.location?.city || '', state: '', contactPerson: user.name, phone: user.phone, email: user.email || '', acceptedMaterials: facility.acceptedMaterials || [], totalTonsProcessed: (metrics.processedWeightKg || 0) / 1000, eprCreditsIssued: metrics.eprCreditsIssued || 0, isoCertifications: [], co2OffsetTotalTons: (metrics.co2Kg || 0) / 1000, verificationStatus: facility.verificationStatus || 'pending' };
}

async function recordCollectorTransaction(pickup, collectorId, measuredKg, amount, paymentMode, occurredAt) {
  const existing = await Transaction.findOne({ pickupId: pickup.id });
  if (existing) return existing;
  let payment = await Payment.findOne({ idempotencyKey: `pickup:${pickup.id}` });
  const transactionId = payment?.transactionId || makeId('TXN');
  const status = paymentMode === 'Cash' ? 'paid' : 'pending';
  const provider = paymentMode === 'Cash' ? 'manual_cash' : 'unconfigured';
  if (!payment) {
    try {
      payment = await Payment.create({
        paymentId: makeId('PAY'), transactionId, collectorId, amount, method: paymentMode, provider,
        idempotencyKey: `pickup:${pickup.id}`, status, paidAt: status === 'paid' ? occurredAt : undefined,
        metadata: { source: 'pickup_completion' },
        isDemo: Boolean(pickup.isDemo)
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      payment = await Payment.findOne({ idempotencyKey: `pickup:${pickup.id}` });
      if (!payment) throw error;
    }
  }
  const estimatedKg = (pickup.items || []).reduce((sum, item) => sum + Number(item.estimatedKg || 0), 0);
  const estimatedValue = (pickup.items || []).reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);
  const materials = (pickup.items || []).map((item) => ({
    material: normalizeMaterial(item.categoryId || item.materialId || 'other'),
    label: item.categoryName || item.categoryId || 'Other',
    weightKg: estimatedKg ? measuredKg * Number(item.estimatedKg || 0) / estimatedKg : 0,
    value: estimatedValue ? amount * Number(item.estimatedValue || 0) / estimatedValue : 0
  }));
  try {
    return await Transaction.create({
      transactionId,
      pickupId: pickup.id,
      collectorId,
      materials,
      weightKg: measuredKg,
      amount,
      currency: 'INR',
      status,
      payment: payment._id,
      occurredAt,
      isDemo: Boolean(pickup.isDemo)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const concurrentRecord = await Transaction.findOne({ pickupId: pickup.id });
      if (concurrentRecord) return concurrentRecord;
    }
    throw error;
  }
}

function handoverPublicFields(record) {
  return {
    handoverId: record.handoverId,
    lotId: record.lotId,
    material: record.material,
    weightKg: record.weightKg,
    value: record.value,
    timestamp: new Date(record.timestamp).toISOString(),
    location: { city: record.location.city, facility: record.location.facility },
    payment: { mode: record.payment.mode, status: record.payment.status },
    confirmations: {
      collector: { confirmed: record.confirmations.collector.confirmed, confirmedAt: record.confirmations.collector.confirmedAt ? new Date(record.confirmations.collector.confirmedAt).toISOString() : null },
      recycler: { confirmed: record.confirmations.recycler.confirmed, confirmedAt: record.confirmations.recycler.confirmedAt ? new Date(record.confirmations.recycler.confirmedAt).toISOString() : null }
    },
    isDemo: Boolean(record.isDemo)
  };
}

async function recordHandover(batch, receivedAt = new Date()) {
  const existing = await HandoverRecord.findOne({ lotId: batch.id });
  if (existing) return existing;
  const sourcePickups = store.pickups.filter((pickup) => (batch.sourceWasteIds || []).includes(pickup.id));
  const paidPickups = sourcePickups.filter((pickup) => Number.isFinite(Number(pickup.actualPaidAmount)) && pickup.paymentMode);
  const paymentModes = [...new Set(paidPickups.map((pickup) => pickup.paymentMode))];
  const amount = paidPickups.reduce((sum, pickup) => sum + Number(pickup.actualPaidAmount), 0);
  const lotValue = sourcePickups.reduce((sum, pickup) => sum + Number(pickup.totalEstimatedValue || 0), 0) || Number(batch.quotedValue || 0);
  const collectedAt = sourcePickups.map((pickup) => pickup.collectedAt).filter(Boolean).sort().at(-1);
  const handoverId = `HND-${new Date(receivedAt).getFullYear()}-${randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`;
  const record = {
    handoverId,
    lotId: batch.id,
    collectorId: batch.collectorIds?.[0] || sourcePickups[0]?.assignedCollectorId || 'unknown',
    recyclerId: batch.recyclerId || '',
    material: batch.materialType || 'Recyclable material',
    weightKg: Number(batch.totalWeightKg),
    value: lotValue,
    timestamp: new Date(receivedAt),
    location: { city: batch.recyclerCity || '', facility: batch.recyclerName || '' },
    payment: { amount, mode: paymentModes.length === 1 ? paymentModes[0] : paymentModes.length ? 'mixed' : 'not recorded', status: paidPickups.length ? 'recorded' : 'unavailable', paidAt: collectedAt ? new Date(collectedAt) : undefined },
    confirmations: {
      collector: { confirmed: sourcePickups.length > 0 || Boolean(batch.directLotId), confirmedAt: collectedAt ? new Date(collectedAt) : new Date(receivedAt), actorId: batch.collectorIds?.[0] || sourcePickups[0]?.assignedCollectorId || 'unknown' },
      recycler: { confirmed: true, confirmedAt: new Date(receivedAt), actorId: batch.recyclerId || '' }
    },
    isDemo: Boolean(batch.isDemo)
  };
  record.integrityHash = digest(handoverPublicFields(record));
  try { return await HandoverRecord.create(record); }
  catch (error) {
    if (error?.code === 11000) {
      const concurrentRecord = await HandoverRecord.findOne({ lotId: batch.id });
      if (concurrentRecord) return concurrentRecord;
    }
    throw error;
  }
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;
  if (request.method === 'GET' && path === '/api/health') {
    const connected = mongoose.connection.readyState === 1;
    return send(response, connected ? 200 : 503, { status: connected ? 'ok' : 'unavailable', service: 'scrap-link-api', database: connected ? 'connected' : 'disconnected' });
  }
  if (request.method === 'POST' && path === '/api/auth/login') {
    if (!allowRequest(request, 'login')) return failure(response, 429, 'Too many sign-in attempts. Try again later.');
    const payload = await body(request); const credential = String(payload.credential || '').trim(); const password = String(payload.password || payload.code || '');
    if (!credential || password.length < 8) return failure(response, 400, 'Account identifier and password are required.');
    const user = await User.findOne({ $or: [{ phone: credential }, { email: credential.toLowerCase() }, { identity: credential }] }).select('+passwordHash +tokenVersion');
    if (!user || !user.isActive || !(await passwordMatches(password, user.passwordHash))) return failure(response, 401, 'The account identifier or password is incorrect.');
    if (!String(user.passwordHash).startsWith('$2')) { user.passwordHash = await passwordHash(password); await user.save(); }
    const view = publicUser(user); return send(response, 200, { user: view, token: createToken(user), expiresAt: new Date(Date.now() + sessionTtlMs).toISOString() });
  }
  if (request.method === 'POST' && path === '/api/auth/register') {
    if (!allowRequest(request, 'login')) return failure(response, 429, 'Too many account requests. Try again later.');
    const payload = await body(request); const role = payload.role;
    const name = safeText(payload.name, 100); const phone = safeText(payload.phone, 30); const password = String(payload.password || '');
    if (!['household', 'collector', 'recycler'].includes(role) || !name || !/^\+?[0-9 ()-]{8,20}$/.test(phone) || password.length < 8 || password.length > 128) return failure(response, 400, 'Provide a supported role, name, valid phone number, and password of at least 8 characters.');
    if (role === 'recycler' && (!safeText(payload.facilityName, 120) || !safeText(payload.city, 100))) return failure(response, 400, 'Recycler facility name and city are required.');
    const account = { name, phone, role, isDemo: sampleMode, passwordHash: await passwordHash(password), profile: { subtitle: safeText(payload.subtitle, 120), ward: safeText(payload.ward, 120), eShramNo: safeText(payload.eShramNo, 80) || undefined } };
    if (payload.email) account.email = safeText(payload.email, 180).toLowerCase();
    if (payload.identity || payload.eShramNo) account.identity = safeText(payload.identity || payload.eShramNo, 100);
    if (role === 'recycler') account.recyclerProfile = { facilityName: safeText(payload.facilityName, 120), acceptedMaterials: Array.isArray(payload.acceptedMaterials) ? payload.acceptedMaterials.filter((v) => typeof v === 'string').slice(0, 30) : [], location: { city: safeText(payload.city, 100) } };
    try {
      const user = await User.create(account);
      if (role === 'recycler') await RecyclerFacility.create({ facilityKey: String(user._id), userId: user._id, name: account.recyclerProfile.facilityName, city: account.recyclerProfile.location.city, acceptedMaterials: account.recyclerProfile.acceptedMaterials, active: true, verificationStatus: 'pending', isDemo: sampleMode });
      const view = publicUser(user); return send(response, 201, { user: view, token: createToken(user), expiresAt: new Date(Date.now() + sessionTtlMs).toISOString() });
    } catch (error) { if (error.code === 11000) return failure(response, 409, 'An account already uses this phone, email, or identity.'); throw error; }
  }
  if (request.method === 'GET' && path === '/api/auth/me') { const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']); return send(response, 200, { user }); }
  if (request.method === 'POST' && path === '/api/auth/logout') { const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']); await User.updateOne({ _id: user.id }, { $inc: { tokenVersion: 1 } }); realtime?.in(`user:${user.id}`).disconnectSockets(true); return send(response, 200, { success: true }); }
  const publicHandover = path.match(/^\/api\/handovers\/([^/]+)\/verify$/);
  if (request.method === 'GET' && publicHandover) {
    const record = await HandoverRecord.findOne({ handoverId: decodeURIComponent(publicHandover[1]) }).lean();
    if (!record) return failure(response, 404, 'Handover record was not found.');
    const publicRecord = handoverPublicFields(record);
    return send(response, 200, { verified: record.integrityHash === digest(publicRecord), fingerprint: record.integrityHash, isDemo: Boolean(record.isDemo), label: record.isDemo ? 'SAMPLE DATA · Simulated sample record' : 'Recorded handover', record: publicRecord });
  }
  if (path === '/api/notifications' && request.method === 'GET') {
    const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']);
    const records = await Notification.find({ userId: user.id, isDemo: user.isDemo }).sort({ createdAt: -1 }).limit(50).lean();
    return send(response, 200, { notifications: records.map((entry) => ({ id: String(entry._id), title: entry.title, message: entry.message, type: entry.type, time: entry.createdAt.toISOString(), readAt: entry.readAt, isDemo: entry.isDemo })) });
  }
  const markNotificationRead = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (request.method === 'POST' && markNotificationRead) {
    const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']);
    const record = await Notification.findOneAndUpdate({ _id: decodeURIComponent(markNotificationRead[1]), userId: user.id, isDemo: user.isDemo }, { $set: { readAt: new Date() } }, { new: true });
    if (!record) return failure(response, 404, 'Notification was not found.');
    return send(response, 200, { success: true, id: String(record._id), readAt: record.readAt });
  }
  if (path.startsWith('/api/admin/')) {
    const admin = await authorization(request, ['admin']);
    const transactions = await Transaction.find({ isDemo: admin.isDemo }).sort({ occurredAt: -1 }).limit(500).lean();
    const [accountRecords, facilityRecords] = await Promise.all([User.find({ isDemo: admin.isDemo }).select('name phone email role isActive isVerified isDemo').lean(), RecyclerFacility.find({ isDemo: admin.isDemo }).lean()]);
    const adminUsers = accountRecords.map((entry) => ({ id: String(entry._id), name: entry.name, phone: entry.phone, email: entry.email || '', role: entry.role, active: entry.isActive, verified: entry.isVerified, isDemo: entry.isDemo }));
    if (request.method === 'GET' && path === '/api/admin/overview') {
      const [lots, offers, recentActivity] = await Promise.all([
        ScrapLot.find({ isDemo: admin.isDemo }).sort({ createdAt: -1 }).limit(100).populate('collector', 'name').lean(),
        RecyclerOffer.find({ isDemo: admin.isDemo }).sort({ createdAt: -1 }).limit(100).populate('lot', 'material weightKg status location').populate('collector', 'name').populate('recycler', 'name recyclerProfile').lean(),
        Notification.find({ isDemo: admin.isDemo }).sort({ createdAt: -1 }).limit(50).lean()
      ]);
      const pickups = store.pickups.filter((pickup) => Boolean(pickup.isDemo) === admin.isDemo).slice(0, 200);
      const materialVolume = new Map(); const monthly = new Map(); const activity = new Map();
      for (const transaction of transactions) {
        const month = new Date(transaction.occurredAt).toISOString().slice(0, 7);
        const bucket = monthly.get(month) || { month, value: 0, paid: 0, pending: 0, transactions: 0 };
        bucket.value += Number(transaction.amount || 0); bucket.transactions += 1; bucket[transaction.status] = (bucket[transaction.status] || 0) + Number(transaction.amount || 0); monthly.set(month, bucket);
        const activityRow = activity.get(transaction.collectorId) || { id: transaction.collectorId, collections: 0, value: 0 };
        activityRow.collections += 1; activityRow.value += Number(transaction.amount || 0); activity.set(transaction.collectorId, activityRow);
        for (const material of transaction.materials || []) { const row = materialVolume.get(material.material) || { material: material.material, label: material.label || material.material, kg: 0, value: 0 }; row.kg += Number(material.weightKg || 0); row.value += Number(material.value || 0); materialVolume.set(material.material, row); }
      }
      const materials = store.materials.filter((entry) => Boolean(entry.isDemo) === admin.isDemo);
      const prices = store.prices.filter((entry) => Boolean(entry.isDemo) === admin.isDemo);
      const batches = store.batches.filter((entry) => Boolean(entry.isDemo) === admin.isDemo);
      const priceDates = new Map();
      for (const price of prices) { const entry = priceDates.get(price.date) || { date: price.date, sum: 0, count: 0, synthetic: false }; entry.sum += Number(price.amount || 0); entry.count += 1; priceDates.set(price.date, entry); }
      let priorPrice = null;
      const priceTrends = [...priceDates.values()].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => { const amount = Math.round((entry.sum / entry.count) * 100) / 100; const change = priorPrice === null ? 0 : Math.round((amount - priorPrice) * 100) / 100; priorPrice = amount; return { material: entry.date, amount, change, synthetic: entry.synthetic }; });
      const recyclerActivity = facilityRecords.map((entry) => ({ id: entry.facilityKey, name: entry.name, batches: batches.filter((batch) => batch.recyclerId === entry.facilityKey).length, processed: batches.filter((batch) => batch.recyclerId === entry.facilityKey && batch.status === 'processed').length, verified: entry.verificationStatus === 'verified' }));
      return send(response, 200, { synthetic: false, isDemo: admin.isDemo, label: admin.isDemo ? 'SAMPLE DATA · Simulated sample records.' : 'MongoDB production records.', summary: { users: adminUsers.length, recyclers: facilityRecords.length, requests: pickups.length, lots: await ScrapLot.countDocuments({ isDemo: admin.isDemo }), offers: await RecyclerOffer.countDocuments({ isDemo: admin.isDemo }), materialKg: [...materialVolume.values()].reduce((sum, row) => sum + row.kg, 0), transactionValue: transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0), completedTransactions: transactions.filter((row) => row.status === 'paid').length, pendingTransactions: transactions.filter((row) => row.status === 'pending').length }, users: adminUsers, recyclers: facilityRecords, materials, prices, pickups, lots, offers, recentActivity, transactions: transactions.slice(0, 100), materialVolume: [...materialVolume.values()].sort((a, b) => b.kg - a.kg), monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)), priceTrends, collectorActivity: [...activity.values()].map((row) => ({ ...row, name: accountRecords.find((u) => String(u._id) === row.id)?.name || row.id })), recyclerActivity });
    }
    if (request.method === 'GET' && path === '/api/admin/audit-logs') return send(response, 200, { logs: await AuditLog.find({ isDemo: admin.isDemo }).sort({ createdAt: -1 }).limit(200).lean() });
    const recyclerVerification = path.match(/^\/api\/admin\/recyclers\/([^/]+)\/verification$/);
    if (request.method === 'PATCH' && recyclerVerification) {
      const payload = await body(request); const id = decodeURIComponent(recyclerVerification[1]); const status = payload.status;
      if (!['verified', 'pending', 'unverified'].includes(status)) return failure(response, 400, 'Invalid verification status.');
      const facilityFilter = { isDemo: admin.isDemo, ...(mongoose.isValidObjectId(id) ? { $or: [{ facilityKey: id }, { userId: id }] } : { facilityKey: id }) };
      const target = await RecyclerFacility.findOneAndUpdate(facilityFilter, { $set: { verificationStatus: status } }, { new: true }); if (!target) return failure(response, 404, 'Recycler facility was not found.');
      await audit(admin, 'recycler.verification.updated', 'recycler', id, `Set recycler verification to ${status}.`); publishUpdate({ users: [target.userId], roles: ['admin'], resource: 'recyclers', action: 'verification-updated', entityId: id, isDemo: admin.isDemo }); return send(response, 200, target);
    }
    const userStatus = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (request.method === 'PATCH' && userStatus) {
      const payload = await body(request); const id = decodeURIComponent(userStatus[1]); const fields = {};
      if (typeof payload.isVerified === 'boolean') fields.isVerified = payload.isVerified;
      if (typeof payload.isActive === 'boolean') fields.isActive = payload.isActive;
      if (!Object.keys(fields).length || !mongoose.isValidObjectId(id)) return failure(response, 400, 'Provide isVerified or isActive for a valid account.');
      const target = await User.findOneAndUpdate({ _id: id, isDemo: admin.isDemo }, { $set: fields, ...(fields.isActive === false ? { $inc: { tokenVersion: 1 } } : {}) }, { new: true });
      if (!target) return failure(response, 404, 'User was not found.');
      await audit(admin, 'user.updated', 'user', id, `Updated account ${target.name}.`, fields); publishUpdate({ users: [id], roles: ['admin'], resource: 'users', action: 'updated', entityId: id, isDemo: admin.isDemo }); return send(response, 200, { id, name: target.name, role: target.role, isActive: target.isActive, isVerified: target.isVerified });
    }
    if (path === '/api/admin/users' && request.method === 'POST') {
      const payload = await body(request); const role = payload.role; const phone = safeText(payload.phone, 30); const name = safeText(payload.name, 100); const password = String(payload.password || '');
      if (!['household', 'collector', 'recycler'].includes(role) || !name || !/^\+?[0-9 ()-]{8,20}$/.test(phone) || password.length < 8 || password.length > 128) return failure(response, 400, 'Provide a supported role, name, valid phone, and password with at least 8 characters.');
      const account = { name, phone, role, isDemo: admin.isDemo, passwordHash: await passwordHash(password), profile: { subtitle: safeText(payload.subtitle, 120), ward: safeText(payload.ward, 120), eShramNo: safeText(payload.eShramNo, 80) || undefined } };
      if (payload.email) account.email = safeText(payload.email, 180).toLowerCase(); if (payload.identity) account.identity = safeText(payload.identity, 100);
      if (role === 'recycler') { account.recyclerProfile = { facilityName: safeText(payload.facilityName, 120), acceptedMaterials: Array.isArray(payload.acceptedMaterials) ? payload.acceptedMaterials.filter((v) => typeof v === 'string').slice(0, 30) : [], location: { city: safeText(payload.city, 100) } }; if (!account.recyclerProfile.location.city || !account.recyclerProfile.facilityName) return failure(response, 400, 'Recycler facility name and city are required.'); }
      try { const target = await User.create(account); if (role === 'recycler') await RecyclerFacility.create({ facilityKey: String(target._id), userId: target._id, name: account.recyclerProfile.facilityName, city: account.recyclerProfile.location.city, acceptedMaterials: account.recyclerProfile.acceptedMaterials, active: true, verificationStatus: 'pending', isDemo: admin.isDemo }); await audit(admin, 'user.created', 'user', String(target._id), `Created ${role} account.`); publishUpdate({ roles: ['admin'], resource: 'users', action: 'created', entityId: String(target._id), isDemo: admin.isDemo }); return send(response, 201, { user: publicUser(target) }); }
      catch (error) { if (error.code === 11000) return failure(response, 409, 'An account already uses this phone, email, or identity.'); throw error; }
    }
    if (path === '/api/admin/materials' && request.method === 'POST') {
      const payload = await body(request); if (!String(payload.name || '').trim() || !String(payload.category || '').trim()) return failure(response, 400, 'Material name and category are required.');
      const material = { id: makeId('MAT'), name: String(payload.name).trim(), category: String(payload.category).trim(), unit: String(payload.unit || 'kg'), active: true, isDemo: admin.isDemo }; store.materials.push(material); await saveStore(); await audit(admin, 'material.created', 'material', material.id, `Created material ${material.name}.`); return send(response, 201, material);
    }
    const materialRoute = path.match(/^\/api\/admin\/materials\/([^/]+)$/);
    if (materialRoute && ['PATCH', 'DELETE'].includes(request.method)) {
      const id = decodeURIComponent(materialRoute[1]); const index = store.materials.findIndex((entry) => entry.id === id && Boolean(entry.isDemo) === admin.isDemo); if (index < 0) return failure(response, 404, 'Material was not found.');
      if (request.method === 'DELETE') { const [removed] = store.materials.splice(index, 1); store.prices = store.prices.filter((price) => price.materialId !== id || Boolean(price.isDemo) !== admin.isDemo); await saveStore(); await audit(admin, 'material.deleted', 'material', id, `Deleted material ${removed.name}.`); return send(response, 200, { success: true }); }
      const payload = await body(request); store.materials[index] = { ...store.materials[index], ...Object.fromEntries(['name', 'category', 'unit', 'active'].filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]])) }; await saveStore(); await audit(admin, 'material.updated', 'material', id, `Updated material ${store.materials[index].name}.`); return send(response, 200, store.materials[index]);
    }
    if (path === '/api/admin/prices' && request.method === 'POST') {
      const payload = await body(request); if (!store.materials.some((entry) => entry.id === payload.materialId && Boolean(entry.isDemo) === admin.isDemo) || !Number.isFinite(Number(payload.amount)) || Number(payload.amount) < 0 || !String(payload.location || '').trim()) return failure(response, 400, 'A valid material, non-negative amount, and location are required.');
      const price = { id: makeId('PRICE'), materialId: payload.materialId, amount: Number(payload.amount), location: String(payload.location).trim(), date: new Date().toISOString().slice(0, 10), source: 'Admin entry', synthetic: false, isDemo: admin.isDemo }; store.prices.push(price); await saveStore(); await audit(admin, 'price.created', 'price', price.id, `Added ${price.amount} price observation.`); return send(response, 201, price);
    }
    const priceRoute = path.match(/^\/api\/admin\/prices\/([^/]+)$/);
    if (priceRoute && ['PATCH', 'DELETE'].includes(request.method)) {
      const id = decodeURIComponent(priceRoute[1]); const index = store.prices.findIndex((entry) => entry.id === id && Boolean(entry.isDemo) === admin.isDemo); if (index < 0) return failure(response, 404, 'Price observation was not found.');
      if (request.method === 'DELETE') { store.prices.splice(index, 1); await saveStore(); await audit(admin, 'price.deleted', 'price', id, 'Deleted price observation.'); return send(response, 200, { success: true }); }
      const payload = await body(request); if (payload.amount !== undefined && (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) < 0)) return failure(response, 400, 'Price amount must be non-negative.');
      store.prices[index] = { ...store.prices[index], ...Object.fromEntries(['amount', 'location', 'date'].filter((key) => payload[key] !== undefined).map((key) => [key, key === 'amount' ? Number(payload[key]) : String(payload[key])])), synthetic: false, source: 'Admin entry' }; await saveStore(); await audit(admin, 'price.updated', 'price', id, 'Updated price observation.'); return send(response, 200, store.prices[index]);
    }
    return failure(response, 404, 'Admin route was not found.');
  }
  if (request.method === 'GET' && path === '/api/bootstrap') {
    const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']);
    const [collectorUsers, recyclerUsers, facilities, transactions] = await Promise.all([
      User.find({ role: 'collector', isActive: true, isDemo: user.isDemo }).lean(), User.find({ role: 'recycler', isActive: true, isDemo: user.isDemo }).lean(), RecyclerFacility.find({ active: true, isDemo: user.isDemo }).lean(),
      Transaction.find({ isDemo: user.isDemo }).select('collectorId weightKg amount occurredAt status').lean()
    ]);
    const facilityByUser = new Map(facilities.map((facility) => [String(facility.userId || facility.facilityKey), facility]));
    const collectorDirectory = collectorUsers.map((account) => {
      const userId = String(account._id); const rows = transactions.filter((entry) => entry.collectorId === userId);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0); const todayRows = rows.filter((entry) => new Date(entry.occurredAt) >= todayStart);
      return toCollector(account, { totalPickups: rows.length, totalWasteKg: rows.reduce((s, row) => s + Number(row.weightKg || 0), 0), monthlyEarnings: rows.filter((row) => new Date(row.occurredAt).getMonth() === new Date().getMonth()).reduce((s, row) => s + Number(row.amount || 0), 0), todayPickups: todayRows.length, todayEarnings: todayRows.reduce((s, row) => s + Number(row.amount || 0), 0), pendingRequestsCount: store.pickups.filter((p) => Boolean(p.isDemo) === user.isDemo && p.status === 'requested' && !p.assignedCollectorId).length });
    });
    const recyclerDirectory = recyclerUsers.map((account) => toRecycler(account, facilityByUser.get(String(account._id)), { processedWeightKg: store.batches.filter((batch) => batch.recyclerId === String(account._id) && batch.status === 'processed').reduce((s, batch) => s + Number(batch.totalWeightKg || 0), 0), eprCreditsIssued: store.batches.filter((batch) => batch.recyclerId === String(account._id) && batch.eprCreditCertificateNo).length }));
    const visiblePickups = store.pickups.filter((p) => Boolean(p.isDemo) === user.isDemo).filter((p) => user.role === 'admin' || (user.role === 'collector' && (p.assignedCollectorId === user.id || (p.status === 'requested' && !p.assignedCollectorId))) || (user.role === 'household' && p.householdId === user.id));
    const visibleBatches = store.batches.filter((b) => Boolean(b.isDemo) === user.isDemo).filter((b) => user.role === 'admin' || (user.role === 'collector' && (b.collectorIds || []).includes(user.id)) || (user.role === 'recycler' && b.recyclerId === user.id));
    const visibleCollectors = user.role === 'admin' ? collectorDirectory : user.role === 'household' ? collectorDirectory.filter((collector) => collector.isVerified).map(({ govtIdNumber, ...collector }) => ({ ...collector, govtIdNumber: '' })) : collectorDirectory.filter((collector) => collector.id === user.id);
    return send(response, 200, { pickups: visiblePickups, collectors: visibleCollectors, recyclers: user.role === 'recycler' ? recyclerDirectory.filter((r) => r.id === user.id) : recyclerDirectory.map(({ phone, email, contactPerson, ...r }) => r), batches: visibleBatches, materials: store.materials.filter((material) => material.active !== false && Boolean(material.isDemo) === user.isDemo).map((material) => ({ ...material, ratePerKg: latestRate(material.id, user.isDemo) })), prices: store.prices.filter((price) => !price.synthetic && Boolean(price.isDemo) === user.isDemo), notifications: [] });
  }
  if (request.method === 'GET' && path === '/api/catalog') { const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']); return send(response, 200, { materials: store.materials.filter((material) => material.active !== false && Boolean(material.isDemo) === user.isDemo).map((material) => ({ ...material, ratePerKg: latestRate(material.id, user.isDemo) })), prices: store.prices.filter((price) => !price.synthetic && Boolean(price.isDemo) === user.isDemo) }); }
  if (request.method === 'GET' && path === '/api/collector/ledger') {
    const user = await authorization(request, ['collector']);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const status = url.searchParams.get('status');
    const material = url.searchParams.get('material');
    const filter = { collectorId: user.id, isDemo: user.isDemo };
    if (from) { const date = new Date(from); if (!Number.isFinite(date.getTime())) return failure(response, 400, 'Invalid start date.'); filter.occurredAt = { ...(filter.occurredAt || {}), $gte: date }; }
    if (to) { const date = new Date(to); if (!Number.isFinite(date.getTime())) return failure(response, 400, 'Invalid end date.'); date.setUTCHours(23, 59, 59, 999); filter.occurredAt = { ...(filter.occurredAt || {}), $lte: date }; }
    if (status && ['pending', 'paid', 'failed'].includes(status)) filter.status = status;
    if (material) filter['materials.material'] = material;
    const rows = await Transaction.find(filter).sort({ occurredAt: -1 }).limit(500).lean();
    const paymentIds = rows.map((row) => row.payment).filter(Boolean);
    const payments = await Payment.find({ _id: { $in: paymentIds } }).select('paymentId method provider status paidAt').lean();
    const paymentById = new Map(payments.map((payment) => [String(payment._id), payment]));
    const transactions = rows.map((row) => ({
      transactionId: row.transactionId,
      pickupId: row.pickupId,
      occurredAt: row.occurredAt,
      materials: row.materials,
      weightKg: row.weightKg,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      payment: (() => { const payment = paymentById.get(String(row.payment)) || {}; return { paymentId: payment.paymentId || '', method: payment.method || 'Unknown', provider: payment.provider || 'unconfigured', status: payment.status || row.status, paidAt: payment.paidAt || null }; })()
    }));
    const summary = { totalEarnings: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0, transactionCount: rows.length, totalWeightKg: 0 };
    const monthMap = new Map(); const materialMap = new Map();
    for (const row of rows) {
      summary.totalEarnings += Number(row.amount || 0);
      summary.totalWeightKg += Number(row.weightKg || 0);
      if (row.status === 'paid') summary.paidAmount += Number(row.amount || 0);
      else if (row.status === 'failed') summary.failedAmount += Number(row.amount || 0);
      else summary.pendingAmount += Number(row.amount || 0);
      const month = new Date(row.occurredAt).toISOString().slice(0, 7);
      const monthly = monthMap.get(month) || { month, total: 0, paid: 0, pending: 0, failed: 0 };
      monthly.total += Number(row.amount || 0); monthly[row.status] += Number(row.amount || 0); monthMap.set(month, monthly);
      for (const item of row.materials || []) {
        if (material && item.material !== material) continue;
        const key = item.material || 'other'; const aggregate = materialMap.get(key) || { material: key, label: item.label || key, amount: 0, weightKg: 0, transactions: 0 };
        aggregate.amount += Number(item.value || 0); aggregate.weightKg += Number(item.weightKg || 0); aggregate.transactions += 1; materialMap.set(key, aggregate);
      }
    }
    for (const key of Object.keys(summary).filter((name) => name.endsWith('Amount') || name === 'totalEarnings')) summary[key] = Math.round(summary[key] * 100) / 100;
    summary.totalWeightKg = Math.round(summary.totalWeightKg * 10) / 10;
    const monthly = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));
    const byMaterial = [...materialMap.values()].sort((a, b) => b.amount - a.amount).map((entry) => ({ ...entry, amount: Math.round(entry.amount * 100) / 100, weightKg: Math.round(entry.weightKg * 10) / 10 }));
    const materialOptions = await Transaction.distinct('materials.material', { collectorId: user.id, isDemo: user.isDemo });
    return send(response, 200, { summary, monthly, byMaterial, transactions, materialOptions });
  }
  if (path === '/api/lots' && ['GET', 'POST'].includes(request.method)) {
    const user = await authorization(request, ['collector']);
    if (request.method === 'GET') {
      const rows = await ScrapLot.find({ collector: user.id, isDemo: user.isDemo }).sort({ createdAt: -1 }).limit(100).lean();
      return send(response, 200, { lots: rows });
    }
    const collector = await User.findOne({ _id: user.id, isActive: true, isVerified: true, isDemo: user.isDemo }).lean();
    if (!collector) return failure(response, 403, 'An active, verified collector is required to create a marketplace lot.');
    const payload = await body(request); const material = normalizeMaterial(safeText(payload.material, 60));
    const weightKg = Number(payload.weightKg); const condition = payload.condition;
    const address = safeText(payload.address, 250); const city = safeText(payload.city, 80);
    const activeMaterial = store.materials.find((entry) => entry.id === material && entry.active !== false && Boolean(entry.isDemo) === user.isDemo);
    const allowedMaterials = ['paper', 'cardboard', 'pet_plastic', 'hdpe', 'metal', 'aluminium', 'copper', 'e_waste', 'glass'];
    if (!activeMaterial || !allowedMaterials.includes(material) || !Number.isFinite(weightKg) || weightKg < 0.1 || weightKg > 10_000 || !['clean', 'mixed', 'damaged'].includes(condition) || !address || !city) return failure(response, 400, 'Choose an active material, provide valid weight, condition, address, and city.');
    const quotedRate = latestRate(material, user.isDemo); const estimatedValue = Math.round(weightKg * quotedRate * 100) / 100;
    const batchId = makeId('BATCH');
    const lot = await ScrapLot.create({ collector: user.id, sourceBatchId: batchId, material, weightKg, condition, location: { address, city }, estimatedValue, quotedRate, status: 'listed', isDemo: user.isDemo });
    store.batches.unshift({ id: batchId, directLotId: String(lot._id), materialType: activeMaterial.name, totalWeightKg: weightKg, quotedValue: estimatedValue, sourceWasteIds: [], collectorIds: [user.id], sortingCenterHub: '', recyclerId: '', recyclerName: '', recyclerCity: '', receivedAt: new Date(), purityGrade: 'Unassessed', status: 'inbound', co2SavedKg: 0, waterSavedLitres: 0, isDemo: user.isDemo });
    await saveStore();
    const facilityUsers = await RecyclerFacility.find({ active: true, verificationStatus: 'verified', isDemo: user.isDemo, acceptedMaterials: material }).distinct('userId');
    publishUpdate({ users: [user.id, ...facilityUsers.map(String)], roles: ['admin'], resource: 'marketplace', action: 'lot-listed', isDemo: user.isDemo });
    publishUpdate({ roles: ['recycler'], resource: 'marketplace', action: 'lot-listed', isDemo: user.isDemo });
    await createNotifications(facilityUsers, { title: 'New matching scrap lot', message: `${activeMaterial.name} · ${weightKg} kg in ${city} is available for an offer.`, type: 'info', resource: 'marketplace', isDemo: user.isDemo });
    return send(response, 201, { lot, batchId });
  }
  const settlePayment = path.match(/^\/api\/ledger\/payments\/([^/]+)\/mark-paid$/);
  if (request.method === 'POST' && settlePayment) {
    const admin = await authorization(request, ['admin']);
    const payment = await Payment.findOneAndUpdate({ paymentId: decodeURIComponent(settlePayment[1]), status: 'pending', isDemo: admin.isDemo }, { $set: { status: 'paid', paidAt: new Date(), 'metadata.settlementSource': 'admin_manual' } }, { new: true });
    if (!payment) return failure(response, 404, 'Pending payment was not found.');
    await Transaction.updateOne({ payment: payment._id, status: 'pending', isDemo: admin.isDemo }, { $set: { status: 'paid' } });
    publishUpdate({ users: [payment.collectorId], roles: ['admin'], resource: 'payments', action: 'paid', entityId: payment.paymentId, isDemo: admin.isDemo });
    await createNotifications([payment.collectorId], { title: 'Payment status updated', message: 'An administrator recorded this payment as paid.', type: 'success', resource: 'payments', entityId: payment.paymentId, isDemo: admin.isDemo });
    await audit(admin, 'payment.settled', 'payment', payment.paymentId, `Payment ${payment.paymentId} marked paid.`);
    return send(response, 200, { success: true, paymentId: payment.paymentId, status: payment.status, paidAt: payment.paidAt });
  }
  if (path.startsWith('/api/offers')) {
    const user = await authorization(request, ['collector', 'recycler', 'admin']);
    const facility = user.role === 'recycler' ? await RecyclerFacility.findOne({ userId: user.id, active: true, isDemo: user.isDemo }).lean() : null;
    if (user.role === 'recycler' && !facility) return failure(response, 403, 'An active recycler facility is required to use the marketplace.');
    if (request.method === 'GET' && path === '/api/offers/marketplace') {
      if (user.role !== 'recycler' && user.role !== 'admin') return failure(response, 403, 'Recycler access is required.');
      const filter = { status: 'listed', isDemo: user.isDemo }; const material = safeText(url.searchParams.get('material'), 60); const city = safeText(url.searchParams.get('city'), 100);
      if (user.role === 'recycler') filter.material = { $in: (facility.acceptedMaterials || []).map(normalizeMaterial) };
      if (material) {
        const normalizedMaterial = normalizeMaterial(material);
        if (user.role === 'recycler' && !(facility.acceptedMaterials || []).map(normalizeMaterial).includes(normalizedMaterial)) return send(response, 200, { data: [] });
        filter.material = normalizedMaterial;
      }
      if (city) filter['location.city'] = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const lots = await ScrapLot.find(filter).sort({ createdAt: -1 }).limit(200).populate('collector', 'name').lean();
      return send(response, 200, { data: lots.map((lot) => ({ ...lot, collectorName: lot.collector?.name || '', collector: undefined })) });
    }
    if (request.method === 'GET' && path === '/api/offers') {
      const filter = { isDemo: user.isDemo, ...(user.role === 'admin' ? {} : user.role === 'collector' ? { collector: user.id } : { recycler: user.id }) };
      return send(response, 200, { data: await RecyclerOffer.find(filter).sort({ createdAt: -1 }).limit(300).populate('lot').populate('collector', 'name phone').populate('recycler', 'name recyclerProfile').lean() });
    }
    const createOffer = path.match(/^\/api\/offers\/([^/]+)$/);
    if (request.method === 'POST' && createOffer) {
      if (user.role !== 'recycler') return failure(response, 403, 'Recycler access is required.');
      if (facility.verificationStatus !== 'verified') return failure(response, 403, 'Recycler facility verification is required before making offers.');
      const lot = await ScrapLot.findOne({ _id: decodeURIComponent(createOffer[1]), isDemo: user.isDemo }); if (!lot || lot.status !== 'listed') return failure(response, 404, 'Available scrap lot was not found.');
      if (!facility.acceptedMaterials.includes(lot.material)) return failure(response, 403, 'This facility is not configured to accept this material.');
      const payload = await body(request); const amount = Number(payload.amount); if (!Number.isFinite(amount) || amount <= 0) return failure(response, 400, 'Offer amount must be greater than zero.');
      let offer; try { offer = await RecyclerOffer.create({ lot: lot._id, collector: lot.collector, recycler: user.id, amount, note: safeText(payload.note, 500), isDemo: user.isDemo, history: [{ status: 'pending', actor: user.id, note: 'Offer submitted.' }] }); }
      catch (error) { if (error.code === 11000) return failure(response, 409, 'An offer already exists for this facility and lot.'); throw error; }
      publishUpdate({ users: [String(lot.collector), user.id], roles: ['admin'], resource: 'offers', action: 'received', entityId: String(offer._id), isDemo: user.isDemo });
      await createNotifications([String(lot.collector)], { title: 'New recycler offer', message: `${user.name} offered ₹${amount.toLocaleString('en-IN')} for your ${lot.material} lot (${lot.weightKg} kg).`, resource: 'offers', entityId: String(offer._id), isDemo: user.isDemo });
      return send(response, 201, offer);
    }
    const offerAction = path.match(/^\/api\/offers\/([^/]+)\/(accept|decline|schedule|received)$/);
    if (offerAction && request.method === 'POST') {
      const offer = await RecyclerOffer.findOne({ _id: decodeURIComponent(offerAction[1]), isDemo: user.isDemo }); if (!offer) return failure(response, 404, 'Offer was not found.');
      if (user.role === 'collector' && String(offer.collector) !== user.id) return failure(response, 403, 'This offer belongs to another collector.');
      if (user.role === 'recycler' && String(offer.recycler) !== user.id) return failure(response, 403, 'This offer belongs to another recycler.');
      const payload = await body(request); const action = offerAction[2]; const affectedHouseholdIds = [];
      if (action === 'accept' || action === 'decline') {
        if (user.role !== 'collector' && user.role !== 'admin') return failure(response, 403, 'Collector access is required.');
        if (offer.status !== 'pending') return failure(response, 409, 'Only pending offers can be updated.');
        if (action === 'accept') {
          const reservedLot = await ScrapLot.findOneAndUpdate({ _id: offer.lot, status: 'listed', isDemo: user.isDemo }, { $set: { status: 'matched', selectedRecycler: offer.recycler } }, { new: true });
          if (!reservedLot) return failure(response, 409, 'This scrap lot is no longer available.');
        }
        offer.status = action === 'accept' ? 'accepted' : 'declined'; offer.history.push({ status: offer.status, actor: user.id, note: '' }); await offer.save();
        if (action === 'accept') {
          await RecyclerOffer.updateMany({ lot: offer.lot, _id: { $ne: offer._id }, status: 'pending' }, { $set: { status: 'declined' }, $push: { history: { status: 'declined', actor: user.id, note: 'Another offer was accepted.' } } });
          const lot = await ScrapLot.findOne({ _id: offer.lot, isDemo: user.isDemo }).lean(); const facility = await RecyclerFacility.findOne({ userId: offer.recycler, isDemo: user.isDemo }).lean();
          const batch = lot?.sourceBatchId ? store.batches.find((item) => item.id === lot.sourceBatchId && Boolean(item.isDemo) === user.isDemo) : lot?.sourcePickupId && store.batches.find((item) => item.sourceWasteIds.includes(lot.sourcePickupId) && Boolean(item.isDemo) === user.isDemo);
          if (batch) { Object.assign(batch, { recyclerId: String(offer.recycler), recyclerName: facility?.name || '', recyclerCity: facility?.city || '' }); await saveStore(); }
        }
        publishUpdate({ users: [String(offer.recycler), String(offer.collector)], roles: ['admin'], resource: 'offers', action: offer.status, entityId: String(offer._id), isDemo: user.isDemo });
        if (action === 'accept') await createNotifications([String(offer.recycler)], { title: 'Your offer was accepted', message: 'The collector accepted your offer. Continue with pickup scheduling.', type: 'success', resource: 'offers', entityId: String(offer._id), isDemo: user.isDemo });
        return send(response, 200, offer);
      }
      if (action === 'schedule') {
        if (user.role !== 'recycler') return failure(response, 403, 'Recycler access is required.');
        const scheduledFor = new Date(payload.scheduledFor); if (offer.status !== 'accepted' || !Number.isFinite(scheduledFor.getTime()) || scheduledFor.getTime() < Date.now()) return failure(response, 400, 'Choose a valid future pickup time for an accepted offer.');
        offer.status = 'pickup_scheduled'; offer.scheduledFor = scheduledFor; offer.pickupNote = safeText(payload.note, 500); offer.history.push({ status: offer.status, actor: user.id, note: offer.pickupNote }); await offer.save(); await ScrapLot.updateOne({ _id: offer.lot, isDemo: user.isDemo }, { $set: { status: 'pickup_scheduled' } });
        await createNotifications([String(offer.collector)], { title: 'Recycler pickup scheduled', message: `${user.name} scheduled collection for ${scheduledFor.toLocaleString('en-IN')}.`, type: 'info', resource: 'pickups', entityId: String(offer._id), isDemo: user.isDemo });
        const scheduledLot = await ScrapLot.findOne({ _id: offer.lot, isDemo: user.isDemo }).select('sourcePickupId material').lean();
        const householdPickup = scheduledLot?.sourcePickupId && store.pickups.find((pickup) => pickup.id === scheduledLot.sourcePickupId && Boolean(pickup.isDemo) === user.isDemo);
        if (householdPickup) { affectedHouseholdIds.push(String(householdPickup.householdId)); await createNotifications([String(householdPickup.householdId)], { title: 'Recycler collection scheduled', message: `${user.name} scheduled the recycler handover for your collected ${scheduledLot.material || 'recyclable'} waste.`, type: 'info', resource: 'pickups', entityId: householdPickup.id, isDemo: user.isDemo }); }
      } else {
        if (user.role !== 'recycler') return failure(response, 403, 'Recycler access is required.');
        const receivedWeightKg = Number(payload.receivedWeightKg); if (!['accepted', 'pickup_scheduled'].includes(offer.status) || !Number.isFinite(receivedWeightKg) || receivedWeightKg <= 0) return failure(response, 400, 'A valid received weight is required for an accepted offer.');
        offer.status = 'received'; offer.receivedWeightKg = receivedWeightKg; offer.history.push({ status: 'received', actor: user.id, note: '' }); await offer.save(); await ScrapLot.updateOne({ _id: offer.lot, isDemo: user.isDemo }, { $set: { status: 'settled' } });
        const lot = await ScrapLot.findOne({ _id: offer.lot, isDemo: user.isDemo }).lean(); const batch = lot?.sourceBatchId ? store.batches.find((item) => item.id === lot.sourceBatchId && Boolean(item.isDemo) === user.isDemo) : lot?.sourcePickupId && store.batches.find((item) => item.sourceWasteIds.includes(lot.sourcePickupId) && Boolean(item.isDemo) === user.isDemo);
        if (batch) {
          batch.totalWeightKg = receivedWeightKg; batch.status = 'received'; batch.receivedAt = new Date(); batch.quotedValue = offer.amount;
          const handover = await recordHandover(batch, new Date()); batch.handoverId = handover.handoverId;
          const relatedPickups = store.pickups.filter((pickup) => (batch.sourceWasteIds || []).includes(pickup.id) && Boolean(pickup.isDemo) === user.isDemo);
          for (const pickup of relatedPickups) { pickup.status = 'at_sorting'; pickup.timeline.push(event('sorting_hub', 'Recycler Handover Confirmed', `${receivedWeightKg} kg received by ${user.name}.`, pickup.address, user.name, 'Recycler', `${receivedWeightKg} kg`)); affectedHouseholdIds.push(String(pickup.householdId)); }
          if (!lot.sourcePickupId && !batch.transactionId) {
            const now = new Date(); const transactionId = makeId('TXN'); const paymentId = makeId('PAY');
            const payment = await Payment.create({ paymentId, transactionId, collectorId: String(offer.collector), amount: offer.amount, method: 'UPI', provider: 'unconfigured', idempotencyKey: `lot:${String(lot._id)}`, status: 'pending', metadata: { source: 'recycler_handover', isDemo: user.isDemo }, isDemo: user.isDemo });
            await Transaction.create({ transactionId, pickupId: `LOT-${String(lot._id)}`, collectorId: String(offer.collector), materials: [{ material: lot.material, label: lot.material, weightKg: receivedWeightKg, value: offer.amount }], weightKg: receivedWeightKg, amount: offer.amount, currency: 'INR', status: 'pending', payment: payment._id, occurredAt: now, isDemo: user.isDemo });
            batch.transactionId = transactionId;
          }
          await saveStore();
          const admins = await User.find({ role: 'admin', isActive: true, isDemo: user.isDemo }).distinct('_id');
          await createNotifications([String(offer.collector), user.id, ...admins.map(String), ...affectedHouseholdIds], { title: 'Handover confirmed', message: `${receivedWeightKg} kg of ${lot.material} was received by ${user.name}.`, type: 'success', resource: 'handovers', entityId: String(offer._id), isDemo: user.isDemo });
          await createNotifications([String(offer.collector)], { title: 'Transaction recorded', message: `₹${offer.amount.toLocaleString('en-IN')} is recorded as pending until payment settlement.`, resource: 'payments', entityId: batch.transactionId || String(offer._id), isDemo: user.isDemo });
        }
      }
      publishUpdate({ users: [String(offer.collector), String(offer.recycler), ...affectedHouseholdIds], roles: ['admin'], resource: action === 'schedule' ? 'pickups' : 'handovers', action: action === 'schedule' ? 'pickup_scheduled' : 'received', entityId: String(offer._id), isDemo: user.isDemo });
      return send(response, 200, offer);
    }
    return failure(response, 404, 'Offer route was not found.');
  }
  if (request.method === 'GET' && recyclerMatches) {
    const user = await authorization(request, ['collector', 'admin']);
    const pickup = pickupById(decodeURIComponent(recyclerMatches[1]));
    if (Boolean(pickup.isDemo) !== user.isDemo) return failure(response, 404, 'Pickup was not found.');
    if (user.role !== 'admin' && pickup.assignedCollectorId !== user.id) return failure(response, 403, 'Only the assigned collector can view recycler matches for this pickup.');
    const requestMaterials = (pickup.items || []).map((item) => ({
      material: normalizeMaterial(item.categoryId || item.materialId || ''),
      weightKg: Number(item.estimatedKg || 0)
    })).filter((item) => item.material && item.weightKg > 0);
    if (!requestMaterials.length) return send(response, 200, { pickupId: pickup.id, strategy: 'weighted-v1', weights: {}, matches: [] });

    const acceptedMaterials = [...new Set(requestMaterials.map((item) => item.material))];
    const city = String(pickup.city || '').trim();
    const hasPickupCoordinates = typeof pickup.lng === 'number' && Number.isFinite(pickup.lng) && typeof pickup.lat === 'number' && Number.isFinite(pickup.lat);
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const legacyAliases = Object.keys(materialAliases).filter((material) => acceptedMaterials.includes(normalizeMaterial(material)));
    const facilities = await RecyclerFacility.find({
      active: true,
      isDemo: user.isDemo,
      verificationStatus: 'verified',
      acceptedMaterials: { $in: [...acceptedMaterials, ...legacyAliases] },
      $or: [
        { 'location.point.coordinates': { $exists: true } },
        ...(city ? [{ city: { $regex: `^${escapedCity}$`, $options: 'i' } }] : [])
      ]
    }).lean();
    const candidates = facilities.map((facility) => {
      const coordinates = facility.location?.point?.coordinates;
      const facilityCoordinatesValid = Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every((value) => Number.isFinite(Number(value)));
      const distanceKm = facilityCoordinatesValid && hasPickupCoordinates ? haversineKm([Number(pickup.lng), Number(pickup.lat)], coordinates.map(Number)) : undefined;
      const accepted = [...new Set((facility.acceptedMaterials || []).map(normalizeMaterial))];
      const priceRates = Object.fromEntries((facility.priceRates || []).map((rate) => [normalizeMaterial(rate.material), Number(rate.ratePerKg)]));
      return { ...facility, acceptedMaterials: accepted, distanceKm, priceRates, hasPriceData: (facility.priceRates || []).length > 0, city: facility.city };
    });
    const referenceValue = (pickup.items || []).reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);
    const result = evaluateWeightedMatches({ requestMaterials, facilityCandidates: candidates, referenceValue, requestedCity: city });
    const matches = result.matches.slice(0, 10).map(({ facility, ...match }) => ({
      facilityId: facility.facilityKey,
      name: facility.name,
      city: facility.city,
      distanceKm: Number.isFinite(facility.distanceKm) ? Math.round(facility.distanceKm * 10) / 10 : null,
      serviceRadiusKm: facility.serviceRadiusKm,
      verificationStatus: facility.verificationStatus,
      compatibleMaterials: match.compatibleMaterials,
      score: match.score,
      reasons: match.reasons
    }));
    return send(response, 200, { pickupId: pickup.id, strategy: result.strategy, weights: result.weights, matches });
  }
  if (request.method === 'POST' && path === '/api/pickups') {
    const user = await authorization(request, ['household', 'admin']); const payload = await body(request);
    const condition = payload.household?.condition;
    if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 10 || !safeText(payload.household?.name, 100) || !safeText(payload.household?.address, 250) || !safeText(payload.household?.city, 80) || !['clean', 'mixed', 'damaged'].includes(condition)) return failure(response, 400, 'Provide materials, customer name, a valid condition, pickup address, and city.');
    const activeMaterials = new Set(store.materials.filter((material) => material.active !== false && Boolean(material.isDemo) === user.isDemo).map((material) => normalizeMaterial(material.id)));
    const items = payload.items.map((item) => { const categoryId = normalizeMaterial(safeText(item.categoryId, 60)); const estimatedKg = Number(item.estimatedKg); const ratePerKg = latestRate(categoryId, user.isDemo); return { categoryId, categoryName: safeText(item.categoryName, 100) || categoryId, estimatedKg, ratePerKg, estimatedValue: Math.round(estimatedKg * ratePerKg * 100) / 100 }; }).filter((item) => activeMaterials.has(item.categoryId) && Number.isFinite(item.estimatedKg) && item.estimatedKg > 0 && item.estimatedKg <= 10_000);
    if (!items.length) return failure(response, 400, 'Material weight must be greater than zero.');
    const assigned = payload.collectorId && mongoose.isValidObjectId(payload.collectorId) ? await User.findOne({ _id: payload.collectorId, role: 'collector', isActive: true, isVerified: true, isDemo: user.isDemo }).lean() : null;
    const now = new Date().toISOString(); const id = makeId('KC');
    const totalEstimatedKg = items.reduce((total, item) => total + item.estimatedKg, 0);
    const totalEstimatedValue = items.reduce((total, item) => total + item.estimatedValue, 0);
    const city = safeText(payload.household.city, 80); const pickup = { id, householdId: user.id, householdName: safeText(payload.household.name, 100) || user.name, householdPhone: safeText(payload.household.phone, 30) || user.phone, address: safeText(payload.household.address, 250), city, ward: safeText(payload.household.ward, 100), pincode: safeText(payload.household.pincode, 12), condition, lat: Number.isFinite(Number(payload.household.latitude)) ? Number(payload.household.latitude) : null, lng: Number.isFinite(Number(payload.household.longitude)) ? Number(payload.household.longitude) : null, items, totalEstimatedKg, totalEstimatedValue, status: 'requested', preferredDate: safeText(payload.household.date, 10), preferredTimeSlot: safeText(payload.household.slot, 60), notes: safeText(payload.household.notes, 500), assignedCollectorId: assigned ? String(assigned._id) : undefined, assignedCollectorName: assigned?.name, assignedCollectorPhone: assigned?.phone, createdAt: now, scheduledAt: safeText(payload.household.date, 10) || null, verificationPin: String(randomInt(1000, 10000)), qrCodeData: `/track/${id}`, cryptographicHash: digest({ id, now, items, condition }), isDemo: user.isDemo, timeline: [event('request_created', 'Recyclable Waste Pickup Requested', `${totalEstimatedKg} kg of recyclables requested. Waste condition: ${condition}.`, safeText(payload.household.address, 250), user.name, 'Household')] };
    store.pickups.unshift(pickup); await saveStore(); publishUpdate({ users: [user.id, ...(assigned ? [String(assigned._id)] : [])], roles: assigned ? ['admin'] : ['collector', 'admin'], resource: 'pickups', action: 'created', entityId: id, isDemo: user.isDemo });
    const eligibleCollectors = assigned ? [String(assigned._id)] : await User.find({ role: 'collector', isActive: true, isVerified: true, isDemo: user.isDemo }).distinct('_id').then((ids) => ids.map(String));
    if (eligibleCollectors.length) await createNotifications(eligibleCollectors, { title: 'New customer pickup request', message: `${totalEstimatedKg} kg of ${items.map((item) => item.categoryName).join(', ')} requested in ${city}.`, resource: 'pickups', entityId: id, isDemo: user.isDemo });
    return send(response, 201, pickup);
  }
  const pickupMatch = path.match(/^\/api\/pickups\/([^/]+)(?:\/(accept|complete))?$/);
  if (pickupMatch) {
    const pickup = pickupById(decodeURIComponent(pickupMatch[1])); const action = pickupMatch[2];
    if (request.method === 'GET' && !action) {
      const user = await authorization(request, ['household', 'collector', 'recycler', 'admin']);
      if (Boolean(pickup.isDemo) !== user.isDemo) return failure(response, 404, 'Pickup was not found.');
      const recyclerCanRead = user.role === 'recycler' && store.batches.some((batch) => Boolean(batch.isDemo) === user.isDemo && batch.recyclerId === user.id && (batch.sourceWasteIds || []).includes(pickup.id));
      if (user.role !== 'admin' && !(user.role === 'household' && pickup.householdId === user.id) && !(user.role === 'collector' && pickup.assignedCollectorId === user.id) && !recyclerCanRead) return failure(response, 403, 'You do not have permission to view this pickup.');
      return send(response, 200, pickup);
    }
    if (request.method === 'DELETE' && !action) { const user = await authorization(request, ['collector', 'admin']); if (Boolean(pickup.isDemo) !== user.isDemo) return failure(response, 404, 'Pickup was not found.'); if (user.role === 'collector' && pickup.assignedCollectorId !== user.id) return failure(response, 403, 'Only the assigned collector can remove this pickup.'); store.pickups = store.pickups.filter((entry) => entry.id !== pickup.id); await saveStore(); return send(response, 200, { success: true }); }
    if (request.method === 'POST' && action === 'accept') {
      const user = await authorization(request, ['collector']); const assigned = await User.findOne({ _id: user.id, role: 'collector', isActive: true, isVerified: true, isDemo: user.isDemo }).lean();
      if (Boolean(pickup.isDemo) !== user.isDemo) return failure(response, 404, 'Pickup was not found.');
      if (!assigned) return failure(response, 403, 'An active verified collector account is required.');
      if (user.role === 'collector' && pickup.assignedCollectorId && pickup.assignedCollectorId !== user.id) return failure(response, 403, 'This pickup is assigned to another collector.');
      if (pickup.status !== 'requested') return failure(response, 409, 'Only requested pickups can be accepted.');
      Object.assign(pickup, { status: 'in_transit', assignedCollectorId: user.id, assignedCollectorName: assigned?.name || user.name, assignedCollectorPhone: assigned?.phone || user.phone });
      pickup.timeline.push(event('collector_assigned', 'Collector Matched & En Route', `${user.name} accepted this request.`, pickup.address, user.name, 'Collector')); await saveStore(); publishUpdate({ users: [pickup.householdId, user.id], roles: ['admin'], resource: 'pickups', action: 'accepted', entityId: pickup.id, isDemo: user.isDemo }); await createNotifications([pickup.householdId], { title: 'Collector accepted your pickup', message: `${user.name} accepted the collection request.`, type: 'success', resource: 'pickups', entityId: pickup.id, isDemo: user.isDemo }); return send(response, 200, pickup);
    }
    if (request.method === 'POST' && action === 'complete') {
      const user = await authorization(request, ['collector']); const payload = await body(request); const weight = Number(payload.measuredKg); const amount = Number(payload.paidAmount);
      if (Boolean(pickup.isDemo) !== user.isDemo) return failure(response, 404, 'Pickup was not found.');
      if (user.role === 'collector' && pickup.assignedCollectorId !== user.id) return failure(response, 403, 'Only the assigned collector can complete this pickup.');
      if (pickup.status === 'collected') {
        const savedTransaction = await Transaction.findOne({ pickupId: pickup.id });
        if (savedTransaction && Number(pickup.actualWeightKg) === weight && Number(pickup.actualPaidAmount) === amount && pickup.paymentMode === payload.paymentMode) {
          const savedBatch = store.batches.find((entry) => entry.id === pickup.recyclingBatchId);
          if (savedBatch) return send(response, 200, { pickup, batch: savedBatch, transaction: { transactionId: savedTransaction.transactionId, status: savedTransaction.status } });
        }
        return failure(response, 409, 'This pickup is already complete and does not match the saved collection.');
      }
      if (pickup.status !== 'in_transit' || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(amount) || amount < 0 || !['UPI', 'Cash', 'Direct Jan-Dhan Transfer'].includes(payload.paymentMode)) return failure(response, 400, 'Pickup must be in transit with a valid weight, payout, and payment method.');
      const assigned = await User.findOne({ _id: pickup.assignedCollectorId || user.id, isDemo: user.isDemo, role: 'collector', isActive: true, isVerified: true }).lean(); if (!assigned) return failure(response, 409, 'Assigned collector account is unavailable.'); const now = new Date();
      const ledgerTransaction = await recordCollectorTransaction(pickup, String(assigned._id), weight, amount, payload.paymentMode, now);
      Object.assign(pickup, { status: 'collected', actualWeightKg: weight, actualPaidAmount: amount, paymentMode: payload.paymentMode, collectedAt: now.toISOString() });
      pickup.timeline.push(event('weighed_collected', 'Doorstep Weighed & Payment Recorded', `Weighed ${weight} kg; ₹${amount} recorded as ${ledgerTransaction.status} via ${payload.paymentMode}.`, pickup.address, assigned.name, 'Collector', `${weight} kg`));
      const batch = { id: makeId('BATCH'), materialType: pickup.items.map((item) => item.categoryName).join(', '), totalWeightKg: weight, sourceWasteIds: [pickup.id], collectorIds: [String(assigned._id)], sortingCenterHub: '', recyclerId: '', recyclerName: '', recyclerCity: '', receivedAt: now, purityGrade: 'Unassessed', status: 'inbound', co2SavedKg: 0, waterSavedLitres: 0, isDemo: user.isDemo };
      store.batches.unshift(batch); pickup.recyclingBatchId = batch.id;
      for (const item of pickup.items) {
        const material = normalizeMaterial(item.categoryId);
        const lotWeight = weight * Number(item.estimatedKg || 0) / Math.max(1, pickup.totalEstimatedKg);
        if (['paper', 'cardboard', 'pet_plastic', 'hdpe', 'metal', 'aluminium', 'copper', 'e_waste', 'glass'].includes(material) && lotWeight >= 0.1) await ScrapLot.create({ collector: assigned._id, sourcePickupId: pickup.id, sourceBatchId: batch.id, material, weightKg: lotWeight, condition: pickup.condition || 'mixed', location: { address: pickup.address, city: pickup.city || undefined }, estimatedValue: Number(item.estimatedValue || 0), quotedRate: Number(item.ratePerKg || 0), status: 'listed', isDemo: user.isDemo, tracking: [] });
      }
      await saveStore(); publishUpdate({ users: [pickup.householdId, String(assigned._id)], roles: ['admin'], resource: 'pickups', action: 'collected', entityId: pickup.id, isDemo: user.isDemo }); publishUpdate({ roles: ['recycler'], resource: 'marketplace', action: 'lot-listed', isDemo: user.isDemo }); publishUpdate({ roles: ['admin'], resource: 'payments', action: ledgerTransaction.status, entityId: ledgerTransaction.transactionId, isDemo: user.isDemo });
      await createNotifications([pickup.householdId], { title: 'Pickup completed', message: `${weight} kg was recorded. Payment is ${ledgerTransaction.status}.`, type: 'success', resource: 'pickups', entityId: pickup.id, isDemo: user.isDemo });
      await createNotifications([String(assigned._id)], { title: 'Transaction recorded', message: `₹${amount.toLocaleString('en-IN')} is recorded as ${ledgerTransaction.status}.`, resource: 'payments', entityId: ledgerTransaction.transactionId, isDemo: user.isDemo });
      return send(response, 200, { pickup, batch, transaction: { transactionId: ledgerTransaction.transactionId, status: ledgerTransaction.status } });
    }
  }
  const batchMatch = path.match(/^\/api\/batches\/([^/]+)\/(receive|process)$/);
  if (batchMatch && request.method === 'POST') {
    const user = await authorization(request, ['recycler', 'admin']); const batch = store.batches.find((entry) => entry.id === decodeURIComponent(batchMatch[1]) && Boolean(entry.isDemo) === user.isDemo);
    if (!batch) return failure(response, 404, 'Batch was not found.');
    if (user.role === 'recycler' && (!batch.recyclerId || batch.recyclerId !== user.id)) return failure(response, 403, 'Only the recycler assigned to this batch can confirm this handover.');
    if (batchMatch[2] === 'receive') {
      if (batch.directLotId) return failure(response, 409, 'Confirm the accepted marketplace offer to record this lot handover.');
      if (!['inbound', 'received'].includes(batch.status)) return failure(response, 409, 'Only inbound batches can be received.');
      const savedHandover = await HandoverRecord.findOne({ lotId: batch.id });
      const receivedAt = savedHandover ? new Date(savedHandover.timestamp) : new Date();
      const handover = savedHandover || await recordHandover(batch, receivedAt);
      batch.status = 'received'; batch.receivedAt = receivedAt.toISOString(); batch.handoverId = handover.handoverId;
      await saveStore(); publishUpdate({ users: [...(batch.collectorIds || []), batch.recyclerId], roles: ['admin'], resource: 'handovers', action: 'received', entityId: batch.id, isDemo: user.isDemo }); await createNotifications([...(batch.collectorIds || [])], { title: 'Handover confirmed', message: `${batch.totalWeightKg} kg was received at ${batch.recyclerName}.`, type: 'success', resource: 'handovers', entityId: batch.id, isDemo: user.isDemo }); return send(response, 200, { ...batch, handoverId: handover.handoverId });
    }
    if (batch.status !== 'received') return failure(response, 409, 'Batch must be received before processing.');
    const payload = await body(request); const externalReference = safeText(payload.externalReference, 100);
    if (!externalReference) return failure(response, 400, 'An external processing reference is required.');
    const facility = await RecyclerFacility.findOne({ userId: user.id, isDemo: user.isDemo }).lean();
    batch.status = 'processed'; batch.processedAt = new Date().toISOString(); batch.eprCreditCertificateNo = externalReference;
    for (const pickup of store.pickups.filter((entry) => batch.sourceWasteIds.includes(entry.id))) { pickup.status = 'recycled'; pickup.recycledAt = batch.processedAt; pickup.eprCertificateId = externalReference; pickup.timeline.push(event('processing_recorded', 'Recycling Processing Recorded', `Processed by ${user.name}; external reference ${externalReference} recorded and not independently verified.`, facility?.city || '', user.name, 'Recycler', `${batch.totalWeightKg} kg`)); }
    await saveStore(); publishUpdate({ users: [...(batch.collectorIds || []), batch.recyclerId], roles: ['admin'], resource: 'transactions', action: 'processed', entityId: batch.id, isDemo: user.isDemo }); await createNotifications([...(batch.collectorIds || [])], { title: 'Processing status updated', message: `Recycler ${user.name} recorded an external processing reference.`, type: 'success', resource: 'transactions', entityId: batch.id, isDemo: user.isDemo }); return send(response, 200, batch);
  }
  return failure(response, 404, 'API route not found.');
}

function serveClient(request, response) {
  const candidate = request.url === '/' ? 'index.html' : normalize(request.url.split('?')[0]).replace(/^\/+/, '');
  const file = join(rootDirectory, 'dist', candidate);
  const selected = existsSync(file) && !candidate.includes('..') ? file : join(rootDirectory, 'dist', 'index.html');
  if (!existsSync(selected)) return failure(response, 404, 'Client build not found. Run npm run build first.');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  response.writeHead(200, { 'Content-Type': types[extname(selected)] || 'application/octet-stream' }); createReadStream(selected).pipe(response);
}

try {
  await mongoose.connect(mongoUri, mongoDnsOptions);
} catch (error) {
  const nodeError = error.reason?.servers?.values?.().next?.().value?.error?.cause;
  const detail = nodeError?.code || error.code || error.cause?.code || error.message.split('\n')[0];
  console.error('MongoDB connection failed. Confirm the Atlas cluster is running and your current public IP is allowed in Atlas Network Access.');
  console.error(`Connection detail: ${detail}`);
  process.exit(1);
}
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must contain at least 32 characters in production.');
const legacyDemoUsers = await User.find({ name: { $in: ['Demo Collector', 'Demo Recycler', 'Demo Administrator'] } }).select('_id').lean();
const legacyDemoIdStrings = [...legacyDemoUsers.map((entry) => String(entry._id)), 'KC-COL-004821', 'REC-DEL-001'];
const legacyDemoIds = legacyDemoUsers.map((entry) => entry._id);
if (legacyDemoIds.length) {
  await Promise.all([
    RecyclerOffer.deleteMany({ $or: [{ collector: { $in: legacyDemoIds } }, { recycler: { $in: legacyDemoIds } }] }),
    ScrapLot.deleteMany({ collector: { $in: legacyDemoIds } }),
    RecyclerFacility.deleteMany({ $or: [{ userId: { $in: legacyDemoIds } }, { facilityKey: 'REC-DEL-001' }] }),
    Payment.deleteMany({ collectorId: { $in: legacyDemoIdStrings } }),
    Transaction.deleteMany({ collectorId: { $in: legacyDemoIdStrings } }),
    HandoverRecord.deleteMany({ $or: [{ collectorId: { $in: legacyDemoIdStrings } }, { recyclerId: { $in: legacyDemoIdStrings } }] }),
    AuditLog.deleteMany({ actorId: { $in: legacyDemoIdStrings } })
  ]);
  await User.deleteMany({ _id: { $in: legacyDemoIds } });
}
await RecyclerFacility.deleteOne({ facilityKey: 'REC-DEL-001' });
await HandoverRecord.deleteMany({ $or: [{ collectorId: { $in: legacyDemoIdStrings } }, { recyclerId: { $in: legacyDemoIdStrings } }, { lotId: { $in: ['KC-COL-004821', 'REC-DEL-001'] } }] });
await Payment.deleteMany({ collectorId: { $in: ['KC-COL-004821', 'REC-DEL-001'] } });
await Transaction.deleteMany({ collectorId: { $in: ['KC-COL-004821', 'REC-DEL-001'] } });
await AuditLog.deleteMany({ actorId: { $in: ['KC-COL-004821', 'REC-DEL-001'] } });
await provisionAdminFromEnvironment();
await loadStore();
const knownDemoCollectorIds = new Set(['KC-COL-004821']);
const knownDemoRecyclerIds = new Set(['REC-DEL-001']);
store.collectors = (store.collectors || []).filter((entry) => !knownDemoCollectorIds.has(entry.id));
store.recyclers = (store.recyclers || []).filter((entry) => !knownDemoRecyclerIds.has(entry.id));
store.pickups = (store.pickups || []).filter((entry) => entry.householdId !== 'HH-DEL-1092' && !knownDemoCollectorIds.has(entry.assignedCollectorId));
store.batches = (store.batches || []).filter((entry) => !knownDemoRecyclerIds.has(entry.recyclerId));
const legacyDemoMaterialIds = new Set(['paper', 'cardboard', 'pet_plastic', 'metal', 'aluminium', 'e_waste']);
store.materials = (store.materials || []).filter((entry) => (!legacyDemoMaterialIds.has(entry.id) || entry.isDemo === true) && !String(entry.id).startsWith('mat-demo-'));
store.prices = (store.prices || []).filter((entry) => !entry.synthetic && !String(entry.id).includes('price-demo'));
await saveStore();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((request, response, next) => {
  const requestId = randomUUID(); request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('X-Frame-Options', 'DENY'); response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (isProduction) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const startedAt = Date.now(); response.on('finish', () => console.info(JSON.stringify({ requestId, method: request.method, path: request.path, status: response.statusCode, durationMs: Date.now() - startedAt })));
  next();
});
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(Object.assign(new Error('Origin is not allowed.'), { status: 403 })); }, credentials: false, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 86400 }));
app.use(async (request, response, next) => {
  if (!request.url.startsWith('/api/')) return next();
  if (!allowRequest(request)) return failure(response, 429, 'Too many requests. Try again later.', request.requestId);
  if (['POST', 'PATCH', 'PUT'].includes(request.method) && !String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return failure(response, 415, 'Content-Type must be application/json.', request.requestId);
  try { await route(request, response); }
  catch (error) {
    const databaseUnavailable = mongoose.connection.readyState !== 1;
    const status = error.status || (databaseUnavailable ? 503 : 500);
    const message = error.status ? error.message : databaseUnavailable ? 'The database is temporarily unavailable.' : 'Unexpected server error.';
    console.error(JSON.stringify({ requestId: request.requestId, message: error.message, status }));
    failure(response, status, message, request.requestId);
  }
});
app.use((request, response) => serveClient(request, response));
const httpServer = app.listen(port, () => console.log(`ScrapLink API listening on http://localhost:${port}`));
realtime = new SocketServer(httpServer, { cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: false }, transports: ['websocket', 'polling'] });
realtime.use(async (socket, next) => {
  try {
    const user = await verifyToken(socket.handshake.auth?.token);
    if (!user) return next(new Error('Authentication required'));
    socket.data.user = publicUser(user);
    return next();
  } catch { return next(new Error('Authentication required')); }
});
realtime.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`);
  socket.join(`role:${socket.data.user.role}:${socket.data.user.isDemo ? 'demo' : 'live'}`);
});
