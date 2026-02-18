const { invoke, convertFileSrc } = window.__TAURI__.core

var timeouts = [];
var stts = [];

function changeFileExtname(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    console.error("Invalid input: The file path must be a non-empty string.");
    return filePath;
  }

  const lastDotIndex = filePath.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
    return filePath + '.stts';
  }

  return filePath.slice(0, lastDotIndex) + '.stts';
}

async function getSpeechTimestamps(filePath) {
  return await invoke("get_speech_timestamps", { filePath: filePath });
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

function seekVideoToAndPlay(seekTime, endTime) {
  const video = document.getElementById('video_source');
  if (video) {
    video.currentTime = seekTime;
    if (video.paused || video.ended) {
      video.play();
    }

    clearAllTimeouts();

    if (!document.getElementById("continuous-play").checked) {
      timeouts.push(setInterval(function(){
        if (video.currentTime >= endTime) {
          video.pause();
          clearAllTimeouts();
        }
      }, 100));
    }
  }
}

function clearAllTimeouts() {
  for (var i=0; i<timeouts.length; i++) {
    clearTimeout(timeouts[i]);
  }
  timeouts = [];
}

window.addEventListener("DOMContentLoaded", () => {
  let overlay = document.getElementById("overlay");
  const video = document.getElementById('video_source');
  overlay.style.transform = `translate(0, ${video.clientHeight - 100 - overlay.clientHeight / 2}px)`;

  // Show controls on mouse enter, hide on mouse leave to avoid dark overlay on macOS
  video.addEventListener('mouseenter', () => {
    video.setAttribute('controls', '');
  });
  video.addEventListener('mouseleave', () => {
    video.removeAttribute('controls');
  });

  let subtitleOverlay = document.getElementById("subtitle-overlay");

  function drag(e) {
    const width = overlay.clientWidth;
    const height = overlay.clientHeight;

    if(overlay.classList.contains('full-width')) {
      overlay.style.transform = `translate(0px, ${e.pageY - height / 2}px)`;
    } else {
      overlay.style.transform = `translate(${e.pageX - width / 2}px, ${e.pageY - height / 2}px)`;
    }
  }

  overlay.addEventListener("mousedown", () =>
    document.addEventListener("mousemove", drag)
  );

  overlay.addEventListener("mouseup", () =>
    document.removeEventListener("mousemove", drag)
  );

  subtitleOverlay.addEventListener("click", () => {
    if(overlay.classList.contains('full-width')) {
      overlay.classList.remove('full-width');
      overlay.classList.add('normal-width');
    } else {
      overlay.classList.remove('normal-width');
      overlay.classList.add('full-width');
    }

    const regex = /translate\(-*\d+px,/;
    overlay.style.transform = overlay.style.transform.replace(regex,'translate(0px,');
  });
  
  let openFile = document.getElementById("open-file");
  openFile.addEventListener("click", () => {
    invoke("open_file_dialog").then( (filePath) => {
      console.log("file path", filePath);
      let source_type = "video/mp4";
      if (filePath.endsWith(".mp3")) {
        source_type = "audio/mpeg";
      } else if (filePath.endsWith(".wav")) {
        source_type = "audio/wav";
      }

      if (filePath && filePath.length > 0) {
        const source = video.getElementsByTagName('source')[0];
        source.src = convertFileSrc(filePath, 'stream');
        source.type = source_type;
        video.load();
        clearAllTimeouts();

        const sttsPath = changeFileExtname(filePath);

        getSpeechTimestamps(sttsPath).then(function(timestamps) {
          console.log("timestamps", timestamps);
          stts = JSON.parse(timestamps);
          console.log("stts", stts);
        }).catch(function(error) {
          console.error("Error fetching speech timestamps:", error);
          stts = [];
        });
      }
    });
  });

  const previousSentence = document.getElementById('previous-sentence');
  previousSentence.addEventListener('click', (e) => {
    const previousSentence = locatePreviousSentence(stts, video.currentTime);
    const start = stts[previousSentence].start;
    const end = stts[previousSentence].end;
    seekVideoToAndPlay(start, end);
  });

  const nextSentence = document.getElementById('next-sentence');
  nextSentence.addEventListener('click', (e) => {
    const nextSentence = locateNextSentence(stts, video.currentTime);
    const start = stts[nextSentence].start;
    const end = stts[nextSentence].end;
    seekVideoToAndPlay(start, end);
  });

  const repeatReading = document.getElementById('repeat-reading');
  repeatReading.addEventListener('click', (e) => {
    const currentSentence = locateCurrentSentence(stts, video.currentTime);
    const start = stts[currentSentence].start;
    const end = stts[currentSentence].end;
    seekVideoToAndPlay(start, end);
  });

  const backwardMore = document.getElementById('backward-more');
  backwardMore.addEventListener('click', (e) => {
    const currentSentence = locateCurrentSentence(stts, video.currentTime);
    let start = video.currentTime;
    start -= 5;
    if (start < 0) {
      start = 0;
    }
    const end = stts[currentSentence].end;
    seekVideoToAndPlay(start, end);
  });

  const backwardLittle = document.getElementById('backward-little');
  backwardLittle.addEventListener('click', (e) => {
    const currentSentence = locateCurrentSentence(stts, video.currentTime);
    let start = video.currentTime;
    start -= 3;
    if (start < 0) {
      start = 0;
    }
    const end = stts[currentSentence].end;
    seekVideoToAndPlay(start, end);
  });

  const forwardMore = document.getElementById('forward-more');
  forwardMore.addEventListener('click', (e) => {
    const currentSentence = locateCurrentSentence(stts, video.currentTime);
    let start = video.currentTime;
    start += 5;
    if (start >= video.duration) {
      start = video.duration;
    }
    const end = stts[currentSentence].end;
    seekVideoToAndPlay(start, end);
  });

  const forwardLittle = document.getElementById('forward-little');
  forwardLittle.addEventListener('click', (e) => {
    const currentSentence = locateCurrentSentence(stts, video.currentTime);
    let start = video.currentTime;
    start += 3;
    if (start >= video.duration) {
      start = video.duration;
    }
    const end = stts[currentSentence].end;
    seekVideoToAndPlay(start, end);
  });
});
