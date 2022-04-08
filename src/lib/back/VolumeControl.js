// import {sleep} from './sleep.js';

export default class VolumeControl {

   constructor(audioCtx, mediaElement, initialVolume) {
     // parameters
     this.ctx = audioCtx;
     this.mediaElement = mediaElement;
     this.initialVolume = initialVolume; 

     // functions

     this.init = this.init.bind(this);
     this.setVolume = this.setVolume.bind(this); // dB
     this.stop = this.stop.bind(this); // dB
      
     this.init();
   }

   setVolume(dB){ // in dB
     this.gainNode.gain.value = Math.pow(10, dB/20);
   }

   init(){
     // this.mediaElement.muted = true;

     this.gainNode = new GainNode(this.ctx, 
        {gain: Math.pow(10, this.initialVolume/20)});
     this.source = this.ctx.createMediaElementSource(this.mediaElement);
     this.source.connect(this.gainNode);
     this.gainNode.connect(this.ctx.destination);

   } // end init()

   stop(){
     this.source.stop();
   }

};
