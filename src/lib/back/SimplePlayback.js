import sleep from './sleep.js';
import {MediaSync} from 'mediasync';

export default class SimplePlayback {

   constructor(ctx, monitorVideo, karaokeAudio, videoBlob, 
      karaokeFile, karaokeGain){
    
     // parameters
     this.ctx = ctx;
     this.monitorVideo = monitorVideo;
     this.karaokeAudio = karaokeAudio;
     this.videoBlob = videoBlob;
     this.karaokeFile = karaokeFile;
     this.karaokeGain = karaokeGain; // dB

     // instance variables
     this.video = undefined;
     this.karaoke = undefined;

     // functions
     this.start = this.start.bind(this);
     this.stop = this.stop.bind(this);

   }

   stop(){

     if (this.karaokeAudio) {
       console.log('karaoke pause()');
       this.karaokeAudio.pause();
       this.karaokeAudio.srcObject = null;
     }

     if (this.monitorVideo) {
       console.log('monitorVideo pause()');
       this.monitorVideo.pause(); 
       this.monitorVideo.srcObject = null;
     }
   }
  
  async start(){

    // this.monitorVideo.pause();
    this.monitorVideo.srcObject = null;
    // this.monitorVideo.src = undefined;
    this.monitorVideo.src = URL.createObjectURL(this.videoBlob);
    this.monitorVideo.load();
    console.log('new video blob loading');
    this.monitorVideo.volume = 1.0;

    // this.karaokeAudio.pause();
    this.karaokeAudio.srcObject = null;
    // this.karaokeAudio.src = undefined;
    this.karaokeAudio.src = URL.createObjectURL(this.karaokeFile);
    this.karaokeAudio.load();
    console.log('new karaoke blob loading');
    this.karaokeAudio.volume = 1.0;

    const HAVE_ENOUGH_DATA = 4;
    while (this.monitorVideo.readyState !== HAVE_ENOUGH_DATA 
     || this.karaokeAudio.readyState !== HAVE_ENOUGH_DATA ) 
    await sleep(100);

    let ms = new MediaSync();
    ms.add(this.monitorVideo);
    ms.add(this.karaokeAudio);

    this.monitorVideo.onended = (e) => {
      console.log('monitorVideo ended');
      finish();
    };

    this.karaokeAudio.onended = (e) => {
      console.log('karaokeAudio ended');
      finish();
    };

    const finish = () => {
      if (ms !== null) {
        // ms.pause();
        ms.remove(this.karaokeAudio);
        ms.remove(this.monitorVideo);
      //  ms = null;
      }
      this.stop();
    };

    ms.play();

/*
    this.monitorVideo.play();
    this.karaokeAudio.play();

    this.karaokeAudio.onended = (e) => {this.monitorVideo.pause();}
    this.monitorVideo.onended = (e) => {this.karaokeAudio.pause();}
*/

  } // end init()

};
