import json
import subprocess
import sys
import tempfile
import os
from pathlib import Path 
from silero_vad import load_silero_vad, read_audio, get_speech_timestamps


if len(sys.argv) != 2:
    print("Usage: python vad.py <input_video_file>")
    sys.exit(1)

input_file_path = sys.argv[1]
input_file_dir = Path(input_file_path).parent
input_file_name = Path(input_file_path).name
tmp_wave_file_name = os.path.splitext(input_file_name)[0] + ".wav"
stts_file_name = os.path.splitext(input_file_name)[0] + ".stts"
stts_file_path = os.path.join(input_file_dir, stts_file_name)

with tempfile.TemporaryDirectory() as tmp:
  wav_file_path = os.path.join(tmp, tmp_wave_file_name)

  result = subprocess.run(['ffmpeg', '-i', input_file_path, '-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000', wav_file_path], capture_output=True, text=True)
  print("Stdout:", result.stdout)
  print("Stderr:", result.stderr)
  print("Return code:", result.returncode)

  model = load_silero_vad()
  wav = read_audio(wav_file_path)
  speech_timestamps = get_speech_timestamps(
    wav,
    model,
    threshold = 0.5,  # Threshold for detecting speech (default is 0.5)
    return_seconds=True,  # Return speech timestamps in seconds (default is samples)
  )

  with open(stts_file_path, "w") as outfile:
    json.dump(speech_timestamps, outfile)
