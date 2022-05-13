// https://stackoverflow.com/questions/44360301/web-audio-api-creating-a-peak-meter-with-analysernode

export default class GainAndMeter {
  constructor(ctx,inputTrack,initialGain,callback){
    this.ctx = ctx;
    this.inputTrack = inputTrack;
    this.initialGain = initialGain;
    this.callback = callback;
    // initial
    this.gainNode = undefined;
    this.gain = initialGain;
    this.analyserNode = undefined;
    this.destination = undefined;

    this.setupIOStream = this.setupIOStream.bind(this);
    this.setGain = this.setGain.bind(this);
    this.getOutputTrack = this.getOutputTrack.bind(this);
    this.loop = this.loop.bind(this);

    this.setupIOStream();
  }

  setupIOStream(){

    this.ctx.resume();

    const source = this.ctx.createMediaStreamTrackSource(this.inputTrack);
    this.destination = this.ctx.createMediaStreamDestination();

    this.gainNode = new GainNode(this.ctx);
    this.gainNode.gain.value = Math.pow(10, this.gain/20); // dB

    this.analyserNode = new AnalyserNode(this.ctx, {fftSize: 2048}); 
    // default 2048

    source.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.destination);

    this.loop();
  }

  setGain(gain){
    this.gainNode.gain.value = Math.pow(10,gain/20); // dB
//    console.log('gain set', this.gainNode.gain.value);
  }

  getOutputTrack() { 
    return this.destination.stream.getAudioTracks()[0]; 
  }

  loop(){
    const sampleBuffer = new Float32Array(this.analyserNode.fftSize);

    this.analyserNode.getFloatTimeDomainData(sampleBuffer);
    let peakPower = 0; 
    for (let i=0; i < sampleBuffer.length; i++)
        peakPower = Math.max(sampleBuffer[i]**2, peakPower);

    const peakPowerDB = Math.max(-100, 10*Math.log10(peakPower));

    this.callback(peakPowerDB); // peakPowerDB

    requestAnimationFrame(this.loop);
  } //end loop()
  
};
