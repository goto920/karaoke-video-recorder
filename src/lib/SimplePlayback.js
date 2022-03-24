import {sleep} from './sleep.js';
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
     this.init = this.init.bind(this);
     this.stop = this.stop.bind(this);

     this.init();
   }


   setKaraokeGain(dB){ // dB
   }

   stop(){
     if (this.karaokeAudio) this.karaokeAudio.pause();
     if (this.monitorVideo) this.monitorVideo.pause(); 
   }
  
  async init(){


    this.monitorVideo.pause();
    this.monitorVideo.srcObject = null;
    this.monitorVideo.src = URL.createObjectURL(this.videoBlob);
    this.monitorVideo.load();
    this.monitorVideo.volume = 1.0;

    this.karaokeAudio.pause();
    this.karaokeAudio.srcObject = null;
    this.karaokeAudio.src = URL.createObjectURL(this.karaokeFile);
    this.karaokeAudio.load();
    this.karaokeAudio.volume = 0.5;

    const HAVE_ENOUGH_DATA = 4;

    while (this.monitorVideo.readyState !== HAVE_ENOUGH_DATA 
     || this.karaokeAudio.readyState !== HAVE_ENOUGH_DATA ) 
    await sleep(100);

    const ms = new MediaSync();
    ms.add(this.monitorVideo);
    ms.add(this.karaokeAudio);

    this.monitorVideo.onended = (e) => {
      console.log('monitorVideo ended');
      if (ms !== null) {
        //ms.pause();
        ms.remove(this.monitorVideo);
        //ms = null;
      }
    };
    this.karaokeAudio.onended = (e) => {
      console.log('karaokeAudio ended');
      if (ms !== null) {
        // ms.pause();
        ms.remove(this.karaokeAudio)
        // ms = null;
      }
    };

    ms.play();

  } // end init()

};
