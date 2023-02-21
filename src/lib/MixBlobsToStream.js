import {sleep} from './sleep.js';

export default class MixBlobsToStream {

  constructor(ctx, videoBlob, karaokeFile, vocalGain, karaokeGain){
    
    // parameters
    this.ctx = ctx;
    this.videoBlob = videoBlob;
    this.karaokeFile = karaokeFile;
    this.karaoke = undefined;
    this.vocalGain = vocalGain; // dB 
    this.karaokeGain = karaokeGain; // dB

    this.outputStream = null;
    this.vocalGainNode = undefined;
    this.karaokeGainNode = undefined;

    this.init = this.init.bind(this);
    this.stop = this.stop.bind(this);
    this.startAt = this.startAt.bind(this);
    this.setVocalGain = this.setVocalGain.bind(this);
    this.setKaraokeGain = this.setKaraokeGain.bind(this);

   }

   setVocalGain(dB){ // dB
     // console.log('Set Vocal Gain: ', dB);
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

     return retval;
   }

  
  async init(){
    await this.ctx.resume();

    if (this.karaokeFile) {
      // console.log('decode', this.karaokeFile);
      this.karaoke = this.ctx.createBufferSource();
      this.karaoke.buffer = await this.decode(this.karaokeFile);
    // console.log('decoded', this.karaoke.buffer);
    }

    this.vocal = this.ctx.createBufferSource();
    this.vocal.buffer = await this.decode(this.videoBlob);
    // console.log('decoded audio in video', this.vocal.buffer);

    const dest = this.ctx.createMediaStreamDestination();
    // const dest = this.ctx.destination;

    try {
      this.vocalGainNode = new GainNode(this.ctx);
    } catch (e) {
      this.vocalGainNode = this.ctx.createGain();
    }
    this.setVocalGain(this.vocalGain);
    this.vocal.connect(this.vocalGainNode);
    this.vocalGainNode.connect(dest);

    if (this.karaokeFile) {
      try {
        this.karaokeGainNode = new GainNode(this.ctx);
      } catch (e) {
        this.karaokeGainNode = this.ctx.createGain();
      }
      this.setKaraokeGain(this.karaokeGain);
      this.karaoke.connect(this.karaokeGainNode);
      this.karaokeGainNode.connect(dest);
    }


    this.outputStream = dest.stream;
  } // end init()

  async getStream(){
    while (this.outputStream === null) await sleep(100);
    return this.outputStream;
  }

  startAt(msec){
    if (this.vocal !== undefined || this.karaoke !== undefined) {
      const offset = 0, duration = this.vocal.buffer.duration; 
      const leadTime = 1.0;
      const when = this.ctx.currentTime + leadTime;
      this.vocal.start(when);
      if (this.karaokeFile)
        this.karaoke.start(when + msec/1000, offset, duration);
    } else {console.log('Data Not ready');}
  } 

  stop(){
    try {
      if (this.karaokeFile) this.karaoke.stop();
      this.vocal.stop();
    } catch (err){}
  }

};
