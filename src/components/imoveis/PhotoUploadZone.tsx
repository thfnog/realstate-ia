'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImovelFoto } from '@/lib/database.types';

interface PhotoUploadZoneProps {
  onPhotosUploaded: (photos: ImovelFoto[]) => void;
  imovelId?: string;
}

export default function PhotoUploadZone({ onPhotosUploaded, imovelId }: PhotoUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    const newPhotos: ImovelFoto[] = [];

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('imovelId', imovelId || 'new');

        const res = await fetch('/api/imoveis/fotos', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const photo = await res.json();
          newPhotos.push(photo);
        }
      } catch (err) {
        console.error('Falha ao subir foto:', err);
      }
    }

    if (newPhotos.length > 0) {
      onPhotosUploaded(newPhotos);
    }
    setIsUploading(false);
  }, [onPhotosUploaded, imovelId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/heic': [],
    },
    maxSize: 15 * 1024 * 1024, // 15MB
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed p-12 rounded-3xl text-center transition-all cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-border bg-surface-alt/20 hover:bg-surface-alt/40'}
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input {...getInputProps()} />
      <span className="text-4xl mb-4 block">
        {isUploading ? '⌛' : '📸'}
      </span>
      {isUploading ? (
        <p className="text-text-primary font-bold animate-pulse">Processando imagens...</p>
      ) : (
        <>
          <p className="text-text-primary font-bold">
            {isDragActive ? 'Solte as fotos aqui' : 'Arraste fotos ou clique para carregar'}
          </p>
          <p className="text-text-tertiary text-xs mt-1">Suporta JPG, PNG, WEBP e HEIC (máx 15MB)</p>
        </>
      )}
    </div>
  );
}
