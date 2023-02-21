import {sleep} from './sleep.js';
export default class CaptureStreamFromVideoBlob {

  constructor(blob){

    this.blob = blob;
    this.outputStream = null;
    this.video = null; // player 

    this.init = this.init.bind(this);
    this.start = this.start.bind(this);
    this.getStream = this.getStream.bind(this);
    this.stop = this.stop.bind(this);

    this.init();
  }

  init() {
    try {

      this.video = document.createElement("video"); 
      this.video.src = URL.createObjectURL(this.blob);
      this.video.load();
      this.video.muted = true; // can capture muted audio?

      this.video.oncanplaythrough = (e) => {
        try {
          if (this.video.captureStream) {
            this.outputStream = this.video.captureStream(); // Chrome etc.
          } else if (this.video.mozCaptureStream){
            this.outputStream = this.video.mozCaptureStream(); // Firefox
          } else {
            alert('Sorry captureStream() is NOT available on this browser. Mixing is not possible. Just playing recorded video without karaoke', 
navigator.userAgent);
            this.video.muted = false; 
            this.video.play();
          }
        } catch(err) {console.error(err);}
      }

    } catch(err) {console.error(err);}

  } 

  async start(msec) {
    await sleep(msec);
    await this.video.play();
  }

  async getStream(){
    while (this.outputStream === null) await sleep(100);
    // console.log('capture', this.outputStream.getTracks());
    return this.outputStream;
  }

  stop(){
    this.video.pause();
    this.video = null;
  }

};
