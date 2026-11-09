<template>
  <main class="shell">
    <section class="console" aria-label="Personal media utility">
      <header class="topbar">
        <div class="identity">
          <span class="terminal-icon" aria-hidden="true">&gt;_</span>
          <div><strong>Console</strong><small> / utility</small></div>
        </div>
        <button class="icon-button" type="button" :aria-expanded="historyOpen" aria-controls="watch-history" aria-label="Toggle recent activity" title="Recent activity" @click="historyOpen = !historyOpen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2"/></svg>
        </button>
      </header>

      <form @submit.prevent="loadURL" class="input-area">
        <label for="video-input">INPUT / REFERENCE</label>
        <div class="input-row">
          <input id="video-input" v-model="youtubeURL" type="text" spellcheck="false" autocomplete="off" placeholder="Paste URL or video reference..." aria-describedby="input-help" />
          <button v-if="youtubeURL" type="button" class="clear-input" aria-label="Clear input" @click="youtubeURL = ''">×</button>
        </div>
        <p id="input-help" class="hint">YouTube links, Shorts, live links, and 11-character video IDs</p>
        <div class="actions">
          <button type="button" class="secondary" @click="pasteClipboard"><span aria-hidden="true">▣</span> Paste</button>
          <button type="submit" class="primary"><span aria-hidden="true">▶</span> Go</button>
        </div>
      </form>

      <p v-if="error" role="alert" class="error">{{ error }}</p>

      <section class="viewer" aria-label="Video player">
        <iframe v-if="currentId" :key="currentId" :src="embedURL" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        <div v-else class="empty"><span class="play-ring" aria-hidden="true">▶</span><span>Viewer ready</span></div>
      </section>

      <div class="statusline">
        <span>LOCAL SESSION</span>
        <div class="status-actions">
          <button v-if="previousIds.length" type="button" class="text-button" @click="goBack">↶ Previous</button>
          <button v-if="currentId" type="button" class="text-button" @click="copyCurrent">Copy link</button>
          <button type="button" class="text-button" :aria-expanded="historyOpen" aria-controls="watch-history" @click="historyOpen = !historyOpen">
            Recent activity ({{ history.length }}) <span aria-hidden="true">{{ historyOpen ? '⌃' : '⌄' }}</span>
          </button>
        </div>
      </div>

      <section v-if="historyOpen" id="watch-history" class="history" aria-label="Recent activity">
        <div class="history-heading"><strong>Recent activity</strong><button v-if="history.length" type="button" class="text-button" @click="clearHistory">Clear history</button></div>
        <p v-if="!history.length" class="hint">No saved videos yet. History stays in this browser.</p>
        <ul v-else>
          <li v-for="video in history" :key="video.id">
            <button type="button" class="history-item" @click="openVideo(video.id)">
              <span class="history-symbol" aria-hidden="true">▶</span>
              <span class="history-info"><strong>{{ video.title || video.id }}</strong><small>{{ formatDate(video.openedAt) }} · {{ video.id }}</small></span>
            </button>
            <button type="button" class="remove-button" :aria-label="'Remove '+video.id+' from history'" title="Remove" @click="removeHistory(video.id)">×</button>
          </li>
        </ul>
      </section>
      <footer class="footer">Stored on this device · No account needed</footer>
    </section>
  </main>
</template>

<script>
const STORAGE_KEY = 'canwatch-history-v1'
const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

function extractVideoId(text) {
  const input = String(text || '').trim()
  if (ID_PATTERN.test(input)) return input
  // Accept links pasted inside surrounding text and ignore trailing punctuation.
  const matches = input.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s<>"']+/gi) || []
  for (const match of matches) {
    try {
      const url = new URL(match.replace(/[),.;!?]+$/, '').replace(/^https?:\/\//i, '') .replace(/^/, 'https://'))
      const host = url.hostname.toLowerCase()
      const path = url.pathname.split('/').filter(Boolean)
      let id = null
      if (host === 'youtu.be' || host === 'www.youtu.be') id = path[0]
      else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        if (path[0] === 'watch') id = url.searchParams.get('v')
        else if (['shorts', 'live', 'embed', 'v'].includes(path[0])) id = path[1]
      }
      if (id && ID_PATTERN.test(id)) return id
    } catch (_) { /* Try the next link */ }
  }
  return null
}

export default {
  name: 'HelloWorld',
  data() {
    return {
      youtubeURL: '',
      currentId: '',
      previousIds: [],
      history: [],
      historyOpen: false,
      error: '',
    }
  },
  computed: {
    embedURL() {
      return this.currentId ? 'https://www.youtube-nocookie.com/embed/' + this.currentId + '?rel=0' : ''
    }
  },
  mounted() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      this.history = Array.isArray(stored)
        ? stored.filter(item => item && ID_PATTERN.test(item.id)).slice(0, 50).map(item => ({
            id: item.id, title: typeof item.title === 'string' ? item.title.slice(0, 120) : '',
            openedAt: Number(item.openedAt) || Date.now()
          }))
        : []
    } catch (_) { this.history = [] }
  },
  methods: {
    loadURL() {
      const id = extractVideoId(this.youtubeURL)
      if (!id) {
        this.error = 'No valid YouTube video ID found. Paste a video, Shorts or youtu.be link.'
        return
      }
      this.openVideo(id)
      this.youtubeURL = ''
    },
    openVideo(id) {
      if (!ID_PATTERN.test(id)) return
      if (this.currentId && this.currentId !== id) this.previousIds.push(this.currentId)
      this.currentId = id
      this.error = ''
      this.history = [{ id, openedAt: Date.now(), title: '' }, ...this.history.filter(item => item.id !== id)].slice(0, 50)
      this.saveHistory()
    },
    async pasteClipboard() {
      this.error = ''
      try {
        if (!navigator.clipboard?.readText) throw new Error('Clipboard API unavailable')
        const value = await navigator.clipboard.readText()
        this.youtubeURL = value
        const id = extractVideoId(value)
        if (id) this.loadURL()
        else this.error = 'Clipboard has no recognized YouTube link. You can paste one manually.'
      } catch (_) {
        this.error = 'Clipboard access was blocked. Use Ctrl+V in the input, then Go. Clipboard reading requires HTTPS or localhost and browser permission.'
        document.getElementById('video-input')?.focus()
      }
    },
    async copyCurrent() {
      try {
        await navigator.clipboard.writeText('https://www.youtube.com/watch?v=' + this.currentId)
        this.error = ''
      } catch (_) { this.error = 'Copy was blocked by your browser.' }
    },
    goBack() {
      const id = this.previousIds.pop()
      if (id) {
        this.currentId = id
        this.error = ''
      }
    },
    removeHistory(id) {
      this.history = this.history.filter(item => item.id !== id)
      this.saveHistory()
    },
    clearHistory() {
      if (window.confirm('Clear all saved video history on this device?')) {
        this.history = []
        this.saveHistory()
      }
    },
    saveHistory() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history)) }
      catch (_) { this.error = 'Browser storage is unavailable; history may not be saved.' }
    },
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  }
}
</script>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #0b1118; }
:global(button), :global(input) { font: inherit; }
.shell { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: clamp(16px, 6vh, 65px) 16px; background: #0b1118; color: #e9f0f6; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.console { width: min(100%, 760px); padding: clamp(18px, 4vw, 34px); background: #141e28; border: 1px solid #253342; border-radius: 20px; box-shadow: 0 22px 60px #0005; }
.topbar, .identity, .statusline, .status-actions, .history-heading, .history li { display: flex; align-items: center; }
.topbar, .statusline, .history-heading { justify-content: space-between; }
.topbar { margin-bottom: 32px; }
.identity { gap: 12px; font-size: 17px; }
.identity small { color: #8399ac; font-weight: 400; font-size: 13px; }
.terminal-icon { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 9px; background: #263848; color: #adc2d2; font-family: monospace; font-weight: 700; }
.icon-button, .clear-input, .text-button, .remove-button { background: none; border: 0; color: #9fb2c3; cursor: pointer; }
.icon-button { padding: 8px; border-radius: 9px; }
.icon-button svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icon-button:hover, .text-button:hover, .remove-button:hover { color: #fff; }
.input-area label { font-size: 11px; letter-spacing: .1em; color: #8ea5b8; font-weight: 650; }
.input-row { display: flex; align-items: center; margin-top: 9px; background: #1e2b37; border: 1px solid #344658; border-radius: 10px; }
.input-row:focus-within { border-color: #b6d2e5; outline: 2px solid #b6d2e52b; }
.input-row input { width: 100%; min-width: 0; padding: 16px; background: transparent; border: 0; outline: none; color: #fff; font-size: 14px; }
.input-row input::placeholder { color: #91a5b5; }
.clear-input { padding: 10px 16px; font-size: 22px; }
.hint { font-size: 12px; color: #849aad; margin: 9px 0 0; line-height: 1.6; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 19px 0 22px; }
.actions button { border: 0; border-radius: 10px; min-height: 46px; cursor: pointer; font-size: 14px; font-weight: 650; }
.actions button span { margin-right: 8px; }
.secondary { background: #2a3c4b; color: #e8eff5; }
.primary { background: #d2e4f0; color: #15232e; }
.actions button:hover { filter: brightness(1.12); }
.error { margin: 0 0 13px; padding: 11px 13px; border: 1px solid #91645b; border-radius: 8px; background: #3a2827; color: #ffd6ce; font-size: 12px; }
.viewer { aspect-ratio: 16/9; width: 100%; overflow: hidden; background: #080e14; border-radius: 12px; }
.viewer iframe { width: 100%; height: 100%; display: block; border: 0; }
.empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; color: #8aa0b3; font-size: 13px; }
.play-ring { border: 2px solid #688095; width: 51px; height: 51px; border-radius: 50%; display: grid; place-items: center; padding-left: 3px; font-size: 18px; }
.statusline { flex-wrap: wrap; gap: 12px; margin-top: 19px; font-size: 11px; color: #8b9eae; letter-spacing: .035em; }
.status-actions { gap: 14px; flex-wrap: wrap; }
.text-button { padding: 4px 0; font-size: 12px; letter-spacing: normal; }
.history { border-top: 1px solid #2c3b49; margin-top: 18px; padding-top: 20px; }
.history-heading { font-size: 14px; margin-bottom: 10px; }
.history ul { list-style: none; margin: 0; padding: 0; }
.history li { border-bottom: 1px solid #273643; gap: 9px; }
.history-item { display: flex; align-items: center; text-align: left; gap: 12px; flex: 1; min-width: 0; padding: 12px 0; background: none; border: none; color: #e5edf5; cursor: pointer; }
.history-symbol { background: #263a49; color: #b6d1e5; border-radius: 8px; width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; font-size: 12px; }
.history-info { display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.history-info strong { font-size: 13px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-info small { color: #829bad; font-size: 11px; }
.remove-button { font-size: 21px; padding: 9px; }
.footer { font-size: 11px; color: #748a9c; margin-top: 24px; text-align: center; }
button:focus-visible { outline: 2px solid #d2e4f0; outline-offset: 3px; }
@media (max-width: 520px) { .console { border-radius: 14px; } .statusline { align-items: flex-start; } .status-actions { gap: 12px; } .topbar { margin-bottom: 24px; } }
</style>