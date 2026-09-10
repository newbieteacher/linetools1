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
const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const result = document.getElementById('result');
let score = 0, playing = false, deadline = 0;
let timerInterval = null, balloonInterval = null;
const removalTimers = new Set();
function createBalloon(){
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'balloon';
  const icons = ['🎈','🎉','⭐','🟢','💚'];
  const icon = icons[Math.floor(Math.random() * icons.length)];
  const double = icon === '🎈';
  item.textContent = icon;
  item.setAttribute('aria-label', double ? '氣球：連按兩下，得三分' : '圖案：按一下，得一分');
  item.title = double ? '連按兩下，得 3 分' : '按一下，得 1 分';
  item.style.left = Math.random() * Math.max(0, gameArea.clientWidth - 80) + 'px';
  item.style.top = Math.random() * Math.max(0, gameArea.clientHeight - 80) + 'px';
  let lastClick = null;
  item.addEventListener('click', () => {
    if (!playing || !item.isConnected) return;
    if (Date.now() >= deadline) { tick(); return; }
    const now = Date.now();
    if (double && (lastClick === null || now - lastClick > 600)) {
      lastClick = now;
      item.style.background = '#e7efdf';
      return;
    }
    score += double ? 3 : 1;
    scoreEl.textContent = score;
    item.remove();
  });
  gameArea.appendChild(item);
  const timeout = setTimeout(() => { item.remove(); removalTimers.delete(timeout); }, 3200);
  removalTimers.add(timeout);
}
function finishGame(){
  if (!playing) return;
  playing = false;
  clearInterval(timerInterval); clearInterval(balloonInterval);
  removalTimers.forEach(clearTimeout); removalTimers.clear();
  gameArea.replaceChildren();
  startBtn.disabled = false; startBtn.textContent = '再練習一次';
  result.hidden = false;
  result.textContent = `🎉 完成一分鐘練習！\n本次得分：${score} 分。\n願意開始就是進步，繼續練習會更順手！`;
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
  score = 0; playing = true; deadline = Date.now() + 60000;
  scoreEl.textContent = 0; timerEl.textContent = 60;
  result.hidden = true; startBtn.disabled = true;
  gameArea.replaceChildren();
  createBalloon();
  balloonInterval = setInterval(createBalloon, 1000);
  timerInterval = setInterval(tick, 250);
}
startBtn.addEventListener('click', startGame);
