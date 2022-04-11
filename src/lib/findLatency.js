export default function findRecordingLatency (ctx, clicks, recorded){

  const buffers = [clicks, recorded];
  const msecNS = Math.floor(clicks.sampleRate/1000);
  const power = [new Float32Array(Math.floor(clicks.length/msecNS)), 
                 new Float32Array(Math.floor(recorded.length/msecNS))];
  // console.log('power per samples', msecNS);

  buffers.forEach( (buffer, index) => {
    const mono = new Float32Array(buffer.length);
    if (buffer.numberOfChannels === 1){
      for (let i = 0; i < mono.length; i++){
        const sample = buffer.getChannelData(0); 
        mono[i] = sample[i];
      }
    } else {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < mono.length; i++)
            mono[i] = (left[i] + right[i])/2.0;
    }

    // normalize and mean square
    // const max = Math.max(...mono);
    let max = 0;
    for (let i=0; i < mono.length; i++) if (mono[i] > max) max = mono[i];

    // console.log(max);
    for (let i = 0; i < mono.length; i++) {
      mono[i] /= max;
      power[index][Math.floor(i/msecNS)] += mono[i]*mono[i];
    }

    // take average in the range
    for (let i=0; i < power[index].length; i++) power[index][i] /= msecNS;

  }); // end forEach

  // console.log('normalized power (/msec)', power);

  let max = 0;
  let found = 0;
  const len = Math.min(power[0].length, power[1].length);
  for (let shift = 0; shift < 4000; shift++){ // 200 msec -> 1000
    let sum = 0.0;
    for (let i = 0; shift + i < len; i++)
      sum += power[0][i]*power[1][shift + i];

    if (sum > max) { max = sum; found = shift; } 
  }

  console.log(found, max);
  return found;

}
