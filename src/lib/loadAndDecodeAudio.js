// import {sleep} from './sleep.js';

export default async function loadAndDecodeAudio(ctx,blob) {

  let data = undefined;
  if (typeof file === "object"){
    data = file;
  } else {
    const response = await fetch(file);
    data = await response.blob();
  }

  const reader = new FileReader();
  reader.readAsArrayBuffer(data);

  let retval = undefined;
  await new Promise((resolve) => {
      try {
        reader.onload = (e) => {
          ctx.decodeAudioData(
            reader.result,
            (audioBuffer) => retval = audioBuffer,
            (err) => console.error(err));
        } 
      } catch (err) {console.error(err)}
  });

  return retval;
} 
