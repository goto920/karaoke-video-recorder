# Source Program Files #

...
src
├── App.js
├── index.js
├── lib
│   ├── CaptureStreamFromVideoBlob.js // extract video track from recording
│   ├── GainAndMeter.js // audio gain and peak calculation
│   ├── MixBlobsToStream.js // mix recorded blobs (vocal with video and karaoke)
│   ├── StreamRecorder.js // wrapper for MediaRecorder
│   ├── checkAPI.js // check API capabilities (not used yet) 
│   ├── clicks.mp3  // Click Sound
│   ├── estimateLatency.js // estimation of latency of recording
│   ├── exportRecordedBlob.js // export recording for download 
│   ├── findLatency.js // used in estimateLatency.js
│   ├── loadAndDecodeAudio.js 
        // local file reader for audio in a video/audio file)
│   ├── mediaDeviceUtils.js // wrappter for enumerateDevices, getUserMedia()
│   ├── sleep.js
├── modal
│   ├── AvSettingModal.js // UI for input/output selection, audio options
...
