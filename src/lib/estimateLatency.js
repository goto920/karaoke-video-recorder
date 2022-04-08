import {sleep} from './sleep.js';
import StreamRecorder from './StreamRecorder.js';
import clicks from './clicks.mp3';
import findLatency from './findLatency.js';

export default async function estimateLatency(ctx,monitorStream,playbackAudio) {

  const audioTracks = monitorStream.getAudioTracks();
  if (!audioTracks[0].enabled) return -1; // not ready

  const decode = async (file) => { // File or Blob

    // console.log('decode file typeof', typeof file, file);

    let data = undefined;
    if (typeof file === "object"){
      data = file;
    } else {
      const response = await fetch(file);
      data = await response.blob();
    }

    // console.log('data', data);

    const reader = new FileReader();
    let retval = undefined;
    reader.onload = (e) => {
       try {
         ctx.decodeAudioData(reader.result,
            (audioBuffer) => retval = audioBuffer,
            (err) => console.log(err));
       } catch (err) {console.log(err)};
     }

     reader.readAsArrayBuffer(data);

     while (retval === undefined) await sleep(100);

     return retval;
  } // end decode()

  async function playBuffer(audioBuffer){ // for debug
    const dest = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(dest);

    playbackAudio.srcObject = dest.stream;
    await source.start();
    await playbackAudio.play();

    let complete = false;
    source.onended = (event) => {complete = true;};

    while (complete === false) await sleep(100)

    return 0;
  }

/* main program */

  let retval = undefined;
  try { 
    const clickSource = ctx.createBufferSource();
    const clicksAudioBuffer = await decode(clicks);
    clickSource.buffer = clicksAudioBuffer;
    clickSource.connect(ctx.destination);
    const monitorRecorder = new StreamRecorder(monitorStream);

    await sleep(500); // 500 msec interval;
    monitorRecorder.start();
    await clickSource.start();

    clickSource.onended = async (event) => {
      try {
        const monitorBlob = await monitorRecorder.stop();
        const monitorAudioBuffer = await decode(monitorBlob);
        retval = findLatency(ctx,clicksAudioBuffer, monitorAudioBuffer);
        clickSource.buffer = null;
      } catch(err) {console.error(err);}
    }
  } catch (err) {console.error(err);}

  while (retval === undefined) await sleep(100);

  return retval;

};
