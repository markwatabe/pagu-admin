import { useState, useRef } from 'react';
import { db } from '../lib/db';

export function AccountPage() {
  const { user } = db.useAuth();
  const { data } = db.useQuery(
    user ? { $users: { $: { where: { id: user.id } } } } : null,
  );
  const profile = data?.$users?.[0];

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);

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
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    try {
      const path = `avatars/${user.id}-${Date.now()}-${file.name}`;
      await db.storage.upload(path, file);
      const url = await db.storage.getDownloadUrl(path);

      await db.transact([
        db.tx.$users[user.id].update({ avatarURL: url }),
      ]);

      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const currentImage = preview || profile?.avatarURL || profile?.imageURL;

  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Account</h1>
        <p className="mt-1 text-gray-500">{user?.email}</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile Image</h2>

        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {currentImage ? (
              <img
                src={currentImage}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-6 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </section>
  );
}
