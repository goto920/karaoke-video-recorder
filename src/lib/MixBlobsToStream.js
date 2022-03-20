import {sleep} from './sleep.js';

export default class MixBlobsToStream {

   constructor(ctx, videoBlob, karaokeFile, 
       karaokeDelay, vocalGain, karaokeGain){
    
     // parameters
     this.ctx = ctx;
     this.videoBlob = videoBlob;
     this.karaokeFile = karaokeFile;
     this.karaokeDelay = karaokeDelay;
     this.vocalGain = vocalGain; // dB 
     this.karaokeGain = karaokeGain; // dB

     // instance variables
     this.video = undefined;
     this.karaoke = undefined;
     this.gainNode1 = undefined;
     this.delayNode1 = undefined;
     this.gainNode2 = undefined;
     this.delayNode2 = undefined;

     this.outputStream = undefined;

     // functions
     this.init = this.init.bind(this);
     // this.close = this.close.bind(this);
     this.stop = this.stop.bind(this);
     // this.start = this.start.bind(this);

     this.setKaraokeDelay = this.setKaraokeDelay.bind(this);
     this.setVocalGain = this.setVocalGain.bind(this);
     this.setKaraokeGain = this.setKaraokeGain.bind(this);

     this.getOutputStream = this.getOutputStream.bind(this);

     this.init();
   }

   setKaraokeDelay(msec){
     this.karaokeDelay = msec;
/*
     if (msec >= 0) {
       this.delayNode1.delayTime.value = 0;
       this.delayNode2.delayTime.value = msec/1000;
     } else {
       this.delayNode1.delayTime.value = -msec/1000;
       this.delayNode2.delayTime.value = 0;
     }
*/
   }

   setVocalGain(dB){ // dB
     // this.vocalGain = dB;

     this.gainNode1.gain.value = Math.pow(10,dB/20);
   }

   setKaraokeGain(dB){ // dB
     // this.karaokeGain = dB;
     this.gainNode2.gain.value = Math.pow(10,dB/20);
     // console.log('karaokeGain value', this.gainNode2.gain.value);
   }

   async decode(file){ // File or Blob

     let reader = new FileReader();

     let retval = undefined;
     reader.onload = (e) => {
       try {
         this.ctx.decodeAudioData(reader.result,
            (audioBuffer) => retval = audioBuffer,
            (err) => console.log(err));
       } catch (err) {console.log(err)};
     }

     reader.readAsArrayBuffer(file);
     while (retval === undefined) await sleep(100);
     console.log('decode() retval', retval);

     return retval;
   }

   stop(){
     this.karaoke.stop();
     if (this.video) {
       this.video.pause(); 
       this.video = null;
     }
   }
  
  async init(){

    this.video = document.createElement("video");
    this.video.src = URL.createObjectURL(this.videoBlob);

    this.karaoke = this.ctx.createBufferSource();
    this.karaoke.buffer = await this.decode(this.karaokeFile);
    console.log('decoded:', this.karaoke.buffer);

    this.outputStream = new MediaStream();

    this.delayNode1 = new DelayNode(this.ctx);
    this.delayNode2 = new DelayNode(this.ctx);
// this.delayNode2 = new DelayNode(this.ctx, {delayTime: this.karaokeDelay});
    if (this.karaokeDelay >= 0) {
      this.delayNode1.delayTime.value = 0;
      this.delayNode2.delayTime.value = this.karaokeDelay;
    } else {
      this.delayNode1.delayTime.value = Math.abs(this.karaokeDelay);
      this.delayNode2.delayTime.value = 0;
    }
 
    this.gainNode1 = new GainNode(this.ctx);
    this.gainNode1.gain.value = Math.pow(10,this.vocalGain/20);

    this.gainNode2 = new GainNode(this.ctx);
    this.gainNode2.gain.value = Math.pow(10,this.karaokeGain/20);

    const dest = this.ctx.createMediaStreamDestination();

    this.video.play(); // Play before captureStream()
    this.karaoke.start(0);

/*
    if (this.karaokeDelay >= 0){
      this.karaoke.start(this.ctx.currentTime + this.karaokeDelay/1000,0); 
       // when, offset, duration 
    else 
      this.karaoke.start(0, Math.abs(this.karaokeDelay)); 
*/

    this.karaoke.onended = (e) => {this.stop()};

 /*
  // DynamicsCompressornode()
  // Reverb https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html
 */

    let videoStream = undefined;
    try {
      if (this.video.captureStream) 
        videoStream = this.video.captureStream();
      else if (this.video.mozCaptureStream) 
        videoStream = this.video.mozCaptureStream();
      else 
        alert('video.captureStream() is NOT available on this browser');
    } catch (err) {console.error(err);}

    console.log('Capture set:', videoStream.getTracks());
    this.outputStream.addTrack(videoStream.getVideoTracks()[0]);

    const vocal = this.ctx.createMediaStreamSource(videoStream);
    vocal.connect(this.delayNode1);
    this.delayNode1.connect(this.gainNode1);
    // vocal.connect(this.gainNode1);
    this.gainNode1.connect(dest);

    this.karaoke.connect(this.delayNode2);
    this.delayNode2.connect(this.gainNode2);
    // this.karaoke.connect(this.gainNode2);
    this.gainNode2.connect(dest);

    this.outputStream.addTrack(dest.stream.getAudioTracks()[0]);
    // captured video track and mixed audio
    console.log('outputStream:', this.outputStream.getTracks());

  } // end init()

  async getOutputStream() {
    while (this.outputStream === undefined 
    || this.outputStream.getTracks().length < 2) await sleep(100);

    return this.outputStream;
  }

/*
  start() {
    console.log('mixer start');
    this.video.play();
    this.karaoke.start();
  }
*/

};
