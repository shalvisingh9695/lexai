import mongoose from 'mongoose';

// Disable buffering so disconnected operations fail fast instead of timing out for 10000ms
mongoose.set('bufferCommands', false);

let isConnected = false;
let useMemoryFallback = false;
let connectPromise = null;

// In-memory store fallback if MongoDB server is not reachable
const inMemoryStore = {
  documents: [
    {
      _id: 'doc_1',
      title: 'Commercial Lease Agreement - Suite 400',
      fileName: 'commercial_lease_2026.pdf',
      fileType: 'application/pdf',
      fileSize: '2.4 MB',
      category: 'Lease & Real Estate',
      summary: 'Standard commercial lease with 36-month duration, early termination penalty clauses, and landlord maintenance requirements.',
      riskLevel: 'Medium',
      clausesCount: 14,
      clauses: [
        { title: 'Indemnification Clause', risk: 'High', text: 'Tenant holds landlord harmless for all indirect and third-party damages.' },
        { title: 'Rent Escalation', risk: 'Medium', text: '3.5% annual rent increase starting Year 2.' },
        { title: 'Early Termination', risk: 'Low', text: '90-day written notice with 2 months rent penalty fee.' }
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      _id: 'doc_2',
      title: 'Master Services Agreement (MSA)',
      fileName: 'msa_vendor_v3.pdf',
      fileType: 'application/pdf',
      fileSize: '1.8 MB',
      category: 'Vendor Contracts',
      summary: 'B2B Software development services agreement specifying SLA commitments, IP assignment, and liability limits capped at 12x monthly fees.',
      riskLevel: 'Low',
      clausesCount: 22,
      clauses: [
        { title: 'IP Rights Transfer', risk: 'Low', text: 'All work product assigned exclusively to Client upon receipt of payment.' },
        { title: 'Limitation of Liability', risk: 'Low', text: 'Capped at total fees paid in previous 12 months.' }
      ],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      _id: 'doc_3',
      title: 'Non-Disclosure Agreement (NDA)',
      fileName: 'mutual_nda_confidential.docx',
      fileType: 'application/docx',
      fileSize: '512 KB',
      category: 'NDAs & Confidentiality',
      summary: 'Mutual non-disclosure agreement with 3-year confidentiality term and non-solicitation restrictions for engineering staff.',
      riskLevel: 'High',
      clausesCount: 8,
      clauses: [
        { title: 'Non-Solicitation', risk: 'High', text: 'Extends for 24 months post termination across all departments worldwide.' },
        { title: 'Confidentiality Scope', risk: 'Medium', text: 'Broad definition including unwritten technical discussions.' }
      ],
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    }
  ]
};

export async function dbConnect() {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    useMemoryFallback = false;
    return { isConnected: true, isMemory: false };
  }

  if (useMemoryFallback) {
    return { isConnected: false, isMemory: true };
  }

  if (connectPromise) {
    return connectPromise;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lexai';

  connectPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });
      isConnected = true;
      useMemoryFallback = false;
      console.log('MongoDB Connected');
      return { isConnected: true, isMemory: false };
    } catch (error) {
      console.log('MongoDB connection notice: Local database instance not detected on 127.0.0.1:27017. Operating with in-memory store fallback.');
      useMemoryFallback = true;
      isConnected = false;
      return { isConnected: false, isMemory: true };
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export function getInMemoryStore() {
  return inMemoryStore;
}

export function isUsingMemory() {
  return useMemoryFallback || mongoose.connection.readyState !== 1;
}
