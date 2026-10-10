// Read text aloud with the browser's built-in speech (free, no API key, works offline on Windows/Android).
// Long text is split into short sentences because Chrome/Edge stop long utterances after ~15 seconds.

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function loadVoices() {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices()
    if (v.length) return resolve(v)
    const done = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

export async function pickVoice(lang) {
  const voices = await loadVoices()
  if (lang === 'hi') return voices.find((v) => v.lang?.toLowerCase().startsWith('hi')) || null
  return (
    voices.find((v) => v.lang === 'en-IN') ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
    null
  )
}

function chunks(text) {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// Speaks text; returns { hasVoice }. Calls onEnd when finished or stopped.
export async function speak(text, lang, { onEnd } = {}) {
  if (!canSpeak()) return { hasVoice: false }
  const synth = window.speechSynthesis
  synth.cancel()
  const voice = await pickVoice(lang)
  const parts = chunks(text)
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p)
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    if (voice) u.voice = voice
    u.rate = lang === 'hi' ? 0.95 : 0.98
    if (i === parts.length - 1) {
      u.onend = () => onEnd?.()
      u.onerror = () => onEnd?.()
    }
    synth.speak(u)
  })
  return { hasVoice: !!voice }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
