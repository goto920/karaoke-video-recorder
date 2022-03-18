import {sleep} from './sleep.js';

/* MediaDevices manipulation */

export default class StreamRecorder {
  constructor(stream){

    const options = {
      audioBitsPersecond: 256000,
//      videoBitsPerSecond: 128000,
      mimeType: 'video/webm'
    };
    this.stream = stream;

    let chunks = [];

    this.exportBlob = null;

    this.recorder = new MediaRecorder(stream, options);

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

  start() { this.recorder.start(); this.recording = true;}

  async stop() { 
    this.recorder.stop(); 
    while (this.exportBlob === null) await sleep(1000);
    this.recording = false;
  } 

  getBlob() { return this.exportBlob; }

  clearStream() {
    if (this.recording) return false;

    this.stream.getTracks().forEach (track => {
          this.stream.removeTrack(track); track.stop(); });
    
    return true; 
  }

};