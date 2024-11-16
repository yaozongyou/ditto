const { invoke, convertFileSrc } = window.__TAURI__.core

async function getSpeechTimestamps() {
  return await invoke("get_speech_timestamps");
}

// 找到当前时间对应的语句，比如说：
// [{"start": 1, "end": 3},{"start": 5, "end": 7}]
// 0对应第一句，返回下标为0
// 1、2、3都对应第一句，返回下标为0
// 4对应第一句，返回下标为0
// 5、6、7对应第二句，返回下标为1
// 8对应第二句，返回下标为1
function locateCurrentSentence(stts, currentTime) {
  if (stts.length == 0) {
    return 0;
  }

  for (let index = 0; index < stts.length; ++index) {
    if (currentTime < stts[index].start) {
      if ((index - 1) >= 0) {
        return index - 1;
      } else {
        return 0;
      }
    }
  }

  return stts.length - 1;
}

function locatePreviousSentence(stts, currentTime) {
  const currentSentence = locateCurrentSentence(stts, currentTime);
  if (currentSentence == 0) {
    return currentSentence;
  }

  return currentSentence - 1;
}

function locateNextSentence(stts, currentTime) {
  const currentSentence = locateCurrentSentence(stts, currentTime);
  if (currentSentence >= (stts.length - 1)) {
    return currentSentence;
  }

  return currentSentence + 1;
}

function seekVideoToAndPlay(seekTime) {
  const video = document.getElementById('video_source');
  if (video) {
    video.currentTime = seekTime;
    if (video.paused || video.ended) {
      video.play();
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById('video_source');
  const source = document.createElement('source');
  source.type = 'video/mp4';
  source.src = convertFileSrc('family.mp4', 'stream');
  video.appendChild(source);
  video.load();

  getSpeechTimestamps().then(function(timestamps) {
    alert(timestamps);
    const stts = JSON.parse(timestamps);

    const previousSentence = document.getElementById('previous-sentence');
    previousSentence.addEventListener('click', (e) => {
      const previousSentence = locatePreviousSentence(stts, video.currentTime);
      seekVideoToAndPlay(stts[previousSentence].start);
    });

    const nextSentence = document.getElementById('next-sentence');
    nextSentence.addEventListener('click', (e) => {
      const nextSentence = locateNextSentence(stts, video.currentTime);
      seekVideoToAndPlay(stts[nextSentence].start);
    });

    const repeatReading = document.getElementById('repeat-reading');
    repeatReading.addEventListener('click', (e) => {
      const currentSentence = locateCurrentSentence(stts, video.currentTime);
      seekVideoToAndPlay(stts[currentSentence].start);
    });
  });
});
