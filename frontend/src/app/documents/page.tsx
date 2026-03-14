'use client';

import { useEffect, useState } from 'react';
import { useDocumentStore, DocumentStatus } from '@/store/documents';
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
import { Loader2, Upload } from 'lucide-react';

export default function DocumentsPage() {
  const { documents, isLoading, fetchDocuments, uploadDocument } = useDocumentStore();
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
    switch (status) {
      case 'READY':
        return <Badge className="bg-green-500">Ready</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'UPLOADED':
        return <Badge variant="secondary">Uploaded</Badge>;
      default:
        return <Badge variant="outline" className="animate-pulse">{status}</Badge>;
    }
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    No documents found. Upload one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.originalName}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
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
