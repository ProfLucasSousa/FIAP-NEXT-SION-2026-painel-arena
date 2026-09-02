export const formatTime = (elapsedMs: number) => {
  const seconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}

export const formatArenaTime = (elapsedMs: number) => {
  const seconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}
