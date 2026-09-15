function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
        return
      }

      reject(new Error('Unable to read file as ArrayBuffer'))
    })

    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Unable to read file'))
    })

    reader.readAsArrayBuffer(file)
  })
}

export async function hashFileSha256(file: File): Promise<string> {
  const bytes = await readFileAsArrayBuffer(file)
  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
