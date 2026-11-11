export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
export const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{10,160}$/

const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
  'youtu.be', 'www.youtu.be',
])

/**
 * Parse standard video, Shorts, live, music, embed, and playlist URLs.
 * A watch URL containing a valid list= parameter intentionally opens the playlist.
 * Return only validated identifiers; never pass arbitrary URLs into the embed.
 */
export function parseYouTubeReference(value) {
  const text = String(value ?? '').trim()
  if (VIDEO_ID_RE.test(text)) return { kind: 'video', videoId: text }

  const matches = text.match(/(?:https?:\/\/)?(?:(?:www|m|music)\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s<>"']+/gi) || []
  for (const raw of matches) {
    try {
      const cleaned = raw.replace(/[)\],;.!?]+$/, '')
      const url = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : 'https://' + cleaned)
      const host = url.hostname.toLowerCase()
      if (!HOSTS.has(host)) continue

      const parts = url.pathname.split('/').filter(Boolean)
      let videoId = null
      if (host === 'youtu.be' || host === 'www.youtu.be') {
        videoId = parts[0] || null
      } else if (parts[0] === 'watch') {
        videoId = url.searchParams.get('v')
      } else if (['shorts', 'live', 'embed', 'v'].includes(parts[0])) {
        videoId = parts[1] || null
      }

      if (!VIDEO_ID_RE.test(videoId || '')) videoId = null
      const list = url.searchParams.get('list')
      const playlistId = PLAYLIST_ID_RE.test(list || '') ? list : null
      if (playlistId) return { kind: 'youtubePlaylist', playlistId, videoId }
      if (videoId) return { kind: 'video', videoId }
    } catch (_) { /* Malformed candidate; examine the next link. */ }
  }
  return null
}

export function cleanVideoIds(values, max = 250) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter(id => typeof id === 'string' && VIDEO_ID_RE.test(id)))].slice(0, max)
}
