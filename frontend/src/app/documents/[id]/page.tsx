'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocumentStore, DocumentStatus } from '@/store/documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  XCircle, 
  RotateCcw, 
  Trash2,
  FileText,
  Tags,
  AlignLeft
} from 'lucide-react';
import Link from 'next/link';

const SAGA_STEPS = [
  { id: DocumentStatus.UPLOADED, label: 'Uploaded', description: 'File received and saved' },
  { id: DocumentStatus.FETCHED, label: 'Fetched', description: 'File validated for processing' },
  { id: DocumentStatus.PARSED, label: 'Parsed', description: 'Content extracted via Docling' },
  { id: DocumentStatus.METADATA_DONE, label: 'Analyzed', description: 'Metadata extracted via LLM' },
  { id: DocumentStatus.CHUNKED, label: 'Chunked', description: 'Divided into semantic blocks' },
  { id: DocumentStatus.CONTEXTUALIZED, label: 'Contextualized', description: 'Injected with document context' },
  { id: DocumentStatus.EMBEDDED, label: 'Embedded', description: 'Vector embeddings generated' },
  { id: DocumentStatus.BM25_INDEXED, label: 'Keyword Indexed', description: 'Added to OpenSearch' },
  { id: DocumentStatus.VECTOR_INDEXED, label: 'Vector Indexed', description: 'Added to Qdrant' },
  { id: DocumentStatus.READY, label: 'Ready', description: 'Fully ingested and searchable' },
];

export default function DocumentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { currentDocument, isLoading, fetchDocumentById, retryDocument, deleteDocument } = useDocumentStore();

  useEffect(() => {
    if (id) {
      fetchDocumentById(id);
      const interval = setInterval(() => fetchDocumentById(id), 3000);
      return () => clearInterval(interval);
    }
  }, [id, fetchDocumentById]);

  if (isLoading && !currentDocument) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className="container mx-auto py-10 text-center space-y-4">
        <h1 className="text-2xl font-bold">Document not found</h1>
        <Button asChild variant="outline">
          <Link href="/documents"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents</Link>
        </Button>
      </div>
    );
  }

  const currentStepIndex = SAGA_STEPS.findIndex(step => step.id === currentDocument.status);
  const isFailed = currentDocument.status === DocumentStatus.FAILED;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(currentDocument.id);
      router.push('/documents');
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/documents"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{currentDocument.originalName}</h1>
            <p className="text-muted-foreground">ID: {currentDocument.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFailed && (
            <Button variant="outline" onClick={() => retryDocument(currentDocument.id)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retry Ingestion
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Saga Status Tracker */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ingestion Saga</CardTitle>
            <CardDescription>Track the lifecycle of your document</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {SAGA_STEPS.map((step, index) => {
                const isCompleted = currentStepIndex > index || currentDocument.status === DocumentStatus.READY;
                const isCurrent = currentStepIndex === index && !isFailed;
                const stepFailed = isFailed && currentStepIndex === index;

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-1 border-2 ${
                        isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                        stepFailed ? 'bg-destructive border-destructive text-destructive-foreground' :
                        isCurrent ? 'border-primary text-primary animate-pulse' : 
                        'border-muted text-muted'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : 
                         stepFailed ? <XCircle className="h-4 w-4" /> :
                         <Circle className="h-4 w-4" />}
                      </div>
                      {index < SAGA_STEPS.length - 1 && (
                        <div className={`w-0.5 h-full min-h-[20px] my-1 ${
                          isCompleted ? 'bg-primary' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${
                        isCurrent ? 'text-primary' : 
                        stepFailed ? 'text-destructive' :
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
              
              {isFailed && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <p className="font-bold flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4" /> Pipeline Failed
                  </p>
                  <p className="font-mono text-xs break-all">{currentDocument.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata & Content */}
        <div className="lg:col-span-2 space-y-8">
          {currentDocument.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  Extracted Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Title</h4>
                  <p className="text-xl font-medium">{currentDocument.metadata.title || 'No title extracted'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Summary</h4>
                  <p className="text-sm leading-relaxed text-balance">
                    {currentDocument.metadata.summary || 'No summary available'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentDocument.metadata.keywords?.map((keyword: string, i: number) => (
                      <Badge key={i} variant="secondary">{keyword}</Badge>
                    )) || <span className="text-sm text-muted-foreground italic">No keywords extracted</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Document Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Created At</p>
                  <p className="text-sm">{new Date(currentDocument.createdAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
                  <p className="text-sm font-medium">{currentDocument.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
