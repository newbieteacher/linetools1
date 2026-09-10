const timerEl = document.getElementById('timer');
const charCountEl = document.getElementById('charCount');
const wordCountEl = document.getElementById('wordCount');
const wordEl = document.getElementById('word');
const bopomofoEl = document.getElementById('bopomofo');
const typingInput = document.getElementById('typingInput');
const startBtn = document.getElementById('startBtn');
const soundBtn = document.getElementById('soundBtn');
const resetBtn = document.getElementById('resetBtn');
const result = document.getElementById('result');
const practiceMode = document.getElementById('practiceMode');
const modeHelp = document.getElementById('modeHelp');
const questionHint = document.getElementById('questionHint');
const endSound = document.getElementById('endSound');
const endSoundStatus = document.getElementById('endSoundStatus');
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioContext = null;
const activeTones = new Set();
if (!AudioContextClass) {
  endSound.checked = false;
  endSound.disabled = true;
  endSoundStatus.textContent = '此瀏覽器不支援提示音，時間到仍會顯示練習成果。';
}
async function prepareEndSound(){
  if (!endSound.checked || !AudioContextClass) return;
  try {
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state !== 'running') await audioContext.resume();
    endSoundStatus.textContent = '';
  } catch {
    endSoundStatus.textContent = '提示音無法啟用，時間到仍會顯示練習成果。';
  }
}
function stopEndSound(){
  for (const tone of activeTones) { tone.stop(); tone.disconnect(); }
  activeTones.clear();
}
function playEndSound(){
  if (!endSound.checked) return;
  if (!audioContext || audioContext.state !== 'running') {
    endSoundStatus.textContent = '提示音未能播放，請查看下方練習成果。';
    return;
  }
  try {
    const start = audioContext.currentTime;
    [659.25, 880].forEach((frequency, index) => {
      const tone = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const at = start + index * 0.3;
      tone.type = 'sine';
      tone.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.45);
      tone.connect(gain);
      gain.connect(audioContext.destination);
      activeTones.add(tone);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); activeTones.delete(tone); };
      tone.start(at);
      tone.stop(at + 0.5);
    });
  } catch {
    endSoundStatus.textContent = '提示音未能播放，請查看下方練習成果。';
  }
}
endSound.addEventListener('change', () => {
  if (endSound.checked) void prepareEndSound();
  else { stopEndSound(); endSoundStatus.textContent = ''; }
});
const banks = { words, punctuation, sentences, mixed: [...words, ...punctuation, ...sentences] };
let questionQueue = [];
function updateModeHelp(){
  const mode = practiceMode.value;
  modeHelp.textContent = `共 ${banks[mode].length} 題。` + (mode === 'words'
    ? '看注音，練習生活與電腦常用詞語。'
    : '請輸入題目中的中文標點，注意全形與半形不同；可使用輸入法的符號面板選字。');
}
updateModeHelp();
practiceMode.addEventListener('change', updateModeHelp);
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let currentWord = null, charCount = 0, wordCount = 0;
let timerInterval = null, playing = false, composing = false, deadline = 0;
soundBtn.disabled = true;
if (!canSpeak) soundBtn.textContent = '此瀏覽器不支援語音';
function pickWord(){
  if (!questionQueue.length) {
    questionQueue = [...banks[practiceMode.value]];
    for (let i = questionQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionQueue[i], questionQueue[j]] = [questionQueue[j], questionQueue[i]];
    }
    if (questionQueue.length > 1 && questionQueue[questionQueue.length - 1] === currentWord) {
      [questionQueue[0], questionQueue[questionQueue.length - 1]] = [questionQueue[questionQueue.length - 1], questionQueue[0]];
    }
  }
  currentWord = questionQueue.pop();
  wordEl.textContent = currentWord.word;
  bopomofoEl.textContent = currentWord.name ? `${currentWord.name}｜${currentWord.bopomofo}` : currentWord.bopomofo;
  questionHint.textContent = currentWord.hint || (currentWord.name ? '請輸入上方符號，不用輸入符號名稱；注意中文全形標點。' : '請完整輸入上方題目，包含標點符號。');
  typingInput.value = '';
  typingInput.focus();
}
function speakWord(){
  if (!canSpeak || !playing || !currentWord) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(currentWord.name || currentWord.word);
  speech.lang = 'zh-TW';
  speech.rate = 0.8;
  window.speechSynthesis.speak(speech);
}
function getEncouragement(count){
  if (count >= 50) return '🏆 打字小高手！一分鐘完成 50 個字元以上，這份練習成果值得給自己掌聲！';
  if (count >= 30) return '🌟 太厲害了！解鎖「鍵盤達人」練習徽章，繼續累積你的實力！';
  if (count >= 20) return '💼 好棒！解鎖「辦公小幫手」練習徽章，為工作與生活多學會一項本領！';
  if (count >= 10) return '🎉 你做到了！一分鐘完成 10 個字元以上，解鎖「打字新星」練習徽章！';
  if (count >= 5) return '👏 好棒！一分鐘完成 5 個字元以上，每一次按鍵都是努力的成果！';
  if (count > 0) return '🌱 很棒的開始！你已經成功打出答案，慢慢練習就很好！';
  return '💚 願意開始就很棒！先找到鍵盤上的位置，下次試著完成第一題，不用急。';
}
function finishGame(){
  if (!playing) return;
  playing = false;
  clearInterval(timerInterval);
  typingInput.disabled = true;
  startBtn.disabled = false;
  practiceMode.disabled = false;
  startBtn.textContent = '再練習一次';
  soundBtn.disabled = true;
  if (canSpeak) window.speechSynthesis.cancel();
  result.hidden = false;
  result.textContent = `🎉 完成一分鐘練習！\n打對 ${charCount} 個字元（含標點），完成 ${wordCount} 題。\n\n${getEncouragement(charCount)}\n\n我們不用很厲害才開始，只要開始就很厲害！`;
  playEndSound();
}
function tick(){
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  timerEl.textContent = remaining;
  if (!remaining) finishGame();
}
function startGame(){
  if (playing) return;
  stopEndSound();
  void prepareEndSound();
  questionQueue = [];
  practiceMode.disabled = true;
  charCount = 0; wordCount = 0; composing = false; playing = true;
  deadline = Date.now() + 60000;
  timerEl.textContent = 60;
  charCountEl.textContent = 0;
  wordCountEl.textContent = 0;
  result.hidden = true;
  startBtn.disabled = true;
  soundBtn.disabled = !canSpeak;
  typingInput.disabled = false;
  pickWord(); speakWord();
  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 250);
}
function resetGame(){
  stopEndSound();
  playing = false; composing = false; currentWord = null;
  questionQueue = [];
  practiceMode.disabled = false;
  clearInterval(timerInterval);
  if (canSpeak) window.speechSynthesis.cancel();
  charCount = 0; wordCount = 0;
  timerEl.textContent = 60;
  charCountEl.textContent = 0;
  wordCountEl.textContent = 0;
  wordEl.textContent = '準備開始';
  bopomofoEl.textContent = '按下開始練習';
  questionHint.textContent = '請輸入與題目相同的文字或標點，答對後自動換題。';
  typingInput.value = ''; typingInput.disabled = true;
  startBtn.disabled = false; startBtn.textContent = '開始練習';
  soundBtn.disabled = true; result.hidden = true;
  startBtn.focus();
}
function checkAnswer(){
  if (!playing || composing || !currentWord) return;
  if (Date.now() >= deadline) { tick(); return; }
  if (typingInput.value.trim() !== currentWord.word) return;
  charCount += currentWord.word.length; wordCount++;
  charCountEl.textContent = charCount;
  wordCountEl.textContent = wordCount;
  pickWord(); speakWord();
}
typingInput.addEventListener('compositionstart', () => { composing = true; });
typingInput.addEventListener('compositionend', () => { composing = false; checkAnswer(); });
typingInput.addEventListener('input', event => { if (!event.isComposing) checkAnswer(); });
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
soundBtn.addEventListener('click', speakWord);
