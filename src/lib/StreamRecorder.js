import {sleep} from './sleep.js';

/* MediaDevices manipulation */

export default class StreamRecorder {
  constructor(stream){

    const vtracks = stream.getVideoTracks().length;
    const atracks = stream.getAudioTracks().length;

    let mimeType = '';

    if (vtracks && atracks) mimeType = 'video/webm;codecs=vp8,opus';
    else if (vtracks && atracks === 0) mimeType = 'video/webm;codecs=vp8';
    else if (vtracks === 0 && atracks) mimeType = 'audio/opus;codecs=opus';

    const options = {
     mimeType: mimeType,
      audioBitsPersecond: 510000
//      videoBitsPerSecond: 128000,
    };

    this.stream = stream.clone();

    let chunks = [];

    this.exportBlob = null;
    
    try {
       this.recorder = new MediaRecorder(stream, options);
    } catch (e) { // for Safari
       let noMimeTypeOptions = options;
       delete options.mimeType;
       this.recorder 
          = new MediaRecorder(this._recordingStream, noMimeTypeOptions);
    }

    this.recorder.onstop = (e) => { 
      this.exportBlob = new Blob(chunks, {type: chunks[0].type});
    };

    this.recording = false;

    this.recorder.ondataavailable = (e) =>  {chunks.push(e.data); };

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.getBlob = this.getBlob.bind(this);
    this.clearStream = this.clearStream.bind(this);

  }

  start() {
    console.log('recording start', this.stream.getTracks());
    this.recorder.start(); 
    this.recording = true;
  }

  async stop() { 
    this.recorder.stop(); 
    while (this.exportBlob === null) await sleep(1000);
    this.recording = false;
    return this.exportBlob;
  } 

  getBlob() { return this.exportBlob; }

  clearStream() {
    if (this.recording) return false;

    this.stream.getTracks().forEach (track => {
          this.stream.removeTrack(track);}); 
    // track.stop(); });
    
    return true; 
  }

};
