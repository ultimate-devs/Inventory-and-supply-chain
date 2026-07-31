import mongoose from 'mongoose';

// Generic atomic sequence counter, used to mint gap-free, race-safe numbers
// (e.g. PO-2026-00001) via a single findOneAndUpdate $inc rather than
// scanning existing documents, which would race under concurrent writes.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export const getNextSequence = async (key, { session } = {}) => {
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );
  return counter.seq;
};
