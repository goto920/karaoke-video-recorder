// import {sleep} from './sleep.js';

export default async function loadAndDecodeAudio(ctx,file) {

  let data = undefined;
  if (typeof file === "object"){
    data = file;
  } else {
    const response = await fetch(file);
    data = await response.blob();
  }

  const reader = new FileReader();
  reader.readAsArrayBuffer(data);

  return new Promise((resolve) => {
      try {
        reader.onload = (e) => {
          ctx.decodeAudioData(
            reader.result,
            (audioBuffer) => resolve(audioBuffer),
            (err) => console.error(err));
        } 
      } catch (err) {console.error(err)}
  });
} 
