import { create } from 'zustand';
import api from '../lib/api';

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  READY = 'READY',
  FAILED = 'FAILED',
}

interface Document {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
}

interface DocumentState {
  documents: Document[];
  isLoading: boolean;
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  isLoading: false,
  fetchDocuments: async () => {
    // Only set loading on first fetch
    if (get().documents.length === 0) set({ isLoading: true });
    try {
      const res = await api.get('/documents');
      set({ documents: res.data });
    } catch (error) {
      console.error('Failed to fetch documents', error);
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
}));
