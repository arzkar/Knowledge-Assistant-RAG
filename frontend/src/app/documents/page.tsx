'use client';

import { useEffect, useState } from 'react';
import { useDocumentStore } from '@/store/documents';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Trash2, RotateCcw, ExternalLink, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function DocumentsPage() {
  const { documents, isLoading, fetchDocuments, uploadDocument, deleteDocument, retryDocument, cancelDocument } = useDocumentStore();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadDocument(file);
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; animate: boolean }> = {
      UPLOADED: { label: 'Uploaded', className: 'bg-secondary text-secondary-foreground', animate: false },
      FETCHED: { label: 'Preparing...', className: 'border-primary text-primary', animate: true },
      PARSED: { label: 'Extracting Text...', className: 'border-blue-500 text-blue-500', animate: true },
      METADATA_DONE: { label: 'Analyzing Content...', className: 'border-purple-500 text-blue-500', animate: true },
      CHUNKED: { label: 'Organizing Chunks...', className: 'border-blue-400 text-blue-400', animate: true },
      CONTEXTUALIZED: { label: 'Adding Context...', className: 'border-indigo-500 text-indigo-500', animate: true },
      EMBEDDED: { label: 'Generating Vectors...', className: 'border-cyan-500 text-cyan-500', animate: true },
      BM25_INDEXED: { label: 'Keyword Indexing...', className: 'border-teal-500 text-teal-500', animate: true },
      VECTOR_INDEXED: { label: 'Finalizing Search...', className: 'border-emerald-500 text-emerald-500', animate: true },
      READY: { label: 'Ready', className: 'bg-green-500 text-white', animate: false },
      FAILED: { label: 'Failed', className: 'bg-red-500 text-white', animate: false },
    };

    const config = statusMap[status] || { label: status, className: '', animate: false };

    return (
      <Badge 
        variant={config.animate ? 'outline' : 'default'} 
        className={`${config.className} ${config.animate ? 'animate-pulse' : ''} whitespace-nowrap`}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Documents</h1>
        <div className="flex items-center gap-4">
          <Input
            type="file"
            className="hidden"
            id="file-upload"
            onChange={handleFileChange}
            accept=".pdf,.txt,.md"
          />
          <Button asChild disabled={isUploading}>
            <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
              {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </label>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No documents found. Upload one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors hover:underline underline-offset-4"
                      >
                        {doc.originalName}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {doc.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => retryDocument(doc.id)}
                            title="Retry Ingestion"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {doc.status !== 'READY' && doc.status !== 'FAILED' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => cancelDocument(doc.id)}
                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 underline-offset-4"
                            title="Cancel Ingestion"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDocument(doc.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
