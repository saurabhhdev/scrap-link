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
import { Pickup } from '../src/models/Pickup.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: join(root, '.env') });

const preservedAccounts = [
  { role: 'household', email: 'customer@scraplink.example' },
  { role: 'collector', email: 'collector@scraplink.example' },
  { role: 'recycler', email: 'recycler@scraplink.example' },
  { role: 'admin', email: 'admin@scraplink.example' }
];

try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scraplink');
  if (mongoose.connection.name !== 'scraplink') throw new Error('Refusing to clear sample records outside the scraplink database.');

  const accounts = await Promise.all(preservedAccounts.map(async ({ role, email }) => {
    const user = await User.findOne({ role, email, isDemo: true, isActive: true }).select('_id role email').lean();
    if (!user) throw new Error(`Required active sample ${role} account was not found; no sample records were cleared.`);
    return user;
  }));
  const recycler = accounts.find((account) => account.role === 'recycler');
  const facility = await RecyclerFacility.findOne({ userId: recycler._id, isDemo: true, active: true, verificationStatus: 'verified' }).lean();
  if (!facility) throw new Error('The sample Recycler facility is not active and verified; no sample records were cleared.');
  const state = await PlatformState.findOne({ key: 'primary' });
  if (!state) throw new Error('Platform state was not found; no sample records were cleared.');

  const keepIds = accounts.map((account) => account._id);
  const allDemoAccounts = await User.find({ isDemo: true }).select('_id role').lean();
  const householdIds = allDemoAccounts.filter((account) => account.role === 'household').map((account) => account._id);
  const collectorIds = allDemoAccounts.filter((account) => account.role === 'collector').map((account) => account._id);
  const recyclerIds = allDemoAccounts.filter((account) => account.role === 'recycler').map((account) => account._id);
  const demoLotIds = await ScrapLot.find({ $or: [{ isDemo: true }, { collector: { $in: keepIds } }] }).distinct('_id');
  const demoUsers = { $in: keepIds };
  const demoUserStrings = { $in: keepIds.map(String) };
  const removed = await Promise.all([
    ScrapLot.deleteMany({ $or: [{ isDemo: true }, { collector: { $in: collectorIds } }] }),
    RecyclerOffer.deleteMany({ $or: [{ isDemo: true }, { collector: { $in: collectorIds } }, { recycler: { $in: recyclerIds } }] }),
    Payment.deleteMany({ $or: [{ isDemo: true }, { collectorId: demoUserStrings }] }),
    Transaction.deleteMany({ $or: [{ isDemo: true }, { collectorId: demoUserStrings }] }),
    HandoverRecord.deleteMany({ $or: [{ isDemo: true }, { collectorId: demoUserStrings }, { recyclerId: demoUserStrings }] }),
    AuditLog.deleteMany({ $or: [{ isDemo: true }, { actorId: demoUserStrings }] }),
    Notification.deleteMany({ $or: [{ isDemo: true }, { userId: demoUsers }] }),
    RecyclerFacility.deleteMany({ isDemo: true, userId: { $ne: recycler._id }, facilityKey: { $ne: String(recycler._id) } }),
    User.deleteMany({ isDemo: true, _id: { $nin: keepIds } }),
    Pickup.deleteMany({ $or: [{ household: { $in: householdIds } }, { collector: { $in: collectorIds } }] }),
    mongoose.connection.collection('transactions').deleteMany({ $or: [{ lot: { $in: demoLotIds } }, { collector: { $in: collectorIds } }, { recycler: { $in: recyclerIds } }] })
  ]);

  await PlatformState.updateOne({ _id: state._id }, { $set: { pickups: [], collectors: [], recyclers: [], batches: [], prices: [] } });
  const clearedState = await PlatformState.findById(state._id).lean();
  const remaining = await Promise.all([
    ScrapLot.countDocuments({ $or: [{ isDemo: true }, { collector: { $in: collectorIds } }] }),
    RecyclerOffer.countDocuments({ $or: [{ isDemo: true }, { collector: { $in: collectorIds } }, { recycler: { $in: recyclerIds } }] }),
    Payment.countDocuments({ $or: [{ isDemo: true }, { collectorId: demoUserStrings }] }),
    Transaction.countDocuments({ $or: [{ isDemo: true }, { collectorId: demoUserStrings }] }),
    HandoverRecord.countDocuments({ $or: [{ isDemo: true }, { collectorId: demoUserStrings }, { recyclerId: demoUserStrings }] }),
    AuditLog.countDocuments({ $or: [{ isDemo: true }, { actorId: demoUserStrings }] }),
    Notification.countDocuments({ $or: [{ isDemo: true }, { userId: demoUsers }] }),
    Pickup.countDocuments({ $or: [{ household: { $in: householdIds } }, { collector: { $in: collectorIds } }] }),
    mongoose.connection.collection('transactions').countDocuments({ $or: [{ lot: { $in: demoLotIds } }, { collector: { $in: collectorIds } }, { recycler: { $in: recyclerIds } }] })
  ]);
  if (remaining.some(Boolean) || clearedState.pickups.length || clearedState.batches.length || clearedState.prices.length) {
    throw new Error('Verification found remaining sample activity after the reset.');
  }

  console.log(JSON.stringify({
    status: 'cleared',
    label: 'Sample accounts retained · activity cleared',
    database: mongoose.connection.name,
    preservedRoles: accounts.map(({ role }) => role),
    retainedCatalogMaterials: clearedState.materials.length,
    activity: { pickups: clearedState.pickups.length + removed[9].deletedCount, batches: clearedState.batches.length, lots: removed[0].deletedCount, offers: removed[1].deletedCount, payments: removed[2].deletedCount, transactions: removed[3].deletedCount + removed[10].deletedCount, handovers: removed[4].deletedCount, auditLogs: removed[5].deletedCount, notifications: removed[6].deletedCount, prices: clearedState.prices.length }
  }, null, 2));
} catch {
  console.error('Sample activity reset failed; MongoDB did not confirm a clean state. Check Atlas connectivity and network access settings.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
