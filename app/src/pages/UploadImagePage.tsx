import { useState, useRef } from 'react';
import { db } from '../lib/db';

export function UploadImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setUploadedUrl(null);

    if (selected && !selected.type.startsWith('image/')) {
      setError('Please select an image file.');
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const path = `images/${Date.now()}-${file.name}`;
      await db.storage.upload(path, file);
      const url = await db.storage.getDownloadUrl(path);
      setUploadedUrl(url);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Upload Image</h1>
        <p className="mt-1 text-gray-500">Upload an image to InstantDB storage</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select an image
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
        />

        {preview && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-gray-700">Preview</p>
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 rounded-lg border border-gray-200 object-contain"
            />
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>

        {uploadedUrl && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-2 text-sm font-semibold text-green-800">Upload successful!</p>
            <img
              src={uploadedUrl}
              alt="Uploaded"
              className="mb-3 max-h-64 rounded-lg border border-gray-200 object-contain"
            />
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 underline hover:text-indigo-800 break-all"
            >
              {uploadedUrl}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
