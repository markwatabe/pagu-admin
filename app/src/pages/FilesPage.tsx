import { useState, useRef } from 'react';
import { db } from '../lib/db';
import { ClickToEdit } from '../components/ClickToEdit';
import { ViewToggle, useViewToggle } from '../components/ViewToggle';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);

function isImage(path: string | undefined): boolean {
  if (!path) return false;
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(ext);
}

export function FilesPage() {
  const { user } = db.useAuth();
  const { isLoading, error: queryError, data } = db.useQuery({ $files: { uploadedBy: {} } });

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [view, setView] = useViewToggle();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const files = (data?.$files ?? []).map((f) => {
    const raw = f.uploadedBy;
    const uploader = Array.isArray(raw) ? raw[0] : raw;
    return { ...f, uploader: uploader?.email ? uploader : null };
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setUploadError(null);

    if (selected && !selected.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
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
    if (!file || !name.trim()) return;

    setUploading(true);
    setUploadError(null);

    try {
      const path = `images/${Date.now()}-${file.name}`;

      // Get image dimensions before uploading
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = URL.createObjectURL(file);
      });

      await db.storage.upload(path, file);

      const result = await db.queryOnce({ $files: { $: { where: { path } } } });
      const fileRecord = result.data.$files[0];
      if (fileRecord) {
        const tx: Parameters<typeof db.transact>[0] = [
          db.tx.$files[fileRecord.id].update({
            name: name.trim(),
            created_at: Date.now(),
            ...(dims.width > 0 && { width: dims.width, height: dims.height }),
          }),
        ];
        if (user) {
          tx.push(db.tx.$files[fileRecord.id].link({ uploadedBy: user.id }));
        }
        await db.transact(tx);
      }

      setFile(null);
      setName('');
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const canSubmit = !!file && name.trim().length > 0 && !uploading;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.id)));
    }
  }

  async function handleDeleteSelected() {
    setDeleting(true);
    try {
      const toDelete = files.filter((f) => selected.has(f.id));
      await Promise.all(
        toDelete.map((f) => f.path ? db.storage.delete(f.path) : db.transact([db.tx.$files[f.id].delete()]))
      );
      setSelected(new Set());
      setShowDeleteModal(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleReplace(fileId: string, oldUrl: string, oldPath: string) {
    const input = replaceInputRef.current;
    if (!input) return;

    // Trigger file picker
    input.onchange = async (e) => {
      const newFile = (e.target as HTMLInputElement).files?.[0];
      if (!newFile) return;
      if (!newFile.type.startsWith('image/')) {
        setUploadError('Please select an image file.');
        return;
      }

      setReplacing(fileId);
      setUploadError(null);

      try {
        // Upload new file
        const newPath = `images/${Date.now()}-${newFile.name}`;
        await db.storage.upload(newPath, newFile);

        // Get new file record and URL
        const result = await db.queryOnce({ $files: { $: { where: { path: newPath } } } });
        const newRecord = result.data.$files[0];
        if (!newRecord?.url) throw new Error('Upload succeeded but could not find new file URL');

        // Get image dimensions
        const dims = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = URL.createObjectURL(newFile);
        });

        // Update new file record with metadata from old file
        const oldFile = files.find((f) => f.id === fileId);
        await db.transact([
          db.tx.$files[newRecord.id].update({
            name: oldFile?.name || newFile.name,
            created_at: Date.now(),
            ...(dims.width > 0 && { width: dims.width, height: dims.height }),
          }),
          ...(user ? [db.tx.$files[newRecord.id].link({ uploadedBy: user.id })] : []),
        ]);

        // Replace URL in all menu layouts on the server
        await fetch('/api/files/replace-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldUrl, newUrl: newRecord.url }),
        });

        // Delete the old file
        if (oldPath) {
          await db.storage.delete(oldPath);
        } else {
          await db.transact([db.tx.$files[fileId].delete()]);
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Replace failed.');
      } finally {
        setReplacing(null);
        input.value = '';
      }
    };

    input.click();
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {/* Hidden input for replace file picker */}
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Files</h1>
      </div>

      {/* Upload form */}
      <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give this file a name"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={!canSubmit}
            className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-40 rounded-lg border border-gray-200 object-contain"
            />
          </div>
        )}

        {uploadError && (
          <p className="mt-3 text-sm text-red-600">{uploadError}</p>
        )}
      </div>

      {/* View toggle + file list */}
      {isLoading && <p className="text-gray-500">Loading...</p>}

      {queryError && (
        <p className="text-sm text-red-600">
          Failed to load files: {queryError.message}
        </p>
      )}

      {!isLoading && !queryError && files.length === 0 && (
        <p className="text-gray-500">No files uploaded yet.</p>
      )}

      {files.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              {view === 'table' && selected.size > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  Delete {selected.size} file{selected.size > 1 ? 's' : ''}
                </button>
              )}
            </div>
            <ViewToggle view={view} onChangeView={(v) => { setView(v); if (v === 'cards') setSelected(new Set()); }} />
          </div>

          {view === 'cards' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                      {isImage(file.path) ? (
                        <img
                          src={file.url}
                          alt={file.path}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-10 w-10 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </a>
                  <button
                    onClick={() => handleReplace(file.id, file.url, file.path)}
                    disabled={replacing === file.id}
                    className="absolute right-2 top-2 hidden rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur transition hover:bg-white group-hover:block disabled:opacity-50"
                  >
                    {replacing === file.id ? 'Replacing...' : 'Replace'}
                  </button>
                  <p className="mt-2 truncate text-sm font-medium text-gray-700 group-hover:text-indigo-600">
                    {file.name || file.path?.split('/').pop() || 'Untitled'}
                  </p>
                  {file.uploader && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {(file.uploader.avatarURL || file.uploader.imageURL) ? (
                        <img
                          src={file.uploader.avatarURL || file.uploader.imageURL}
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[8px] font-semibold text-indigo-600">
                          {file.uploader.email[0].toUpperCase()}
                        </div>
                      )}
                      <p className="truncate text-xs text-gray-400">
                        {file.uploader.email}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-10 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={files.length > 0 && selected.size === files.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-4">Preview</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Dimensions</th>
                    <th className="px-6 py-4">Uploaded by</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {files.map((file) => (
                    <tr key={file.id} className={`transition hover:bg-gray-50 ${selected.has(file.id) ? 'bg-indigo-50' : ''}`}>
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(file.id)}
                          onChange={() => toggleSelect(file.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          {isImage(file.path) ? (
                            <img
                              src={file.url}
                              alt=""
                              className="h-10 w-10 rounded-md border border-gray-200 object-contain"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-50">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </a>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900">
                        <ClickToEdit
                          value={file.name || file.path?.split('/').pop() || 'Untitled'}
                          onCommit={(newName) => db.transact([db.tx.$files[file.id].update({ name: newName })])}
                        />
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {file.width && file.height
                          ? `${file.width} × ${file.height}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        {file.uploader ? (
                          <div className="flex items-center gap-2">
                            {(file.uploader.avatarURL || file.uploader.imageURL) ? (
                              <img
                                src={file.uploader.avatarURL || file.uploader.imageURL}
                                alt=""
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-600">
                                {file.uploader.email[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-gray-600">{file.uploader.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-400">
                        {file.created_at
                          ? new Date(file.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleReplace(file.id, file.url, file.path)}
                          disabled={replacing === file.id}
                          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                        >
                          {replacing === file.id ? 'Replacing...' : 'Replace'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete files</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete {selected.size} file{selected.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
