const { invoke, convertFileSrc } = window.__TAURI__.core

async function getSpeechTimestamps() {
  return await invoke("get_speech_timestamps");
}

window.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById('video_source');
  const source = document.createElement('source');
  source.type = 'video/mp4';
  source.src = convertFileSrc('rust.mp4', 'stream');
  video.appendChild(source);
  video.load();

  getSpeechTimestamps().then(function(timestamps) {
    alert(timestamps);
    const stts = JSON.parse(timestamps);

    const previousSentence = document.getElementById('previous-sentence');
    previousSentence.addEventListener('click', (e) => {
      for (let index = 0; index < stts.length; ++index) {
        const element = stts[index];
        if (video.currentTime < element.end) {
          let previousIndex = index - 1;
          if (previousIndex < 0) {
              previousIndex = 0;
          } 
          video.currentTime = stts[previousIndex].start;
          break;
        }

        if (video.paused || video.ended) {
          video.play();
        }
      }
    });

    const nextSentence = document.getElementById('next-sentence');
    nextSentence.addEventListener('click', (e) => {
      for (let index = 0; index < stts.length; ++index) {
        const element = stts[index];
        if (video.currentTime < element.end) {
          let nextIndex = index + 1;
          if (nextIndex >= stts.length) {
            nextIndex = stts.length - 1;
          }
          video.currentTime = stts[nextIndex].start; 
          break;
        }

        if (video.paused || video.ended) {
          video.play();
        }
      }
    });

    const repeatReading = document.getElementById('repeat-reading');
    repeatReading.addEventListener('click', (e) => {
      let found = false;
      for (let index = 0; index < stts.length; ++index) {
        const element = stts[index];
        if (video.currentTime < element.end) {
          video.currentTime = element.start;
          found = true;
          break;
        }

        if (video.paused || video.ended) {
          video.play();
        }
      }

      if (!found) {
        video.currentTime = stts[stts.length-1].start;
        if (video.paused || video.ended) {
          video.play();
        }
      }
    });
  });
});
