/* ============================================================
   Trainer (index) page logic
   ============================================================ */

const $ = (id) => document.getElementById(id)

const sentenceEl = $("sentence")
const userInput = $("user-input")
const inputOverlay = $("input-overlay")
const skipBtn = $("skip-btn")
const hintBtn = $("hint-btn")
const sentenceCount = $("sentence-count")
const voiceSelect = $("voice-select")
const speedControl = $("speed")
const pitchControl = $("pitch")
const volumeControl = $("volume")
const popup = $("popup")
const popupText = $("popup-text")
const exampleText = $("example-text")
const closePopup = $("close-popup")
const saveSentence = $("repeat-sentence")
const trainerRepeatBtn = $("trainer-repeat-btn")
const settingsBtn = $("settings-btn")
const settings = $("settings")
const trainerVoiceBtn = $("trainerVoiceBtn")
const voiceInputBtn = $("voice-input-btn")

const readJSON = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const sentences = readJSON("sentences")
let usedIndexes = readJSON("usedIndexes")
let currentSentenceIndex = null
let hintMode = false
let ignorePunctuation = localStorage.getItem("ignorePunctuation") === "true"

/* Speech recognition state */
let recognition = null
let isRecording = false
let voiceInputActive = false
let permissionGranted = false
let isListening = false
let voiceEngineActive = false

/* ============================================================
   Speech recognition
   ============================================================ */

function initSpeechRecognition() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.warn("Speech recognition not supported in this browser")
    if (voiceInputBtn) voiceInputBtn.style.display = "none"
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = "en-US"

  recognition.onstart = () => {
    isRecording = true
    voiceInputActive = true
    permissionGranted = true
    isListening = true
    if (voiceInputBtn) {
      voiceInputBtn.classList.add("recording")
      voiceInputBtn.title = "Зупинити запис"
    }
  }

  recognition.onresult = (event) => {
    if (voiceEngineActive) return

    userInput.value = ""
    inputOverlay.innerHTML = ""
    let interimTranscript = ""
    let finalTranscript = ""
    hintMode = true

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim()
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    if (finalTranscript) {
      const normalized = finalTranscript.toLowerCase().trim()

      if (normalized.includes("next point")) {
        skipSentence()
        return
      }
      if (normalized.includes("come up")) {
        showHint()
        return
      }
      if (normalized.includes("hide it")) {
        if (popup.style.display === "flex") {
          hidePopup()
          return
        }
      }
      if (normalized.includes("save it")) {
        saveSentenceToLocalStorageNoAdvance()
        return
      }
      if (normalized.includes("say it")) {
        speakCurrentSentence()
        return
      }

      showRecognizedTextIndicator()
      userInput.value = finalTranscript
      checkAnswer()
    } else if (interimTranscript) {
      userInput.value = interimTranscript.trim()
    }
  }

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error)

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      permissionGranted = false
      isRecording = false
      voiceInputActive = false
      if (voiceInputBtn) {
        voiceInputBtn.classList.remove("recording")
        voiceInputBtn.title = "Голосовий ввід"
      }
      showInformationModal(
        "Доступ до мікрофона заборонено. Дозвольте доступ у налаштуваннях браузера та оновіть сторінку."
      )
    } else if (event.error === "no-speech") {
      restartRecognition()
    }
  }

  recognition.onend = () => {
    if (permissionGranted && isRecording) {
      restartRecognition()
    } else {
      isListening = false
      stopVoiceRecording()
    }
  }
}

function restartRecognition() {
  setTimeout(() => {
    if (recognition && permissionGranted && isRecording) {
      try {
        recognition.start()
      } catch (e) {
        console.log("Recognition restart failed:", e)
      }
    }
  }, 100)
}

function startVoiceRecording() {
  if (!recognition) return
  try {
    recognition.start()
  } catch (error) {
    console.error("Error starting speech recognition:", error)
    if (error.name !== "InvalidStateError") {
      permissionGranted = false
    }
  }
}

function stopVoiceRecording() {
  if (!recognition) return
  isRecording = false
  voiceInputActive = false
  permissionGranted = false
  if (voiceInputBtn) {
    voiceInputBtn.classList.remove("recording")
    voiceInputBtn.title = "Голосовий ввід"
  }
  try {
    recognition.stop()
  } catch (error) {
    console.error("Error stopping speech recognition:", error)
  }
}

function toggleVoiceRecording() {
  if (isRecording) {
    isRecording = false
    voiceInputActive = false
    if (voiceInputBtn) {
      voiceInputBtn.classList.remove("recording")
      voiceInputBtn.title = "Голосовий ввід"
    }
    try {
      recognition.stop()
    } catch (error) {
      console.error("Error stopping speech recognition:", error)
    }
    return
  }

  userInput.value = ""
  inputOverlay.innerHTML = ""

  if (!recognition) initSpeechRecognition()

  const tryStart = () => {
    isRecording = true
    voiceInputActive = true
    startVoiceRecording()
  }

  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions
      .query({ name: "microphone" })
      .then((status) => {
        if (status.state === "granted" || status.state === "prompt") {
          tryStart()
        } else {
          showInformationModal(
            "Доступ до мікрофона заборонено. Дозвольте доступ у налаштуваннях браузера."
          )
        }
      })
      .catch(tryStart)
  } else {
    tryStart()
  }
}

/* ============================================================
   Ignore punctuation toggle
   ============================================================ */

function createIgnorePunctuationIcon() {
  const icon = document.createElement("div")
  icon.id = "ignore-punctuation-icon"
  updatePunctuationIcon(icon)
  icon.addEventListener("click", toggleIgnorePunctuation)
  return icon
}

function updatePunctuationIcon(icon) {
  if (!icon) return
  icon.className = ignorePunctuation ? "active" : ""
  icon.textContent = ".!?"
  icon.title = ignorePunctuation
    ? "Ігнорування знаків пунктуації увімкнено"
    : "Ігнорування знаків пунктуації вимкнено"
}

function toggleIgnorePunctuation() {
  ignorePunctuation = !ignorePunctuation
  localStorage.setItem("ignorePunctuation", JSON.stringify(ignorePunctuation))
  updatePunctuationIcon($("ignore-punctuation-icon"))
}

/* ============================================================
   Answer checking & highlighting
   ============================================================ */

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function highlightErrors() {
  if (currentSentenceIndex === null) return

  const correct = sentences[currentSentenceIndex].en
  const user = userInput.value
  let html = ""

  for (let i = 0; i < user.length; i++) {
    if (user[i] !== correct[i]) {
      html += `<span class="error-char">${escapeHtml(user[i])}</span>`
    } else {
      html += escapeHtml(user[i])
    }
  }
  inputOverlay.innerHTML = html
}

function checkAnswer() {
  hintMode = false
  if (currentSentenceIndex === null) return

  highlightErrors()

  let correct = sentences[currentSentenceIndex].en.trim()
  let user = userInput.value.trim()

  if (ignorePunctuation) {
    const strip = (s) => s.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim()
    correct = strip(correct)
    user = strip(user)
  }

  const isCorrect = voiceInputActive
    ? user.toLowerCase() === correct.toLowerCase()
    : user === correct

  if (isCorrect) {
    if (!usedIndexes.includes(currentSentenceIndex)) {
      usedIndexes.push(currentSentenceIndex)
      localStorage.setItem("usedIndexes", JSON.stringify(usedIndexes))
    }
    showPopup(sentences[currentSentenceIndex], true)
  }
}

/* ============================================================
   Sentence flow
   ============================================================ */

function getRandomSentence() {
  if (!sentences.length) {
    sentenceEl.textContent = "Список порожній. Завантажте або створіть список."
    sentenceCount.innerText = 0
    return
  }

  const available = sentences
    .map((_, index) => index)
    .filter((index) => !usedIndexes.includes(index))

  if (available.length === 0) {
    showInformationModal("Усі речення використані!")
    localStorage.removeItem("usedIndexes")
    usedIndexes = []
    sentenceCount.innerText = sentences.length
    currentSentenceIndex = 0
  } else {
    sentenceCount.innerText = available.length
    currentSentenceIndex = available[Math.floor(Math.random() * available.length)]
  }

  sentenceEl.textContent = sentences[currentSentenceIndex].ua
  userInput.value = ""
  inputOverlay.innerHTML = ""
  userInput.focus()
  hintMode = false
}

function showPopup(text, autoClose = false) {
  popupText.textContent = text.en
  if (voiceInputActive) {
    userInput.value = ""
    inputOverlay.innerHTML = ""
  }

  if (text.example && text.example.trim()) {
    exampleText.textContent = text.example
    exampleText.style.display = "block"
  } else {
    exampleText.style.display = "none"
  }

  popup.style.display = "flex"

  if (!voiceInputActive || !hintMode) {
    speak(text.en, autoClose)
  } else if (autoClose) {
    setTimeout(() => {
      hidePopup()
    }, 2000)
  }
}

function hidePopup() {
  voiceEngine.stop()
  voiceEngineActive = false
  popup.style.display = "none"
  userInput.focus()
  if (!hintMode) {
    getRandomSentence()
  }
}

function speak(text, autoClose = false) {
  voiceEngineActive = true
  voiceEngine.speak(text, autoClose ? hidePopup : null)
}

function speakCurrentSentence() {
  if (currentSentenceIndex === null || !sentences[currentSentenceIndex]) return

  hintMode = true
  voiceEngineActive = true

  if (voiceInputActive) {
    userInput.value = ""
    inputOverlay.innerHTML = ""
  }

  voiceEngine.speak(sentences[currentSentenceIndex].en)
}

function skipSentence() {
  if (currentSentenceIndex === null) return

  if (!usedIndexes.includes(currentSentenceIndex)) {
    usedIndexes.push(currentSentenceIndex)
    localStorage.setItem("usedIndexes", JSON.stringify(usedIndexes))
  }

  voiceEngine.stop()
  voiceEngineActive = false
  popup.style.display = "none"
  getRandomSentence()
}

function showHint() {
  if (currentSentenceIndex !== null) {
    hintMode = true
    showPopup(sentences[currentSentenceIndex], false)
  }
}

/* ============================================================
   Save sentence to saved list
   ============================================================ */

function pushToSaved() {
  if (currentSentenceIndex === null) return
  const current = sentences[currentSentenceIndex]
  const stored = readJSON("saveSelected")

  if (!current || stored.some((item) => item.ua === current.ua && item.en === current.en)) {
    return false
  }

  stored.push({ ua: current.ua, en: current.en, example: current.example || "" })
  localStorage.setItem("saveSelected", JSON.stringify(stored))
  window.dispatchEvent(new Event("saveSelectedChanged"))
  return true
}

function saveSentenceToLocalStorage() {
  pushToSaved()
  showInformationModal("Речення в списку")
  hidePopup()
  userInput.focus()
}

function saveSentenceToLocalStorageNoAdvance() {
  pushToSaved()
  showInformationModal("Речення в списку")
  userInput.focus()
}

/* ============================================================
   Init
   ============================================================ */

function showRecognizedTextIndicator() {
  if (!userInput) return
  userInput.style.transition = "background-color 0.3s ease"
  userInput.style.backgroundColor = "rgba(34, 197, 94, 0.15)"
  setTimeout(() => {
    userInput.style.backgroundColor = "transparent"
  }, 250)
}

function onSpeechFinished() {
  setTimeout(() => {
    voiceEngineActive = false
  }, 1000)
}

function initApp() {
  const trainerDiv = $("trainer")
  if (trainerDiv) {
    trainerDiv.prepend(createIgnorePunctuationIcon())
  }

  voiceEngine.init(voiceSelect, speedControl, pitchControl, volumeControl)
  voiceEngine.setOnSpeechEndCallback(onSpeechFinished)

  initSpeechRecognition()
  getRandomSentence()
}

/* ---------- Keyboard shortcuts ---------- */

document.addEventListener("keydown", (e) => {
  if (e.key === "F12" || (e.ctrlKey && e.key === "Enter")) {
    e.preventDefault()
    skipSentence()
    return
  }

  if (e.key === "F8") {
    e.preventDefault()
    if (popup.style.display === "flex") {
      hidePopup()
    } else {
      userInput.blur()
      showHint()
    }
  }

  if (e.key === "F9") {
    e.preventDefault()
    saveSentenceToLocalStorageNoAdvance()
  }

  if (e.key === "F10") {
    e.preventDefault()
    toggleVoiceRecording()
  }

  if (e.key === "Escape" && isRecording) {
    e.preventDefault()
    stopVoiceRecording()
  }

  if (e.key === "Enter" && popup.style.display === "flex") {
    hidePopup()
  }
})

/* ---------- Settings panel ---------- */

settingsBtn.addEventListener("click", () => {
  const isHidden = settings.classList.toggle("hide")
  settingsBtn.classList.toggle("active", !isHidden)
})

/* ---------- Slider value indicators ---------- */

const showValue = (input, suffix = "") => {
  const el = $(`${input.id}-value`)
  if (el) el.textContent = `${input.value}${suffix}`
}

speedControl.addEventListener("input", () => {
  showValue(speedControl, "×")
  voiceEngine.saveSettings()
})
pitchControl.addEventListener("input", () => {
  showValue(pitchControl, "×")
  voiceEngine.saveSettings()
})
volumeControl.addEventListener("input", () => {
  showValue(volumeControl, "")
  voiceEngine.saveSettings()
})

/* ---------- UI events ---------- */

document.addEventListener("click", (event) => {
  if (
    popup.style.display === "flex" &&
    popup.contains(event.target) &&
    !popup.querySelector(".popup-content").contains(event.target)
  ) {
    hidePopup()
  }
})

userInput.addEventListener("input", checkAnswer)
userInput.addEventListener("input", () => {
  if (!isRecording) voiceInputActive = false
})
userInput.addEventListener("focus", () => {
  if (popup.style.display === "flex") hidePopup()
})

skipBtn.addEventListener("click", skipSentence)
hintBtn.addEventListener("click", showHint)
closePopup.addEventListener("click", hidePopup)
voiceSelect.addEventListener("change", () => voiceEngine.saveSettings())
saveSentence.addEventListener("click", saveSentenceToLocalStorage)
trainerRepeatBtn.addEventListener("click", saveSentenceToLocalStorageNoAdvance)
trainerVoiceBtn.addEventListener("click", speakCurrentSentence)
voiceInputBtn.addEventListener("click", toggleVoiceRecording)

speechSynthesis.addEventListener("voiceschanged", () => voiceEngine.loadVoices())

initApp()
