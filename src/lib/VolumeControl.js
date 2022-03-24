// import {sleep} from './sleep.js';

export default class VolumeControl {

   constructor(audioCtx, mediaElement, initialVolume) {
     // parameters
     this.ctx = audioCtx;
     this.mediaElement = mediaElement;
     this.mediaElement.volume = 1;

     // functions
     this.init = this.init.bind(this);
     this.gainNode = new GainNode(this.ctx, 
        {gain: Math.pow(10, initialVolume/20)});
     this.setVolume = this.setVolume.bind(this); // dB
      
     this.init();
   }

   setVolume(dB){ // in dB
     this.gainNode.gain.value = Math.pow(10, dB/20);
   }

   init(){
    const source = this.ctx.createMediaElementSource(this.mediaElement);
    source.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

  } // end init()

};
