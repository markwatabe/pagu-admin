import { db } from './db'

export interface UploadResult {
  id: string
  url: string
  path: string
  width: number
  height: number
}

/**
 * Upload an image file to InstantDB storage with metadata.
 * Returns the file record id, url, path, and dimensions.
 */
export async function uploadImageFile(
  file: File,
  name: string,
  userId?: string,
): Promise<UploadResult> {
  const path = `images/${Date.now()}-${file.name}`

  // Get image dimensions before uploading
  const dims = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = URL.createObjectURL(file)
  })

  await db.storage.upload(path, file)

  const result = await db.queryOnce({ $files: { $: { where: { path } } } })
  const fileRecord = result.data.$files[0]
  if (!fileRecord) throw new Error('Upload succeeded but file record not found')

  const tx: Parameters<typeof db.transact>[0] = [
    db.tx.$files[fileRecord.id].update({
      name: name.trim(),
      created_at: Date.now(),
      ...(dims.width > 0 && { width: dims.width, height: dims.height }),
    }),
  ]
  if (userId) {
    tx.push(db.tx.$files[fileRecord.id].link({ uploadedBy: userId }))
  }
  await db.transact(tx)

  return {
    id: fileRecord.id,
    url: fileRecord.url,
    path,
    width: dims.width,
    height: dims.height,
  }
}
