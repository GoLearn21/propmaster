/**
 * Image Uploader Component
 * Drag-and-drop image upload with preview, compression, and validation
 * Optimized for maintenance request photos
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  caption?: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

interface ImageUploaderProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  showCaptions?: boolean;
  disabled?: boolean;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compress image using canvas
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  showCaptions = true,
  disabled = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection
   */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);

      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;

      if (remainingSlots <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToProcess = fileArray.slice(0, remainingSlots);
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      const newImages: ImageFile[] = [];

      for (const file of filesToProcess) {
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Accepted: JPG, PNG, WebP`);
          continue;
        }

        // Validate file size
        if (file.size > maxSizeBytes) {
          setError(`File too large: ${file.name}. Max size: ${maxSizeMB}MB`);
          continue;
        }

        // Compress image if it's larger than 1MB
        let processedFile = file;
        if (file.size > 1024 * 1024) {
          processedFile = await compressImage(file);
        }

        // Create preview
        const preview = URL.createObjectURL(processedFile);

        newImages.push({
          id: generateId(),
          file: processedFile,
          preview,
        });
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    },
    [images, onChange, maxImages, maxSizeMB, acceptedTypes]
  );

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles, disabled]
  );

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  /**
   * Remove an image
   */
  const handleRemove = useCallback(
    (id: string) => {
      const imageToRemove = images.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      onChange(images.filter((img) => img.id !== id));
    },
    [images, onChange]
  );

  /**
   * Update image caption
   */
  const handleCaptionChange = useCallback(
    (id: string, caption: string) => {
      onChange(
        images.map((img) =>
          img.id === id ? { ...img, caption } : img
        )
      );
    },
    [images, onChange]
  );

  /**
   * Open file picker
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${isDragging
              ? 'border-primary bg-primary/5'
              : 'border-neutral-light hover:border-neutral'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={!disabled ? openFilePicker : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            multiple
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-lightest mb-3">
              {isDragging ? (
                <Upload className="h-6 w-6 text-primary animate-bounce" />
              ) : (
                <Camera className="h-6 w-6 text-neutral" />
              )}
            </div>

            <p className="text-sm font-medium text-neutral-darkest mb-1">
              {isDragging ? 'Drop images here' : 'Drag & drop photos or click to browse'}
            </p>
            <p className="text-xs text-neutral">
              JPG, PNG up to {maxSizeMB}MB each ({images.length}/{maxImages})
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative group"
            >
              {/* Image Preview */}
              <div className="aspect-square rounded-lg overflow-hidden bg-neutral-lightest border border-neutral-light">
                <img
                  src={image.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(image.id)}
                    disabled={disabled}
                    className="
                      opacity-0 group-hover:opacity-100 transition-opacity
                      p-2 bg-white rounded-full shadow-lg
                      hover:bg-error hover:text-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Status Indicators */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                  </div>
                )}
                {image.uploaded && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-success bg-white rounded-full" />
                  </div>
                )}
                {image.error && (
                  <div className="absolute top-2 right-2">
                    <AlertCircle className="h-5 w-5 text-error bg-white rounded-full" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="mt-2">
                <p className="text-xs text-neutral truncate" title={image.file.name}>
                  {image.file.name}
                </p>
                <p className="text-xs text-neutral">
                  {formatFileSize(image.file.size)}
                </p>
              </div>

              {/* Caption Input */}
              {showCaptions && (
                <input
                  type="text"
                  value={image.caption || ''}
                  onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                  placeholder="Add caption..."
                  disabled={disabled}
                  className="
                    mt-2 w-full text-xs px-2 py-1 border border-neutral-light rounded
                    focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
                    disabled:bg-neutral-lightest disabled:cursor-not-allowed
                  "
                  maxLength={100}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Max Images Reached */}
      {!canAddMore && (
        <p className="text-sm text-neutral text-center">
          Maximum {maxImages} images reached
        </p>
      )}

      {/* Mobile Camera Button */}
      {canAddMore && (
        <div className="flex gap-2 sm:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFilePicker}
            disabled={disabled}
            className="flex-1"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.capture = 'environment';
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) handleFiles(files);
              };
              input.click();
            }}
            disabled={disabled}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Image preview component for displaying uploaded images
 */
export interface ImagePreviewProps {
  images: Array<{
    id: string;
    image_url: string;
    thumbnail_url?: string;
    caption?: string;
  }>;
  onImageClick?: (index: number) => void;
}

export function ImagePreviewGrid({ images, onImageClick }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {images.map((image, index) => (
        <button
          key={image.id}
          onClick={() => onImageClick?.(index)}
          className="aspect-square rounded-lg overflow-hidden bg-neutral-lightest border border-neutral-light hover:border-primary transition-colors"
        >
          <img
            src={image.thumbnail_url || image.image_url}
            alt={image.caption || `Image ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Simple lightbox for viewing images
 */
interface LightboxProps {
  images: Array<{
    image_url: string;
    caption?: string;
  }>;
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors disabled:opacity-30"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onNext}
            disabled={currentIndex === images.length - 1}
            className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors disabled:opacity-30"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image */}
      <img
        src={currentImage.image_url}
        alt={currentImage.caption || 'Full size'}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />

      {/* Caption and counter */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        {currentImage.caption && (
          <p className="text-white mb-2">{currentImage.caption}</p>
        )}
        <p className="text-white/60 text-sm">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
