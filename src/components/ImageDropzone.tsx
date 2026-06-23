'use client'

import { useRef, useState } from 'react'

interface Props {
  currentUrl: string | null
  onUpload: (url: string, source: 'uploaded_file') => void
}

export default function ImageDropzone({ currentUrl, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
      return
    }

    setPreviewUrl(data.signedUrl)
    onUpload(data.url, 'uploaded_file')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
        dragging ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />

      {(previewUrl ?? currentUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl ?? currentUrl ?? ''} alt="Product" className="absolute inset-0 w-full h-full object-cover" />
      )}

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 hover:bg-black/30 transition-colors ${currentUrl ? '' : 'bg-gray-50'}`}>
        {uploading ? (
          <span className="text-xs text-white font-medium bg-black/50 px-3 py-1.5 rounded-full">Uploading…</span>
        ) : (
          <div className={`text-center ${currentUrl ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
            <p className="text-sm font-medium text-gray-500">
              {currentUrl ? 'Drop to replace' : 'Drop image here'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
          </div>
        )}
      </div>

      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
