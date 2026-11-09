<template>
  <main class="shell">
    <section class="console" aria-label="Developer workspace">
      <header class="topbar">
        <div class="identity">
          <span class="terminal-icon" aria-hidden="true">{ }</span>
          <div><strong>DevTools</strong><small> / workspace</small></div>
        </div>
        <button class="icon-button" type="button" :aria-expanded="historyOpen" aria-controls="watch-history" aria-label="Toggle recent activity" title="Recent activity" @click="historyOpen = !historyOpen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2"/></svg>
        </button>
      </header>
      <nav class="tabs" aria-label="Workspace tabs"><span class="active-tab"><span class="tab-dot"></span> input.json</span><span class="inactive-tab">output.log</span><span class="tab-spacer"></span><span class="tab-meta">LOCAL</span></nav>

      <form @submit.prevent="loadURL" class="input-area">
        <label for="video-input"><span class="line-number">01</span> reference <span class="label-muted">: string</span></label>
        <div class="input-row">
          <input id="video-input" v-model="youtubeURL" type="text" spellcheck="false" autocomplete="off" placeholder="Enter reference…" aria-describedby="input-help" />
          <button v-if="youtubeURL" type="button" class="clear-input" aria-label="Clear input" @click="youtubeURL = ''">×</button>
        </div>
        <p id="input-help" class="hint"><span class="comment-prefix">//</span> Supports multiple URL formats and reference IDs</p>
        <div class="actions">
          <button type="button" class="secondary" @click="pasteClipboard"><span aria-hidden="true">⌘</span> Paste input</button>
          <button type="submit" class="primary"><span aria-hidden="true">↵</span> Run</button>
        </div>
      </form>

      <p v-if="error" role="alert" class="error">{{ error }}</p>

      <div class="result-toolbar">
        <span><span class="status-dot"></span> <span class="result-title">OUTPUT</span> <span class="muted-tag">{{ currentId ? 'ready' : 'idle' }}</span></span>
        <button v-if="currentId" type="button" class="text-button" :aria-expanded="viewerOpen" @click="viewerOpen = !viewerOpen">{{ viewerOpen ? 'Collapse output' : 'Expand output' }}</button>
      </div>
      <section v-if="currentId && viewerOpen" class="viewer" aria-label="Video player">
        <iframe v-if="currentId" :key="currentId" :src="embedURL" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </section>
      <div v-else class="output-placeholder"><span class="prompt-symbol">&gt;</span> {{ currentId ? 'Output collapsed — select Expand output to view' : 'Ready for input. Run a reference to see output.' }}</div>

      <div class="statusline">
        <span>SESSION / 01</span>
        <div class="status-actions">
          <button v-if="previousIds.length" type="button" class="text-button" @click="goBack">↶ Previous</button>
          <button v-if="currentId" type="button" class="text-button" @click="copyCurrent">Copy link</button>
          <button type="button" class="text-button" :aria-expanded="historyOpen" aria-controls="watch-history" @click="historyOpen = !historyOpen">
            Logs ({{ history.length }}) <span aria-hidden="true">{{ historyOpen ? '⌃' : '⌄' }}</span>
          </button>
        </div>
      </div>

      <section v-if="historyOpen" id="watch-history" class="history" aria-label="Recent activity">
        <div class="history-heading"><strong>Session logs</strong><button v-if="history.length" type="button" class="text-button" @click="clearHistory">Clear history</button></div>
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
      <footer class="footer"><span class="status-dot"></span> local workspace <span class="footer-divider">·</span> state saved in browser</footer>
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
      viewerOpen: false,
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
      this.viewerOpen = true
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
        this.viewerOpen = true
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
/* Developer-tool presentation: the interface resembles a quiet editor rather than a media homepage. */
:global(body) { background: #0d1117; }
.shell { background: #0d1117; color: #c9d1d9; padding-top: clamp(22px, 5vh, 52px); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.console { width: min(100%, 850px); background: #0d1117; border: 1px solid #30363d; border-radius: 9px; padding: 0; box-shadow: 0 8px 30px #0002; }
.topbar { padding: 13px 17px; margin: 0; background: #161b22; border-bottom: 1px solid #30363d; }
.identity { font-size: 13px; gap: 10px; letter-spacing: -.015em; }
.identity small { font-size: 12px; color: #7d8590; }
.terminal-icon { background: #252e39; border: 1px solid #303b48; border-radius: 5px; height: 27px; width: 33px; color: #8b949e; font-size: 12px; }
.icon-button { padding: 4px; }
.icon-button svg { width: 17px; height: 17px; }
.tabs { display: flex; align-items: center; gap: 0; min-height: 39px; border-bottom: 1px solid #30363d; background: #0d1117; font-size: 11px; }
.active-tab, .inactive-tab { padding: 12px 16px; white-space: nowrap; }
.active-tab { border-right: 1px solid #30363d; border-bottom: 2px solid #8b949e; color: #c9d1d9; }
.inactive-tab { color: #6e7681; }
.tab-dot { display: inline-block; width: 7px; height: 7px; background: #6ea8aa; border-radius: 2px; margin-right: 6px; }
.tab-spacer { flex: 1; }
.tab-meta { padding: 0 16px; color: #6e7681; letter-spacing: .1em; }
.input-area { padding: 22px 24px 16px; }
.input-area label { font-size: 12px; color: #79c0ff; letter-spacing: 0; font-weight: 400; }
.line-number { display: inline-block; width: 30px; color: #484f58; user-select: none; }
.label-muted { color: #8b949e; }
.input-row { margin: 12px 0 0 30px; background: #0d1117; border: 1px solid #30363d; border-radius: 5px; }
.input-row:focus-within { border-color: #587fa3; outline: none; }
.input-row input { padding: 11px 13px; font-family: inherit; font-size: 12px; }
.input-row input::placeholder { color: #6e7681; }
.hint { margin-left: 30px; color: #6e7681; }
.comment-prefix { color: #7ee787; margin-right: 5px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin: 18px 0 0; }
.actions button { border-radius: 5px; min-height: 34px; padding: 0 15px; font-family: inherit; font-size: 12px; font-weight: 500; }
.secondary { background: #21262d; border: 1px solid #30363d !important; color: #c9d1d9; }
.primary { background: #263b34; border: 1px solid #3c6150 !important; color: #b4d8c2; }
.actions button:hover { filter: brightness(1.18); }
.result-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 11px 24px; background: #161b22; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d; font-size: 11px; }
.result-title { color: #8b949e; letter-spacing: .06em; }
.status-dot { display: inline-block; background: #4e9b72; height: 6px; width: 6px; border-radius: 50%; margin-right: 7px; vertical-align: middle; }
.muted-tag { color: #6e7681; margin-left: 8px; }
.viewer { border-radius: 0; aspect-ratio: 16/9; }
.output-placeholder { padding: 30px 26px; min-height: 85px; font-size: 12px; color: #6e7681; background: #0d1117; }
.prompt-symbol { color: #7ee787; margin-right: 8px; }
.statusline { margin: 0; padding: 13px 24px; border-top: 1px solid #30363d; color: #6e7681; }
.text-button { font-family: inherit; font-size: 11px; }
.history { margin: 0; padding: 18px 24px 6px; border-top: 1px solid #30363d; }
.history-heading { color: #c9d1d9; }
.history li { border-color: #21262d; }
.history-symbol { background: #161b22; border-radius: 4px; color: #8b949e; }
.footer { margin: 0; padding: 12px 24px; border-top: 1px solid #30363d; background: #161b22; text-align: left; color: #6e7681; font-size: 10px; }
.footer-divider { padding: 0 7px; }
@media (max-width: 520px) { .console { border-radius: 7px; } .input-area { padding: 20px 14px; } .input-row { margin-left: 0; } .hint { margin-left: 0; } .result-toolbar, .statusline, .history, .footer { padding-left: 14px; padding-right: 14px; } .inactive-tab { display: none; } }

</style>