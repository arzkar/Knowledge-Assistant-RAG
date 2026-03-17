'use client';

import React from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import type { RenderPageProps } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface Prov {
  page_no: number;
  bbox?: [number, number, number, number] | { l: number; t: number; r: number; b: number };
}

interface PDFSourceViewerProps {
  documentId: string;
  pageNumber: number;
  prov?: Prov[];
  token: string | null;
}

const PDFSourceViewer: React.FC<PDFSourceViewerProps> = ({ documentId, pageNumber, prov, token }) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const getToken = () => {
    if (token) return token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const currentToken = getToken();

  console.log('PDFSourceViewer: Using token:', currentToken ? currentToken.substring(0, 5) + '...' : 'NONE');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const fileUrl = `${apiUrl}/documents/${documentId}/view${
    currentToken ? `?token=${currentToken}` : ''
  }`;

  const renderPage = (props: RenderPageProps) => {
    // Check if this page has any highlights in prov
    const pageProv = prov?.filter(p => p.page_no === props.pageIndex + 1);

    return (
      <>
        {props.canvasLayer.children}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {pageProv?.map((p, idx) => {
            if (!p.bbox) return null;
            
            let l, t, r, b;
            if (Array.isArray(p.bbox)) {
              [l, t, r, b] = p.bbox;
            } else {
              ({ l, t, r, b } = p.bbox);
            }

            // Docling coordinates are often bottom-up (standard PDF) or top-down
            // We need to verify which one it is. Usually l, t, r, b from Docling is [left, top, right, bottom] in 72dpi
            // But PDF coordinates are usually bottom-up.
            // Let's assume they are absolute points in the page coordinate space.
            
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  backgroundColor: 'rgba(255, 255, 0, 0.3)',
                  border: '1px solid yellow',
                  left: `${(l / props.width) * 100}%`,
                  top: `${(t / props.height) * 100}%`,
                  width: `${((r - l) / props.width) * 100}%`,
                  height: `${((b - t) / props.height) * 100}%`,
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </div>
        {props.textLayer.children}
        {props.annotationLayer.children}
      </>
    );
  };

  return (
    <div className="h-[400px] w-full border rounded-lg overflow-hidden bg-muted/20">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          httpHeaders={
            currentToken
              ? {
                  Authorization: `Bearer ${currentToken}`,
                }
              : {}
          }
          initialPage={pageNumber - 1}
          plugins={[defaultLayoutPluginInstance]}
          renderPage={renderPage}
        />
      </Worker>
    </div>
  );
};

export default PDFSourceViewer;
