import { create } from 'zustand';
import api from '../lib/api';

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  FETCHED = 'FETCHED',
  PARSED = 'PARSED',
  METADATA_DONE = 'METADATA_DONE',
  CHUNKED = 'CHUNKED',
  CONTEXTUALIZED = 'CONTEXTUALIZED',
  EMBEDDED = 'EMBEDDED',
  BM25_INDEXED = 'BM25_INDEXED',
  VECTOR_INDEXED = 'VECTOR_INDEXED',
  READY = 'READY',
  FAILED = 'FAILED',
}

interface Document {
  id: string;
  originalName: string;
  status: DocumentStatus;
  createdAt: string;
  metadata?: any;
  error?: string | null;
}

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  fetchDocuments: () => Promise<void>;
  fetchDocumentById: (id: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  retryDocument: (id: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  fetchDocuments: async () => {
    // Only set loading on first fetch
    if (get().documents.length === 0) set({ isLoading: true });
    try {
      const res = await api.get('/documents');
      set({ documents: res.data.items || [] });
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      set({ isLoading: false });
    }
  },
  fetchDocumentById: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/documents/${id}`);
      set({ currentDocument: res.data });
    } catch (error) {
      console.error('Failed to fetch document detail', error);
      set({ currentDocument: null });
    } finally {
      set({ isLoading: false });
    }
  },
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      get().fetchDocuments();
    } catch (error) {
      console.error('Upload failed', error);
      throw error;
    }
  },
  deleteDocument: async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete document', error);
    }
  },
  retryDocument: async (id: string) => {
    try {
      await api.post(`/documents/${id}/retry`);
      get().fetchDocuments();
    } catch (error) {
      console.error('Failed to retry document', error);
    }
  },
}));
