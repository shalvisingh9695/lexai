import mongoose from 'mongoose';

const ClauseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  risk: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  text: { type: String }
});

const ChunkSchema = new mongoose.Schema({
  chunkId: { type: String, required: true },
  documentId: { type: String, required: true },
  filename: { type: String, required: true },
  page: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, default: 'application/pdf' },
  fileSize: { type: String, default: '1.0 MB' },
  category: { type: String, default: 'General Legal' },
  summary: { type: String, default: 'Document submitted for AI analysis.' },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  clausesCount: { type: Number, default: 0 },
  clauses: [ClauseSchema],
  pageCount: { type: Number, default: 0 },
  textLength: { type: Number, default: 0 },
  chunksCount: { type: Number, default: 0 },
  chunks: [ChunkSchema],
  pages: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

export default Document;
