/**
 * Document Viewer Component
 * Displays PDF documents with download and zoom controls
 * Mobile-optimized with touch-friendly controls
 */

import React, { useState, useCallback } from 'react';
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { downloadDocument } from '../../services/tenant/tenantDocumentService';

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  documentType?: string;
  onClose?: () => void;
  showHeader?: boolean;
  allowDownload?: boolean;
  fullscreen?: boolean;
}

export default function DocumentViewer({
  documentUrl,
  documentName,
  documentType = 'PDF',
  onClose,
  showHeader = true,
  allowDownload = true,
  fullscreen = false,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [downloading, setDownloading] = useState(false);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    setLoading(false);
    setError('Failed to load document. Please try downloading instead.');
  }, []);

  // Handle download
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocument(documentUrl, documentName);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Open in new tab
  const openInNewTab = () => {
    window.open(documentUrl, '_blank');
  };

  // Check if document is a PDF
  const isPdf = documentUrl.toLowerCase().endsWith('.pdf') ||
                documentUrl.includes('application/pdf');

  // Container classes based on fullscreen state
  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-neutral-darkest flex flex-col'
    : 'flex flex-col h-full min-h-[400px] bg-white rounded-lg border border-neutral-light overflow-hidden';

  return (
    <div className={containerClasses}>
      {/* Header */}
      {showHeader && (
        <div className={`
          flex items-center justify-between px-4 py-3 border-b
          ${isFullscreen ? 'bg-neutral-dark border-neutral-dark' : 'bg-neutral-lightest border-neutral-light'}
        `}>
          {/* Document info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
              ${isFullscreen ? 'bg-neutral text-neutral-light' : 'bg-primary/10 text-primary'}
            `}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className={`font-medium truncate ${isFullscreen ? 'text-white' : 'text-neutral-darkest'}`}>
                {documentName}
              </h3>
              <p className={`text-xs ${isFullscreen ? 'text-neutral-light' : 'text-neutral'}`}>
                {documentType}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Zoom controls (desktop only) */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className={`
                  p-2 rounded-lg transition-colors disabled:opacity-50
                  ${isFullscreen
                    ? 'text-white hover:bg-white/10'
                    : 'text-neutral hover:bg-neutral-light'}
                `}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className={`
                  px-2 py-1 text-sm font-medium rounded transition-colors
                  ${isFullscreen
                    ? 'text-white hover:bg-white/10'
                    : 'text-neutral hover:bg-neutral-light'}
                `}
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className={`
                  p-2 rounded-lg transition-colors disabled:opacity-50
                  ${isFullscreen
                    ? 'text-white hover:bg-white/10'
                    : 'text-neutral hover:bg-neutral-light'}
                `}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Open in new tab */}
            <button
              onClick={openInNewTab}
              className={`
                p-2 rounded-lg transition-colors
                ${isFullscreen
                  ? 'text-white hover:bg-white/10'
                  : 'text-neutral hover:bg-neutral-light'}
              `}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className={`
                p-2 rounded-lg transition-colors
                ${isFullscreen
                  ? 'text-white hover:bg-white/10'
                  : 'text-neutral hover:bg-neutral-light'}
              `}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Download button */}
            {allowDownload && (
              <Button
                variant={isFullscreen ? 'outline' : 'primary'}
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className={isFullscreen ? 'border-white/30 text-white hover:bg-white/10' : ''}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </>
                )}
              </Button>
            )}

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-colors ml-2
                  ${isFullscreen
                    ? 'text-white hover:bg-white/10'
                    : 'text-neutral hover:bg-neutral-light'}
                `}
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document viewer area */}
      <div className="flex-1 relative overflow-hidden bg-neutral-dark">
        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-white animate-spin mx-auto mb-3" />
              <p className="text-neutral-light">Loading document...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark">
            <div className="text-center p-6 max-w-md">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-error" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Unable to Display Document
              </h3>
              <p className="text-neutral-light mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" onClick={handleDownload} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download Document
                </Button>
                <Button
                  variant="outline"
                  onClick={openInNewTab}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        {isPdf && !error && (
          <div
            className="w-full h-full overflow-auto"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <iframe
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title={documentName}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}

        {/* Non-PDF document fallback */}
        {!isPdf && !error && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-6">
              <FileText className="h-16 w-16 text-neutral-light mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Document Preview Not Available
              </h3>
              <p className="text-neutral-light mb-4">
                This document type cannot be previewed in the browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" onClick={handleDownload} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download to View
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact document viewer for inline use
 */
interface CompactDocumentViewerProps {
  documentUrl: string;
  documentName: string;
  height?: number | string;
}

export function CompactDocumentViewer({
  documentUrl,
  documentName,
  height = 400,
}: CompactDocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div
      className="relative bg-neutral-dark rounded-lg overflow-hidden"
      style={{ height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4">
            <AlertCircle className="h-8 w-8 text-neutral-light mx-auto mb-2" />
            <p className="text-sm text-neutral-light">Preview unavailable</p>
          </div>
        </div>
      )}

      <iframe
        src={`${documentUrl}#toolbar=0&navpanes=0`}
        className="w-full h-full border-0"
        title={documentName}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

/**
 * Document thumbnail preview
 */
interface DocumentThumbnailProps {
  documentUrl: string;
  documentName: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function DocumentThumbnail({
  documentUrl,
  documentName,
  onClick,
  size = 'md',
}: DocumentThumbnailProps) {
  const sizeClasses = {
    sm: 'w-16 h-20',
    md: 'w-24 h-32',
    lg: 'w-32 h-40',
  };

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        relative bg-neutral-lightest rounded-lg border border-neutral-light
        flex items-center justify-center overflow-hidden
        hover:border-primary hover:shadow-sm transition-all
        group
      `}
    >
      {/* Placeholder icon */}
      <FileText className={`${iconSizes[size]} text-neutral`} />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs font-medium">View</span>
      </div>
    </button>
  );
}

/**
 * Document viewer modal wrapper
 */
interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType?: string;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentType,
}: DocumentViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl">
        <DocumentViewer
          documentUrl={documentUrl}
          documentName={documentName}
          documentType={documentType}
          onClose={onClose}
          allowDownload
        />
      </div>
    </div>
  );
}
