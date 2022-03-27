import WAAClock from 'waaclock';
import {sleep} from './sleep.js';

export default class MixBlobsToStream {

  constructor(ctx, videoBlob, karaokeFile, vocalGain, karaokeGain){
    
    // parameters
    this.ctx = ctx;
    this.videoBlob = videoBlob;
    this.karaokeFile = karaokeFile;
    this.vocalGain = vocalGain; // dB 
    this.karaokeGain = karaokeGain; // dB
    this.waaClock = null;
    this.outputStream = null;

    this.init = this.init.bind(this);
    this.stop = this.stop.bind(this);
    this.startAt = this.startAt.bind(this);
    this.setVocalGain = this.setVocalGain.bind(this);
    this.setKaraokeGain = this.setKaraokeGain.bind(this);

    // this.init();

   }

   setVocalGain(dB){ // dB
     // console.log('Vocal Gain: ', dB);
     if(this.vocalGainNode) 
       this.vocalGainNode.gain.value = Math.pow(10,dB/20);
   }

   setKaraokeGain(dB){ // dB
     // console.log('karaoke Gain: ', dB);
     if(this.karaokeGainNode) 
       this.karaokeGainNode.gain.value = Math.pow(10,dB/20);
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
     // console.log('decode() retval', retval);

     return retval;
   }

  
  async init(){
    if (this.waaClock === null) {
      this.waaClock = new WAAClock(this.ctx);
      this.waaClock.start();
    }

    // console.log('decode', this.karaokeFile);
    this.karaoke = this.ctx.createBufferSource();
    this.karaoke.buffer = await this.decode(this.karaokeFile);
    // console.log('decoded', this.karaoke.buffer);

    this.vocal = this.ctx.createBufferSource();
    this.vocal.buffer = await this.decode(this.videoBlob);
    // console.log('decoded audio in video', this.vocal.buffer);

    const dest = this.ctx.createMediaStreamDestination();
    // const dest = this.ctx.destination;

    this.vocalGainNode = new GainNode(this.ctx);
    this.setVocalGain(this.vocalGain);

    this.karaokeGainNode = new GainNode(this.ctx);
    this.setKaraokeGain(this.karaokeGain);

    this.karaoke.connect(this.karaokeGainNode);
    this.karaokeGainNode.connect(dest);

    this.vocal.connect(this.vocalGainNode);
    this.vocalGainNode.connect(dest);

    this.outputStream = dest.stream;
  } // end init()

  async getStream(){
    while (this.outputStream === null) await sleep(100);
    return this.outputStream;
  }

  startAt(msec){
    if (this.vocal !== undefined && this.karaoke !== undefined) {

/*
      this.waaClock.setTimeout((e) => {
         // console.log('vocal start')
         this.vocal.start();
         }, 1.0); 

      this.waaClock.setTimeout((e) => {
         // console.log('karaoke start')
         this.karaoke.start()
         }, 1.0 + msec/1000);
*/

      const offset = 0, duration = this.vocal.buffer.duration; 
      const leadTime = 1.0;
      const when = this.ctx.currentTime + leadTime;
      this.vocal.start(when);
      this.karaoke.start(when + msec/1000, offset, duration);
    } else {console.log('Data Not ready');}
  } 

  stop(){
    try {
      this.karaoke.stop();
      this.vocal.stop();
      this.waaClock.stop();
    } catch (err){}
  }

};
