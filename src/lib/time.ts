export const formatTime = (remainingMs: number) => {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000)
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}
