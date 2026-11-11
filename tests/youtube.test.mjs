import test from 'node:test'
import assert from 'node:assert/strict'
import { parseYouTubeReference, cleanVideoIds } from '../src/utils/youtube.mjs'

const VIDEO = 'dQw4w9WgXcQ'
const LIST = 'PL12345678901234567890'

test('accepts a bare video ID', () => {
  assert.deepEqual(parseYouTubeReference(VIDEO), { kind: 'video', videoId: VIDEO })
})

test('parses normal watch URLs and ignores extra parameters', () => {
  assert.deepEqual(parseYouTubeReference('https://www.youtube.com/watch?v=' + VIDEO + '&t=23s&feature=share'), { kind: 'video', videoId: VIDEO })
})

test('parses shortened links, Shorts, live videos and embeds', () => {
  for (const url of [
    'https://youtu.be/' + VIDEO + '?si=extra',
    'https://youtube.com/shorts/' + VIDEO + '?feature=share',
    'https://youtube.com/live/' + VIDEO + '?si=extra',
    'https://www.youtube-nocookie.com/embed/' + VIDEO,
    'https://music.youtube.com/watch?v=' + VIDEO + '&feature=share',
  ]) assert.deepEqual(parseYouTubeReference(url), { kind: 'video', videoId: VIDEO })
})

test('parses playlist-only and watch URLs containing playlist IDs', () => {
  for (const url of [
    'https://www.youtube.com/playlist?list=' + LIST,
    'https://music.youtube.com/playlist?list=' + LIST,
    'https://www.youtube.com/watch?v=' + VIDEO + '&list=' + LIST,
    'https://youtu.be/' + VIDEO + '?list=' + LIST,
    'https://www.youtube.com/embed/videoseries?list=' + LIST,
  ]) {
    const parsed = parseYouTubeReference(url)
    assert.equal(parsed?.kind, 'youtubePlaylist')
    assert.equal(parsed?.playlistId, LIST)
  }
})

test('parses a link embedded in text with punctuation', () => {
  const reference = 'Open this: (https://youtube.com/shorts/' + VIDEO + '?feature=share).'
  assert.deepEqual(parseYouTubeReference(reference), { kind: 'video', videoId: VIDEO })
})

test('rejects unrelated URLs, invalid video IDs, and invalid playlists', () => {
  assert.equal(parseYouTubeReference('https://example.com/watch?v=' + VIDEO), null)
  assert.equal(parseYouTubeReference('not a url'), null)
  assert.equal(parseYouTubeReference('https://www.youtube.com/playlist?list=bad'), null)
  assert.equal(parseYouTubeReference('https://www.youtube.com/watch?v=invalid'), null)
})

test('deduplicates and validates saved video queue', () => {
  assert.deepEqual(cleanVideoIds([VIDEO, VIDEO, 'invalid', 'a1b2c3d4e5F']), [VIDEO, 'a1b2c3d4e5F'])
})
