const { invoke, convertFileSrc } = window.__TAURI__.core

let greetInputEl;
let greetMsgEl;

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById('video_source');
  const source = document.createElement('source');
  source.type = 'video/mp4';
  source.src = convertFileSrc('rust.mp4', 'stream');
  video.appendChild(source);
  video.load();

  const repeatReading = document.getElementById('repeat-reading');
  repeatReading.addEventListener('click', (e) => {
    e.preventDefault();
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  });
});
