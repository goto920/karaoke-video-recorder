export default class MixBlobsToStream {

   constructor(ctx, videoBlob, audioBlob, initialDelay, initialBalance){
    
     // parameters
     this.ctx = ctx;
     this.videoBlob = videoBlob;
     this.audioBlob = audioBlob;
     this.delay = initialDelay;
     this.balance = initialBalance; 

     // instance variables
     this.video = undefined;
     this.audio = undefined;
     this.delayNode = undefined;
     this.gainNode1 = undefined;
     this.gainNode2 = undefined;
     this.outputStream = undefined;

     // functions
     this.init = this.init.bind(this);
     this.close = this.close.bind(this);
     this.start = this.start.bind(this);

     this.setKaraokeDelay = this.setKaraokeDelay.bind(this);
     this.setBalance = this.setBalance.bind(this);
     this.getOutputStream = this.getOutputStream.bind(this);

     this.init();
   }

   close(){
     this.video.pause(); this.video = null;
     this.audio.pause(); this.audio = null;
   }

   init(){

     this.video = document.createElement("video");
     this.video.src = URL.createObjectURL(this.videoBlob);
     this.audio = new Audio();
     this.audio.src = URL.createObjectURL(this.audioBlob);
     this.outputStream = new MediaStream();

      let videoStream = undefined;
      try {
         if (this.video.captureStream) 
           videoStream = this.video.captureStream();
         else if (this.vodeo.mozCaptureStream) 
           videoStream = this.video.mozCaptureStream();
         else 
          alert('video.captureStream() is NOT available on this browser');
      } catch (err) {console.error(err);}

      if (videoStream === undefined) return;

      const vocal = this.ctx.createMediaStreamTrackSource(
                   videoStream.getAudioTracks()[0]);
      const karaoke = this.ctx.createMediaElementSource(this.audio);
      const dest = this.ctx.createMediaStreamDestination();

      this.gainNode1 = new GainNode(this.ctx, {gain: this.balance});
      this.gainNode2 = new GainNode(this.ctx, {gain: 1 - this.balance});
      this.delayNode = new DelayNode(this.ctx, {delayTime: this.delay});

      vocal.connect(this.gainNode1);
      this.gainNode1.connect(dest);

      karaoke.connect(this.delayNode);
      this.delayNode.connect(this.gainNode2);
      this.gainNode2.connect(dest);

      this.outputStream.addTrack(videoStream.getVideoTracks()[0]);
      this.outputStream.addTrack(dest.stream.getAudioTracks()[0]);

  } // end init()

  getOutputStream() {return this.outputStream;}

  start() {this.video.play(); this.audio.play();}

  setKaraokeDelay(msec){
    try {
      this.delayNode.delayTime.value = msec/1000; // set in sec
    } catch(e) {console.error(e)}
  }

  setBalance(vocalVol) { /* 0.0 to 1.0 */
   try {
     this.balance = vocalVol;
     this.gainNode1.gain.value = this.balance;
     this.gainNode2.gain.value = (1 - this.balance);
    } catch(e) {console.error(e);}
  }

};
