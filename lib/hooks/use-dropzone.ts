'use client'

import { useState } from 'react'
import type { DragEvent } from 'react'

export function useDropzone(onFiles: (files: FileList) => void) {
  const [isDragging, setIsDragging] = useState(false)

  const dropHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(true)
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      if (!isDragging) setIsDragging(true)
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault()
      // sadece konteynerin kendisinden cikinca kapat (cocuk ogelerde titremesin)
      if (e.currentTarget === e.target) setIsDragging(false)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) onFiles(files)
    },
  }

  return { isDragging, dropHandlers }
}
