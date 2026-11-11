<template>
  <main class="shell">
    <section class="workspace" aria-label="Developer workspace">
      <header class="topbar">
        <div class="identity"><span class="app-mark" aria-hidden="true">{ }</span><strong>DevTools</strong><span class="dim">/ workspace</span></div>
        <button class="icon-button" type="button" :aria-expanded="historyOpen" aria-controls="session-logs" title="Session logs" aria-label="Toggle session logs" @click="historyOpen = !historyOpen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2"/></svg>
        </button>
      </header>

      <nav class="tabs" aria-label="Workspace sections">
        <span class="tab current"><span class="file-dot"></span>input.json</span>
        <button type="button" class="tab tab-button" :class="{ selected: queueOpen }" :aria-expanded="queueOpen" aria-controls="saved-queue" @click="queueOpen = !queueOpen">queue.json <span class="count">{{ savedIds.length }}</span></button>
        <span class="tab muted">output.log</span><span class="tab-spacer"></span><span class="tab-meta">LOCAL</span>
      </nav>

      <form class="input-area" @submit.prevent="loadReference">
        <label for="reference-input"><span class="line-number">01</span> reference <span class="dim">: string</span></label>
        <div class="input-row">
          <input id="reference-input" v-model="input" autocomplete="off" spellcheck="false" type="text" placeholder="Paste a video or playlist URL…" aria-describedby="reference-hint" />
          <button v-if="input" class="clear-input" type="button" aria-label="Clear input" @click="input = ''">×</button>
        </div>
        <p id="reference-hint" class="hint"><span class="comment">//</span> Videos, Shorts, and YouTube playlist URLs</p>
        <div class="actions">
          <button class="secondary" type="button" @click="pasteClipboard">Paste input</button>
          <button class="primary" type="submit">↵ Run</button>
        </div>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="output-heading">
        <div class="output-label"><span class="state-dot"></span><strong>OUTPUT</strong><span class="state">{{ mode === 'youtubePlaylist' ? 'source playlist' : mode === 'favorites' ? 'saved queue' : currentId ? 'ready' : 'idle' }}</span></div>
        <div class="output-actions">
          <button v-if="currentId" class="heart-button" :class="{ active: isSaved(currentId) }" type="button" :aria-pressed="isSaved(currentId)" :aria-label="isSaved(currentId) ? 'Remove this video from saved playlist' : 'Save this video to playlist'" :title="isSaved(currentId) ? 'Remove from saved playlist' : 'Add to saved playlist'" @click="toggleSaved(currentId)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>
            {{ isSaved(currentId) ? 'Saved' : 'Save' }}
          </button>
          <button v-if="hasContent" class="text-button" type="button" :aria-expanded="viewerOpen" @click="toggleViewer">{{ viewerOpen ? 'Collapse' : 'Expand' }} output</button>
        </div>
      </div>

      <div v-if="viewerOpen && hasContent" class="viewer" aria-label="YouTube player"><div ref="frameHost" class="frame-host"></div></div>
      <div v-else class="output-placeholder"><span class="prompt">&gt;</span> {{ hasContent ? 'Output collapsed. Select Expand output.' : 'Ready for input. Run a reference to view output.' }}</div>

      <div v-if="mode === 'youtubePlaylist' && playlistId" class="source-line">
        <span>source.list</span><code>{{ playlistId }}</code>
        <button type="button" class="text-button" @click="copyCurrent">Copy link</button>
      </div>

      <div class="statusline">
        <span>SESSION / 01</span>
        <div class="status-actions">
          <button v-if="previousIds.length" type="button" class="text-button" @click="goBack">↶ Previous</button>
          <button v-if="currentId && mode !== 'youtubePlaylist'" class="text-button" type="button" @click="copyCurrent">Copy link</button>
          <button class="text-button" type="button" :aria-expanded="queueOpen" aria-controls="saved-queue" @click="queueOpen = !queueOpen">Saved queue ({{ savedIds.length }}) {{ queueOpen ? '⌃' : '⌄' }}</button>
          <button class="text-button" type="button" :aria-expanded="historyOpen" aria-controls="session-logs" @click="historyOpen = !historyOpen">Logs ({{ history.length }}) {{ historyOpen ? '⌃' : '⌄' }}</button>
        </div>
      </div>

      <section v-if="queueOpen" id="saved-queue" class="panel" aria-label="Saved playlist">
        <div class="panel-heading">
          <div><strong>Saved queue</strong><p class="subheading">Hearts toggle membership. Play all runs videos in saved order.</p></div>
          <button class="primary compact" type="button" :disabled="!savedIds.length" @click="playSavedQueue()">▶ Play all</button>
        </div>
        <p v-if="!savedIds.length" class="empty-note">No saved videos yet. Open any video and select the heart to add it.</p>
        <ol v-else class="queue-list">
          <li v-for="(id, index) in savedIds" :key="id">
            <button class="queue-entry" type="button" :title="'Play saved video ' + (index + 1)" @click="playSavedQueue(id)">
              <span class="queue-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <img class="queue-thumbnail" :src="'https://i.ytimg.com/vi/' + id + '/default.jpg'" alt="" loading="lazy" />
              <span class="queue-title">Video {{ index + 1 }}<small>{{ id }}</small></span>
              <span v-if="currentId === id && mode === 'favorites'" class="playing-label">ACTIVE</span>
            </button>
            <button class="remove-saved" type="button" :aria-label="'Remove ' + id + ' from saved playlist'" title="Remove from playlist" @click="toggleSaved(id)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>
            </button>
          </li>
        </ol>
        <p v-if="mode === 'favorites' && savedIds.length" class="hint queue-hint">Changes to an already playing sequence take effect next time you select Play all.</p>
      </section>

      <section v-if="historyOpen" id="session-logs" class="panel" aria-label="Session logs">
        <div class="panel-heading"><strong>Recent videos</strong><button v-if="history.length" type="button" class="text-button" @click="clearHistory">Clear logs</button></div>
        <p v-if="!history.length" class="empty-note">No videos recorded in this browser yet.</p>
        <ul v-else class="history-list">
          <li v-for="video in history" :key="video.id">
            <button type="button" class="history-entry" @click="openVideo(video.id)">▶ <span>{{ video.id }}</span> <small>{{ formatDate(video.openedAt) }}</small></button>
            <button class="delete-button" type="button" :aria-label="'Delete ' + video.id + ' from history'" title="Delete from history" @click="removeHistory(video.id)">Delete</button>
          </li>
        </ul>
        <div v-if="recentPlaylists.length" class="source-section">
          <h3>Recent source playlists</h3>
          <ul class="history-list">
            <li v-for="id in recentPlaylists" :key="id">
              <button type="button" class="history-entry" @click="openYouTubePlaylist(id)">▶ <span>{{ id }}</span></button>
              <button class="delete-button" type="button" :aria-label="'Remove playlist ' + id + ' from recent sources'" @click="removeSource(id)">Delete</button>
            </li>
          </ul>
        </div>
      </section>

      <footer class="footer"><span class="state-dot"></span> local workspace <span class="divider">·</span> playlists saved on this device</footer>
    </section>
  </main>
</template>

<script>
import { markRaw } from 'vue'
import { VIDEO_ID_RE, PLAYLIST_ID_RE, parseYouTubeReference, cleanVideoIds } from '@/utils/youtube.mjs'

const HISTORY_KEY = 'canwatch-history-v1'
const LEGACY_CURRENT_KEY = 'canwatch-current-video-v1'
const SAVED_KEY = 'canwatch-favorites-v1'
const SESSION_KEY = 'canwatch-session-v2'
const SOURCES_KEY = 'canwatch-playlist-sources-v1'
let youtubeApiPromise = null

function ensureYouTubeAPI() {
  if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    const timeout = setTimeout(() => reject(new Error('Player API timeout')), 6500)
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous()
      clearTimeout(timeout)
      if (window.YT && window.YT.Player) resolve(window.YT)
      else reject(new Error('Player API unavailable'))
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onerror = () => { clearTimeout(timeout); reject(new Error('Player API blocked')) }
    document.head.appendChild(tag)
  }).catch(error => { youtubeApiPromise = null; throw error })
  return youtubeApiPromise
}

export default {
  name: 'HelloWorld',
  data() {
    return {
      input: '',
      mode: 'video',
      playlistId: '',
      currentId: '',
      previousIds: [],
      savedIds: [],
      recentPlaylists: [],
      history: [],
      viewerOpen: false,
      queueOpen: false,
      historyOpen: false,
      error: '',
      playerInstance: null,
      frameGeneration: 0,
    }
  },
  computed: {
    hasContent() { return Boolean(this.currentId || (this.mode === 'youtubePlaylist' && this.playlistId)) }
  },
  mounted() {
    this.restore()
  },
  beforeUnmount() {
    this.disposePlayer()
  },
  methods: {
    readList(key) {
      try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] }
      catch (_) { return [] }
    },
    writeItem(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)) }
      catch (_) { this.error = 'Local storage is disabled; changes may not survive refresh.' }
    },
    restore() {
      this.savedIds = cleanVideoIds(this.readList(SAVED_KEY))
      this.recentPlaylists = [...new Set(this.readList(SOURCES_KEY).filter(id => typeof id === 'string' && PLAYLIST_ID_RE.test(id)))].slice(0, 20)
      this.history = this.readList(HISTORY_KEY).filter(item => item && typeof item.id === 'string' && VIDEO_ID_RE.test(item.id)).slice(0, 50)
      let session = null
      try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch (_) {}
      if (session && session.mode === 'youtubePlaylist' && PLAYLIST_ID_RE.test(session.playlistId || '')) {
        this.mode = 'youtubePlaylist'
        this.playlistId = session.playlistId
        this.currentId = VIDEO_ID_RE.test(session.currentId || '') ? session.currentId : ''
      } else if (session && session.mode === 'favorites' && this.savedIds.length) {
        this.mode = 'favorites'
        this.currentId = this.savedIds.includes(session.currentId) ? session.currentId : this.savedIds[0]
      } else if (session && VIDEO_ID_RE.test(session.currentId || '')) {
        this.currentId = session.currentId
      } else {
        try {
          const last = localStorage.getItem(LEGACY_CURRENT_KEY)
          if (VIDEO_ID_RE.test(last || '') && this.history.some(video => video.id === last)) this.currentId = last
        } catch (_) {}
      }
      if (this.hasContent) {
        this.viewerOpen = true
        this.$nextTick(() => this.renderPlayer(false))
      }
    },
    persistSession() {
      this.writeItem(SESSION_KEY, { mode: this.mode, currentId: this.currentId, playlistId: this.playlistId })
      try {
        if (this.currentId) localStorage.setItem(LEGACY_CURRENT_KEY, this.currentId)
        else localStorage.removeItem(LEGACY_CURRENT_KEY)
      } catch (_) {}
    },
    rememberVideo(id) {
      if (!VIDEO_ID_RE.test(id || '')) return
      this.history = [{ id, openedAt: Date.now() }, ...this.history.filter(item => item.id !== id)].slice(0, 50)
      this.writeItem(HISTORY_KEY, this.history)
    },
    loadReference() {
      const result = parseYouTubeReference(this.input)
      if (!result) {
        this.error = 'No valid YouTube video or playlist link found.'
        return
      }
      this.input = ''
      if (result.kind === 'youtubePlaylist') this.openYouTubePlaylist(result.playlistId, result.videoId)
      else this.openVideo(result.videoId)
    },
    openVideo(id) {
      if (!VIDEO_ID_RE.test(id || '')) return
      if (this.currentId && this.currentId !== id) this.previousIds.push(this.currentId)
      this.mode = 'video'
      this.playlistId = ''
      this.currentId = id
      this.rememberVideo(id)
      this.persistSession()
      this.error = ''
      this.showPlayer(true)
    },
    openYouTubePlaylist(id, initialVideoId = '') {
      if (!PLAYLIST_ID_RE.test(id || '')) return
      this.mode = 'youtubePlaylist'
      this.playlistId = id
      this.currentId = VIDEO_ID_RE.test(initialVideoId) ? initialVideoId : ''
      this.recentPlaylists = [id, ...this.recentPlaylists.filter(item => item !== id)].slice(0, 20)
      this.writeItem(SOURCES_KEY, this.recentPlaylists)
      this.persistSession()
      this.error = ''
      this.showPlayer(true)
    },
    playSavedQueue(id = '') {
      if (!this.savedIds.length) return
      const start = this.savedIds.includes(id) ? id : this.savedIds[0]
      this.mode = 'favorites'
      this.playlistId = ''
      this.currentId = start
      this.queueOpen = true
      this.rememberVideo(start)
      this.persistSession()
      this.error = ''
      this.showPlayer(true)
    },
    isSaved(id) {
      return Boolean(id && this.savedIds.includes(id))
    },
    toggleSaved(id) {
      if (!VIDEO_ID_RE.test(id || '')) return
      if (this.savedIds.includes(id)) this.savedIds = this.savedIds.filter(item => item !== id)
      else this.savedIds = [...this.savedIds, id]
      this.writeItem(SAVED_KEY, this.savedIds)
      // The current player keeps running without interruption; the next Play all uses the latest list.
      if (this.mode === 'favorites' && !this.savedIds.length) {
        this.mode = 'video'
        this.persistSession()
      }
    },
    buildEmbedURL(autoplay) {
      const base = 'https://www.youtube-nocookie.com/embed/'
      let src
      if (this.mode === 'youtubePlaylist') {
        src = base + 'videoseries?listType=playlist&list=' + encodeURIComponent(this.playlistId)
      } else {
        src = base + encodeURIComponent(this.currentId) + '?rel=0'
        if (this.mode === 'favorites') {
          const index = this.savedIds.indexOf(this.currentId)
          const following = this.savedIds.slice(Math.max(0, index) + 1)
          if (following.length) src += '&playlist=' + following.join(',')
        }
      }
      src += '&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(window.location.origin)
      if (autoplay) src += '&autoplay=1'
      return src
    },
    showPlayer(autoplay) {
      this.viewerOpen = true
      this.$nextTick(() => this.renderPlayer(autoplay))
    },
    toggleViewer() {
      if (this.viewerOpen) {
        this.disposePlayer()
        this.viewerOpen = false
      } else {
        this.showPlayer(false)
      }
    },
    disposePlayer() {
      this.frameGeneration += 1
      if (this.playerInstance) {
        try { this.playerInstance.destroy() } catch (_) {}
        this.playerInstance = null
      }
      if (this.$refs.frameHost) this.$refs.frameHost.replaceChildren()
    },
    renderPlayer(autoplay) {
      const host = this.$refs.frameHost
      if (!host || !this.hasContent) return
      this.disposePlayer()
      const generation = this.frameGeneration
      const frame = document.createElement('iframe')
      frame.src = this.buildEmbedURL(autoplay)
      frame.title = 'YouTube player'
      frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
      frame.setAttribute('allowfullscreen', '')
      frame.setAttribute('loading', 'eager')
      host.appendChild(frame)
      // The regular iframe plays even if the optional YouTube JS API is blocked.
      // The API is used only to keep the heart in sync as a playlist advances.
      ensureYouTubeAPI().then(YT => {
        if (generation !== this.frameGeneration || !frame.isConnected) return
        this.playerInstance = markRaw(new YT.Player(frame, {
          events: {
            onStateChange: event => {
              if (generation !== this.frameGeneration) return
              if (event.data !== 1 && event.data !== 5) return
              const id = event.target.getVideoData && event.target.getVideoData().video_id
              if (VIDEO_ID_RE.test(id || '') && id !== this.currentId) {
                this.currentId = id
                this.rememberVideo(id)
                this.persistSession()
              }
            }
          }
        }))
      }).catch(() => { /* Iframe remains available when the player API is blocked. */ })
    },
    async pasteClipboard() {
      this.error = ''
      try {
        const value = await navigator.clipboard.readText()
        this.input = value
        if (parseYouTubeReference(value)) this.loadReference()
        else this.error = 'Clipboard contains no recognized YouTube video or playlist link.'
      } catch (_) {
        this.error = 'Clipboard access blocked. Paste with Ctrl+V and select Run.'
        document.getElementById('reference-input')?.focus()
      }
    },
    async copyCurrent() {
      const url = this.mode === 'youtubePlaylist' && this.playlistId
        ? 'https://www.youtube.com/playlist?list=' + this.playlistId
        : 'https://www.youtube.com/watch?v=' + this.currentId
      try { await navigator.clipboard.writeText(url); this.error = '' }
      catch (_) { this.error = 'Copy blocked. Use your browser clipboard permissions.' }
    },
    goBack() {
      const id = this.previousIds.pop()
      if (id) this.openVideo(id)
    },
    removeHistory(id) {
      this.history = this.history.filter(item => item.id !== id)
      this.previousIds = this.previousIds.filter(value => value !== id)
      this.writeItem(HISTORY_KEY, this.history)
      if (this.mode === 'video' && this.currentId === id) {
        this.disposePlayer()
        this.mode = 'video'
        this.currentId = ''
        this.viewerOpen = false
        this.persistSession()
      }
    },
    clearHistory() {
      if (!window.confirm('Delete all recent videos from this browser? Your saved playlist will be kept.')) return
      this.history = []
      this.previousIds = []
      this.writeItem(HISTORY_KEY, [])
      if (this.mode === 'video') {
        this.disposePlayer()
        this.currentId = ''
        this.viewerOpen = false
        this.persistSession()
      }
    },
    removeSource(id) {
      this.recentPlaylists = this.recentPlaylists.filter(item => item !== id)
      this.writeItem(SOURCES_KEY, this.recentPlaylists)
      if (this.mode === 'youtubePlaylist' && this.playlistId === id) {
        this.disposePlayer()
        this.currentId = ''
        this.playlistId = ''
        this.mode = 'video'
        this.viewerOpen = false
        this.persistSession()
      }
    },
    formatDate(value) {
      return new Date(value || Date.now()).toLocaleDateString(undefined, {month:'short', day:'numeric'})
    }
  }
}
</script>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #0d1117; }
:global(button), :global(input) { font: inherit; }
.shell { min-height: 100vh; padding: clamp(16px, 5vh, 54px) 16px; display: flex; justify-content: center; color: #c9d1d9; background: #0d1117; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.workspace { width: min(100%, 860px); align-self: flex-start; border: 1px solid #30363d; border-radius: 9px; overflow: hidden; background: #0d1117; box-shadow: 0 12px 40px #0002; }
.topbar, .identity, .tabs, .output-heading, .output-actions, .statusline, .status-actions, .panel-heading, .queue-list li, .history-list li, .footer { display: flex; align-items: center; }
.topbar { padding: 12px 17px; background: #161b22; border-bottom: 1px solid #30363d; justify-content: space-between; }
.identity { gap: 9px; font-size: 13px; }
.identity strong { font-weight: 650; }
.dim { color: #7d8590; font-weight: 400; }
.app-mark { background: #252e39; border: 1px solid #303b48; border-radius: 5px; padding: 6px 8px; color: #8b949e; }
.icon-button, .text-button, .clear-input, .delete-button { color: #8b949e; border: 0; background: none; cursor: pointer; }
.icon-button { padding: 6px; border-radius: 5px; }
.icon-button svg { display: block; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icon-button:hover, .text-button:hover, .delete-button:hover { color: #e6edf3; }
.tabs { min-height: 39px; border-bottom: 1px solid #30363d; font-size: 11px; }
.tab { min-height: 39px; padding: 12px 15px; border: 0; border-right: 1px solid #30363d; background: none; color: #8b949e; white-space: nowrap; }
.tab.current { color: #c9d1d9; border-bottom: 2px solid #8b949e; }
.tab-button { cursor: pointer; }
.tab-button.selected { color: #c9d1d9; background: #161b22; }
.tab-button:hover { color: #e6edf3; }
.tab.muted { border-right: 0; color: #6e7681; }
.file-dot { display: inline-block; background: #6ea8aa; width: 7px; height: 7px; border-radius: 2px; margin-right: 6px; }
.count { margin-left: 4px; padding: 2px 5px; border-radius: 4px; background: #21262d; }
.tab-spacer { flex: 1; }
.tab-meta { padding: 0 16px; font-size: 10px; color: #6e7681; }
.input-area { padding: 22px 24px 18px; }
.input-area label { display: block; font-size: 12px; color: #79c0ff; }
.line-number { display: inline-block; width: 30px; color: #484f58; }
.input-row { display: flex; align-items: center; margin: 12px 0 0 30px; background: #0d1117; border: 1px solid #30363d; border-radius: 5px; }
.input-row:focus-within { border-color: #587fa3; }
.input-row input { width: 100%; min-width: 0; border: none; outline: none; background: none; color: #e6edf3; padding: 11px 12px; font-size: 12px; }
.input-row input::placeholder { color: #6e7681; }
.clear-input { padding: 7px 12px; font-size: 20px; }
.hint { color: #7d8590; font-size: 11px; line-height: 1.5; }
.input-area .hint { margin: 10px 0 0 30px; }
.comment { color: #7ee787; padding-right: 5px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 17px; }
.actions button, .compact { min-height: 34px; border-radius: 5px; padding: 0 14px; cursor: pointer; font-size: 12px; font-weight: 500; }
.secondary { color: #c9d1d9; background: #21262d; border: 1px solid #30363d; }
.primary { color: #b4d8c2; background: #263b34; border: 1px solid #3c6150; }
button:disabled { opacity: .42; cursor: not-allowed; }
button:not(:disabled):hover { filter: brightness(1.18); }
button:focus-visible { outline: 2px solid #8bb0d1; outline-offset: 2px; }
.error { margin: 0 24px 15px; padding: 10px 12px; font-size: 11px; background: #382525; color: #ffc8bf; border: 1px solid #694340; border-radius: 5px; }
.output-heading { padding: 10px 24px; justify-content: space-between; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d; background: #161b22; gap: 12px; }
.output-label { font-size: 11px; color: #8b949e; white-space: nowrap; }
.output-label strong { font-weight: 500; letter-spacing: .05em; }
.state-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #4e9b72; margin-right: 8px; vertical-align: middle; }
.state { color: #6e7681; margin-left: 8px; }
.output-actions { justify-content: flex-end; gap: 15px; }
.text-button { font-size: 11px; white-space: nowrap; padding: 4px 0; }
.heart-button { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid #30363d; border-radius: 5px; color: #8b949e; padding: 5px 8px; cursor: pointer; font-size: 11px; }
.heart-button svg, .remove-saved svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 1.6; fill: none; }
.heart-button.active { color: #f48a9c; border-color: #754452; }
.heart-button.active svg, .remove-saved svg { fill: currentColor; }
.viewer { aspect-ratio: 16 / 9; background: #070b11; min-height: 200px; }
.frame-host, .frame-host :deep(iframe) { width: 100%; height: 100%; display: block; border: 0; }
.output-placeholder { padding: 30px 26px; min-height: 84px; color: #6e7681; font-size: 12px; }
.prompt { color: #7ee787; padding-right: 8px; }
.source-line { display: flex; gap: 12px; padding: 11px 24px; align-items: center; border-top: 1px solid #21262d; font-size: 11px; color: #7d8590; }
.source-line code { color: #b6bec8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.source-line .text-button { margin-left: auto; }
.statusline { padding: 13px 24px; flex-wrap: wrap; justify-content: space-between; border-top: 1px solid #30363d; font-size: 11px; color: #6e7681; gap: 10px; }
.status-actions { gap: 17px; flex-wrap: wrap; }
.panel { border-top: 1px solid #30363d; padding: 17px 24px 18px; }
.panel-heading { justify-content: space-between; gap: 15px; font-size: 13px; }
.panel-heading strong { font-weight: 600; }
.subheading { margin: 7px 0 0; font-size: 11px; color: #7d8590; line-height: 1.5; }
.empty-note { color: #7d8590; font-size: 12px; margin: 20px 0 4px; }
.queue-list, .history-list { padding: 0; margin: 14px 0 0; list-style: none; }
.queue-list li, .history-list li { border-bottom: 1px solid #21262d; min-width: 0; }
.queue-entry { display: flex; flex: 1; min-width: 0; gap: 12px; align-items: center; padding: 10px 0; background: none; border: 0; color: #c9d1d9; cursor: pointer; text-align: left; }
.queue-number { font-size: 11px; color: #6e7681; width: 20px; }
.queue-thumbnail { width: 56px; height: 42px; object-fit: cover; border-radius: 3px; background: #161b22; }
.queue-title { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 4px; font-size: 12px; }
.queue-title small { color: #7d8590; font-size: 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.playing-label { font-size: 9px; color: #7ee787; }
.remove-saved { display: grid; place-items: center; padding: 9px; color: #f48a9c; background: none; border: 0; border-radius: 5px; cursor: pointer; }
.queue-hint { margin: 12px 0 0; }
.history-entry { display: flex; flex: 1; min-width: 0; align-items: center; gap: 12px; padding: 11px 0; text-align: left; background: none; border: 0; color: #c9d1d9; cursor: pointer; font-size: 11px; }
.history-entry span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-entry small { color: #7d8590; margin-left: auto; white-space: nowrap; }
.delete-button { font-size: 11px; padding: 8px; }
.delete-button:hover { color: #ffa198; }
.source-section { margin-top: 23px; border-top: 1px solid #30363d; padding-top: 10px; }
.source-section h3 { font-size: 12px; color: #8b949e; font-weight: 600; }
.footer { padding: 13px 24px; color: #6e7681; font-size: 10px; background: #161b22; border-top: 1px solid #30363d; }
.divider { padding: 0 7px; }
@media (max-width: 550px) {
  .workspace { border-radius: 6px; }
  .input-area, .panel { padding: 18px 14px; }
  .input-row, .input-area .hint { margin-left: 0; }
  .output-heading, .statusline, .footer, .source-line { padding-left: 14px; padding-right: 14px; }
  .tab.muted { display: none; }
  .output-actions { gap: 8px; }
  .state { display: none; }
  .source-line { flex-wrap: wrap; }
}
</style>