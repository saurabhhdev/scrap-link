import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { User } from '../src/models/User.js';
import { RecyclerFacility } from '../src/models/RecyclerFacility.js';
import { ScrapLot } from '../src/models/ScrapLot.js';
import { RecyclerOffer } from '../src/models/RecyclerOffer.js';
import { Payment } from '../src/models/Payment.js';
import { Transaction } from '../src/models/LedgerTransaction.js';
import { HandoverRecord } from '../src/models/HandoverRecord.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Notification } from '../src/models/Notification.js';
import { PlatformState } from '../src/models/PlatformState.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: join(root, '.env') });
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scraplink';
const password = process.env.SAMPLE_PASSWORD || 'ScrapLink@Customer26';
const rolePasswords = {
  collector: process.env.SAMPLE_COLLECTOR_PASSWORD || 'ScrapLink@Collector26',
  recycler: process.env.SAMPLE_RECYCLER_PASSWORD || 'ScrapLink@Recycler26',
  admin: process.env.SAMPLE_ADMIN_PASSWORD || 'ScrapLink@Admin26'
};
const now = new Date();
const day = (offset) => new Date(now.getTime() - offset * 86_400_000);
const iso = (date) => date.toISOString();
const hashPassword = (value) => bcrypt.hash(value, 12);
const digest = (value) => `0x${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;

const materials = [
  { id: 'paper', name: 'Mixed paper', category: 'Paper', unit: 'kg', active: true, isDemo: true },
  { id: 'cardboard', name: 'Cardboard', category: 'Paper', unit: 'kg', active: true, isDemo: true },
  { id: 'pet_plastic', name: 'PET bottles', category: 'Plastic', unit: 'kg', active: true, isDemo: true },
  { id: 'hdpe', name: 'HDPE containers', category: 'Plastic', unit: 'kg', active: true, isDemo: true },
  { id: 'metal', name: 'Iron and mixed metal', category: 'Metal', unit: 'kg', active: true, isDemo: true },
  { id: 'aluminium', name: 'Aluminium cans', category: 'Metal', unit: 'kg', active: true, isDemo: true },
  { id: 'copper', name: 'Copper wire', category: 'Metal', unit: 'kg', active: true, isDemo: true },
  { id: 'e_waste', name: 'Small e-waste', category: 'E-waste', unit: 'kg', active: true, isDemo: true },
  { id: 'glass', name: 'Glass bottles', category: 'Glass', unit: 'kg', active: true, isDemo: true }
];
const rateByMaterial = { paper: 14, cardboard: 12, pet_plastic: 24, hdpe: 32, metal: 28, aluminium: 105, copper: 410, e_waste: 58, glass: 4 };
const collectorsSeed = [
  ['Aarav Sharma', 'Ludhiana', '+91-00000-10101'], ['Sana Khan', 'Delhi', '+91-00000-10102'],
  ['Vikram Patil', 'Pune', '+91-00000-10103'], ['Meera Nair', 'Bengaluru', '+91-00000-10104'],
  ['Rohit Das', 'Kolkata', '+91-00000-10105']
];
const recyclersSeed = [
  { name: 'GreenLoop Paper Recovery', city: 'Ludhiana', phone: '+91-00000-10201', accepted: ['paper', 'cardboard'], point: [75.8573, 30.9009] },
  { name: 'ReCircle Plastics India', city: 'Delhi', phone: '+91-00000-10202', accepted: ['pet_plastic', 'hdpe'], point: [77.2090, 28.6139] },
  { name: 'Deccan Metal Reclaimers', city: 'Pune', phone: '+91-00000-10203', accepted: ['metal', 'aluminium', 'copper'], point: [73.8567, 18.5204] },
  { name: 'Eastern E-Waste Works', city: 'Kolkata', phone: '+91-00000-10204', accepted: ['e_waste', 'glass', 'pet_plastic'], point: [88.3639, 22.5726] }
];
const materialRows = [
  ['paper', 'Mixed paper', 18.4, 'clean', 'Ludhiana', 'Model Town, Ludhiana'],
  ['cardboard', 'Cardboard', 26.2, 'mixed', 'Ludhiana', 'BRS Nagar, Ludhiana'],
  ['pet_plastic', 'PET bottles', 14.8, 'clean', 'Delhi', 'Lajpat Nagar, New Delhi'],
  ['hdpe', 'HDPE containers', 9.6, 'mixed', 'Delhi', 'Dwarka Sector 10, New Delhi'],
  ['metal', 'Iron and mixed metal', 32.5, 'mixed', 'Pune', 'Kothrud, Pune'],
  ['aluminium', 'Aluminium cans', 7.2, 'clean', 'Pune', 'Aundh, Pune'],
  ['copper', 'Copper wire', 3.4, 'clean', 'Bengaluru', 'Jayanagar, Bengaluru'],
  ['e_waste', 'Small e-waste', 11.7, 'mixed', 'Kolkata', 'Salt Lake Sector V, Kolkata'],
  ['glass', 'Glass bottles', 21.3, 'mixed', 'Kolkata', 'New Town, Kolkata'],
  ['paper', 'Mixed paper', 16.9, 'clean', 'Bengaluru', 'Indiranagar, Bengaluru']
];
const statusByLot = ['received', 'received', 'received', 'accepted', 'pickup_scheduled', 'pending', 'pending', 'pending', 'declined', 'pending'];
const roleDemoPhones = [...collectorsSeed.map((entry) => entry[2]), ...recyclersSeed.map((entry) => entry.phone), '+91-00000-10901', '+91-00000-10999'];

function makeHandover(batch, recycler, collector, handoverId, timestamp, value, payment) {
  const record = {
    handoverId, lotId: batch.id, collectorId: String(collector._id), recyclerId: String(recycler._id),
    material: batch.materialType, weightKg: batch.totalWeightKg, value, timestamp,
    location: { city: recycler.facility.city, facility: recycler.facility.name },
    payment: { amount: payment.amount, mode: payment.mode, status: payment.status, paidAt: payment.paidAt },
    confirmations: {
      collector: { confirmed: true, confirmedAt: timestamp, actorId: String(collector._id) },
      recycler: { confirmed: true, confirmedAt: timestamp, actorId: String(recycler._id) }
    }, isDemo: true
  };
  const publicFields = {
    handoverId: record.handoverId, lotId: record.lotId, material: record.material, weightKg: record.weightKg,
    value: record.value, timestamp: timestamp.toISOString(), location: record.location,
    payment: { mode: record.payment.mode, status: record.payment.status },
    confirmations: {
      collector: { confirmed: true, confirmedAt: timestamp.toISOString() },
      recycler: { confirmed: true, confirmedAt: timestamp.toISOString() }
    }
  };
  record.integrityHash = digest(publicFields);
  return record;
}

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.SAMPLE_MODE !== 'true') throw new Error('Refusing to seed a production database unless SAMPLE_MODE=true is explicitly set. Use a dedicated sample database.');
  for (const [role, value] of Object.entries({ customer: password, ...rolePasswords })) {
    const length = Buffer.byteLength(value, 'utf8');
    if (length < 12 || length > 72) throw new Error(`SAMPLE ${role} password must be between 12 and 72 UTF-8 bytes for secure bcrypt login.`);
  }
  await mongoose.connect(mongoUri);
  const reservedDemoEmails = ['customer@scraplink.example', 'collector@scraplink.example', 'recycler@scraplink.example', 'admin@scraplink.example'];
  const conflicts = await User.find({ email: { $in: reservedDemoEmails }, isDemo: { $ne: true } }).select('email').lean();
  if (conflicts.length) throw new Error(`Refusing to replace non-sample accounts using reserved email(s): ${conflicts.map((entry) => entry.email).join(', ')}`);
  const oldDemoUsers = await User.find({ $or: [{ isDemo: true }, { phone: { $in: roleDemoPhones } }, { name: /^DEMO · / }] }).select('_id').lean();
  const oldIds = oldDemoUsers.map((user) => String(user._id));
  await Promise.all([
    RecyclerOffer.deleteMany({ $or: [{ isDemo: true }, { collector: { $in: oldDemoUsers.map((user) => user._id) } }, { recycler: { $in: oldDemoUsers.map((user) => user._id) } }] }),
    ScrapLot.deleteMany({ $or: [{ isDemo: true }, { collector: { $in: oldDemoUsers.map((user) => user._id) } }] }),
    RecyclerFacility.deleteMany({ $or: [{ isDemo: true }, { userId: { $in: oldDemoUsers.map((user) => user._id) } }] }),
    Payment.deleteMany({ $or: [{ isDemo: true }, { collectorId: { $in: oldIds } }] }),
    Transaction.deleteMany({ $or: [{ isDemo: true }, { collectorId: { $in: oldIds } }] }),
    HandoverRecord.deleteMany({ $or: [{ isDemo: true }, { collectorId: { $in: oldIds } }, { recyclerId: { $in: oldIds } }] }),
    AuditLog.deleteMany({ $or: [{ isDemo: true }, { actorId: { $in: oldIds } }] }),
    Notification.deleteMany({ $or: [{ isDemo: true }, { userId: { $in: oldDemoUsers.map((user) => user._id) } }] })
  ]);
  if (oldDemoUsers.length) await User.deleteMany({ _id: { $in: oldDemoUsers.map((user) => user._id) } });

  const collectors = await User.insertMany(await Promise.all(collectorsSeed.map(async ([name, city, phone], index) => ({ name, phone, email: index === 0 ? 'collector@scraplink.example' : `collector${index + 1}@scraplink.example`, role: 'collector', isVerified: true, isActive: true, isDemo: true, passwordHash: await hashPassword(index === 0 ? rolePasswords.collector : password), profile: { ward: city, subtitle: 'Sample account' } }))));
  const recyclers = await User.insertMany(await Promise.all(recyclersSeed.map(async (facility, index) => ({ name: facility.name, phone: facility.phone, email: index === 0 ? 'recycler@scraplink.example' : `recycler${index + 1}@scraplink.example`, role: 'recycler', isVerified: true, isActive: true, isDemo: true, passwordHash: await hashPassword(index === 0 ? rolePasswords.recycler : password), recyclerProfile: { facilityName: facility.name, acceptedMaterials: facility.accepted, location: { city: facility.city } } }))));
  const household = await User.create({ name: 'Kavita Iyer', phone: '+91-00000-10901', email: 'customer@scraplink.example', role: 'household', isVerified: true, isActive: true, isDemo: true, passwordHash: await hashPassword(password), profile: { ward: 'Ludhiana' } });
  const admin = await User.create({ name: 'ScrapLink Admin', phone: '+91-00000-10999', email: 'admin@scraplink.example', role: 'admin', isVerified: true, isActive: true, isDemo: true, passwordHash: await hashPassword(rolePasswords.admin) });
  const facilities = await RecyclerFacility.insertMany(recyclersSeed.map((facility, index) => ({ facilityKey: String(recyclers[index]._id), userId: recyclers[index]._id, name: facility.name, city: facility.city, acceptedMaterials: facility.accepted, serviceRadiusKm: 60, priceRates: facility.accepted.map((material) => ({ material, ratePerKg: rateByMaterial[material] })), verificationStatus: 'verified', active: true, isDemo: true, location: { point: { type: 'Point', coordinates: facility.point } }, source: 'Sample data' })));

  const pickups = []; const batches = [];
  for (let index = 0; index < materialRows.length; index += 1) {
    const [material, materialName, weight, condition, city, address] = materialRows[index];
    const collector = collectors[index % collectors.length];
    const recyclerIndex = recyclersSeed.findIndex((facility) => facility.accepted.includes(material));
    const recycler = recyclers[Math.max(0, recyclerIndex)];
    const rate = rateByMaterial[material]; const value = Math.round(weight * rate * 100) / 100;
    const pickupId = `SL-KC-${String(20260000 + index + 1)}`;
    const batchId = `SL-BATCH-${String(index + 1).padStart(3, '0')}`;
    const status = index < 3 ? 'recycled' : index === 3 ? 'collected' : 'at_sorting';
    const createdAt = day(18 - index); const collectedAt = day(14 - index);
    const pickup = { id: pickupId, householdId: String(household._id), householdName: household.name, householdPhone: household.phone, address, city, ward: city, pincode: '000000', items: [{ categoryId: material, categoryName: materialName, estimatedKg: weight, ratePerKg: rate, estimatedValue: value }], totalEstimatedKg: weight, totalEstimatedValue: value, actualWeightKg: weight, actualPaidAmount: value, paymentMode: index % 2 ? 'Cash' : 'UPI', status, assignedCollectorId: String(collector._id), assignedCollectorName: collector.name, assignedCollectorPhone: collector.phone, preferredDate: iso(createdAt).slice(0, 10), preferredTimeSlot: '10:00 AM - 12:00 PM', scheduledAt: iso(createdAt).slice(0, 10), createdAt: iso(createdAt), collectedAt: iso(collectedAt), recyclingBatchId: batchId, isDemo: true, verificationPin: String(2000 + index), qrCodeData: `/track/${pickupId}`, cryptographicHash: digest({ pickupId, weight, value }), timeline: [{ stage: 'request_created', title: 'SAMPLE DATA · Pickup requested', description: 'Simulated sample record.', timestamp: iso(createdAt), location: address, actorName: household.name, actorRole: 'Household' }, { stage: 'weighed_collected', title: 'SAMPLE DATA · Weight recorded', description: `${weight} kg recorded for presentation.`, timestamp: iso(collectedAt), location: address, actorName: collector.name, actorRole: 'Collector', metricHighlight: `${weight} kg` }] };
    pickups.push(pickup);
    batches.push({ id: batchId, materialType: materialName, totalWeightKg: weight, quotedValue: value, sourceWasteIds: [pickupId], collectorIds: [String(collector._id)], sortingCenterHub: `${city} material recovery hub`, recyclerId: index < 5 ? String(recycler._id) : '', recyclerName: index < 5 ? recyclersSeed[Math.max(0, recyclerIndex)].name : '', recyclerCity: index < 5 ? recyclersSeed[Math.max(0, recyclerIndex)].city : '', receivedAt: collectedAt, purityGrade: condition === 'clean' ? 'Clean (sample)' : 'Mixed (sample)', status: index < 3 ? 'processed' : 'inbound', co2SavedKg: 0, waterSavedLitres: 0, handoverId: index < 3 ? `SL-HND-${String(index + 1).padStart(3, '0')}` : undefined, isDemo: true });
  }
  const openPickupDate = day(-1);
  pickups.push({ id: 'SL-KC-OPEN-001', householdId: String(household._id), householdName: household.name, householdPhone: household.phone, address: 'Sector 22, Chandigarh', city: 'Chandigarh', ward: 'Sector 22', pincode: '000000', items: [{ categoryId: 'cardboard', categoryName: 'Cardboard', estimatedKg: 12.5, ratePerKg: rateByMaterial.cardboard, estimatedValue: 150 }], totalEstimatedKg: 12.5, totalEstimatedValue: 150, status: 'requested', preferredDate: iso(openPickupDate).slice(0, 10), preferredTimeSlot: '2:00 PM - 4:00 PM', scheduledAt: iso(openPickupDate).slice(0, 10), createdAt: iso(day(0)), isDemo: true, verificationPin: '2999', qrCodeData: '/track/SL-KC-OPEN-001', cryptographicHash: digest({ open: true }), timeline: [{ stage: 'request_created', title: 'SAMPLE DATA · Pickup requested', description: 'Open simulated request for collector workflow.', timestamp: iso(day(0)), location: 'Sector 22, Chandigarh', actorName: household.name, actorRole: 'Household' }] });

  const priceRows = materials.map((material) => ({ id: `SL-PRICE-${material.id.toUpperCase()}`, materialId: material.id, amount: rateByMaterial[material.id], location: 'Reference rates for sample', date: iso(day(0)).slice(0, 10), source: 'Sample data · illustrative, not a live market quote', synthetic: false, isDemo: true }));
  const previousState = await PlatformState.findOne({ key: 'primary' }).lean() || { pickups: [], batches: [], materials: [], prices: [] };
  await PlatformState.updateOne({ key: 'primary' }, { $set: {
    key: 'primary', version: 1,
    pickups: [...pickups, ...(previousState.pickups || []).filter((row) => !row.isDemo)],
    batches: [...batches, ...(previousState.batches || []).filter((row) => !row.isDemo)],
    materials: [...materials, ...(previousState.materials || []).filter((row) => !row.isDemo)],
    prices: [...priceRows, ...(previousState.prices || []).filter((row) => !row.isDemo)]
  } }, { upsert: true });

  await ScrapLot.create(materialRows.map(([material, _name, weight, condition, city, address], index) => ({ collector: collectors[index % collectors.length]._id, sourcePickupId: pickups[index].id, sourceBatchId: batches[index].id, material, weightKg: weight, condition, location: { address, city }, estimatedValue: Math.round(weight * rateByMaterial[material] * 100) / 100, quotedRate: rateByMaterial[material], status: ['received', 'received', 'received'].includes(statusByLot[index]) ? 'settled' : statusByLot[index] === 'accepted' ? 'matched' : statusByLot[index] === 'pickup_scheduled' ? 'pickup_scheduled' : 'listed', isDemo: true })));

  const transactions = []; const payments = [];
  for (let index = 0; index < 6; index += 1) {
    const pickup = pickups[index]; const collector = collectors[index % collectors.length]; const occurredAt = new Date(pickup.collectedAt);
    const transactionId = `SL-TXN-${String(index + 1).padStart(3, '0')}`; const paymentId = `SL-PAY-${String(index + 1).padStart(3, '0')}`;
    const paymentStatus = index < 3 ? 'paid' : 'pending'; const method = index % 2 ? 'Cash' : 'UPI';
    const payment = { paymentId, transactionId, collectorId: String(collector._id), amount: pickup.actualPaidAmount, currency: 'INR', method, provider: method === 'Cash' ? 'manual_cash' : 'unconfigured', idempotencyKey: `demo:pickup:${pickup.id}`, status: paymentStatus, paidAt: paymentStatus === 'paid' ? occurredAt : undefined, metadata: { isDemo: true, label: 'SAMPLE DATA · Simulated ledger record' }, isDemo: true };
    payments.push(payment);
    transactions.push({ transactionId, pickupId: pickup.id, collectorId: String(collector._id), materials: [{ material: materialRows[index][0], label: materialRows[index][1], weightKg: pickup.actualWeightKg, value: pickup.actualPaidAmount }], weightKg: pickup.actualWeightKg, amount: pickup.actualPaidAmount, currency: 'INR', status: paymentStatus, payment: paymentId, occurredAt, isDemo: true });
  }
  await Payment.insertMany(payments);
  const transactionDocs = [];
  for (let index = 0; index < transactions.length; index += 1) transactionDocs.push({ ...transactions[index], payment: (await Payment.findOne({ paymentId: payments[index].paymentId }))._id });
  await Transaction.insertMany(transactionDocs);

  const offers = [];
  for (let index = 0; index < materialRows.length; index += 1) {
    const lot = await ScrapLot.findOne({ sourcePickupId: pickups[index].id, isDemo: true });
    const recyclerIndex = recyclersSeed.findIndex((facility) => facility.accepted.includes(materialRows[index][0]));
    const recycler = recyclers[Math.max(0, recyclerIndex)]; const status = statusByLot[index];
    const history = [{ status: 'pending', actor: recycler._id, note: 'SAMPLE DATA · Simulated presentation offer', at: day(4 - index) }];
    if (status !== 'pending') history.push({ status, actor: status === 'received' ? recycler._id : collectors[index % collectors.length]._id, note: 'SAMPLE DATA · Simulated workflow state', at: day(2 - index) });
    offers.push({ lot: lot._id, collector: collectors[index % collectors.length]._id, recycler: recycler._id, amount: Math.round(lot.estimatedValue * (1 + (index % 4) * 0.035) * 100) / 100, note: 'SAMPLE DATA · Indicative sample offer', status, receivedWeightKg: status === 'received' ? lot.weightKg : undefined, isDemo: true, history });
  }
  await RecyclerOffer.insertMany(offers);

  const handovers = [];
  for (let index = 0; index < 3; index += 1) {
    const collector = collectors[index % collectors.length]; const recyclerIndex = recyclersSeed.findIndex((facility) => facility.accepted.includes(materialRows[index][0])); const recyclerUser = recyclers[Math.max(0, recyclerIndex)]; const recycler = { _id: recyclerUser._id, facility: facilities[Math.max(0, recyclerIndex)] };
    const timestamp = day(2 - index);
    handovers.push(makeHandover(batches[index], recycler, collector, `SL-HND-${String(index + 1).padStart(3, '0')}`, timestamp, batches[index].quotedValue, { amount: 0, mode: 'not recorded', status: 'unavailable' }));
  }
  await HandoverRecord.insertMany(handovers);
  const notices = [];
  for (const collector of collectors) notices.push({ userId: collector._id, title: 'SAMPLE DATA · Presentation ready', message: 'This account is using simulated sample records stored in MongoDB.', type: 'info', resource: 'demo', entityId: 'seed', isDemo: true });
  for (const recycler of recyclers) notices.push({ userId: recycler._id, title: 'SAMPLE DATA · Marketplace ready', message: 'Sample lots and offers are simulated presentation records, not live transactions.', type: 'info', resource: 'demo', entityId: 'seed', isDemo: true });
  notices.push({ userId: admin._id, title: 'SAMPLE DATA · Admin presentation mode', message: 'All visible totals are isolated to simulated sample records.', type: 'info', resource: 'demo', entityId: 'seed', isDemo: true });
  await Notification.insertMany(notices);

  console.log(JSON.stringify({ status: 'seeded', label: 'SAMPLE DATA · Simulated records', accounts: { collectors: collectors.length, verifiedRecyclers: recyclers.length, admin: 1, household: 1 }, lots: materialRows.length, offers: offers.length, pickups: pickups.length, handovers: handovers.length, transactions: transactionDocs.length, payments: payments.length, notifications: notices.length, database: mongoose.connection.name }, null, 2));
}

seed().catch((error) => { console.error('Sample data seeding failed:', error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
