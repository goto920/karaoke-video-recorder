/* MediaDevices manipulation */

export async function getMediaDeviceList(currentList){

 let stream = null;
 const current = currentList;

 try {
     if (current.audioInputDevices.length === 0
        && current.videoInputDevices.length === 0
        && current.audioOutputDevices.length === 0 ){
     stream 
       = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
     }


   const newList = await navigator.mediaDevices.enumerateDevices();
   // console.log('device list', newList);

   if (stream){
     stream.getTracks().forEach((track) => track.stop());
     stream = null;
   }

   const audioInputDevices = [];
   const videoInputDevices = [];
   const audioOutputDevices = [];

   newList.forEach( (device) => {

      if (device.kind === 'audioinput') audioInputDevices.push(device);
      else if (device.kind === 'videoinput') videoInputDevices.push(device);
      else if (device.kind === 'audiooutput') audioOutputDevices.push(device);
      else console.error('Unknown: ', device.kind + ", id: " 
          + device.deviceId, "label: " + device.label);

    });

   return {
     audioInputDevices: audioInputDevices,
     videoInputDevices: videoInputDevices,
     audioOutputDevices: audioOutputDevices
   };

 } catch (error) {console.error(error);}

}

export async function getScreenCaptureAudioTrack(){

  const constraints = {video: true, 
     audio: {
       autoGainControl: false, 
       echoCancellation: false, noiseSuppression: false
     }}; 
// video is not used but required to get the stream

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    console.log('capture stream', stream);
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => track.stop());
    let audioTracks = stream.getAudioTracks();

    if (audioTracks.length > 0) return audioTracks[0];
    else return null;

  } catch (err) { console.error(err); }

  return null;
}

export async function getMonitorTrack(deviceId){ // audio only

  const audioConstraints = {
    video: false, 
    audio: { deviceId: {exact: deviceId},
          autoGainControl: false, 
          echoCancellation: false, 
          noiseSuppression: false,
          latency: {ideal: 0}
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    const tracks = stream.getAudioTracks();
    console.log(tracks);
    return tracks[0];
  } catch (e) {
    console.error(e);
    return [];
  }

} // End getMonitorTrack()

export async function getMicTrack(audioConstraints){ // audio

  const ac = audioConstraints;
  ac.channelCount = 2; // stereo
  const constraints = {
    video: false,
    audio: audioConstraints
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getAudioTracks()[0];
    return track;
  } catch (err) {
    console.error(err);
    return null; 
  }
}

export async function getCameraTrack(videoConstraints){

  const constraints = {video: videoConstraints, audio: false};

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream.getVideoTracks()[0];
  } catch (err) { console.error(err); }
 
  return; 
}

/*
https://stackoverflow.com/questions/52263471/how-to-create-a-mediastream-from-a-uploaded-audio-file-or-a-audio-file-url-using
*/

/*
export function audioToMediaStreamTrack(ctx, audio){
//  const ctx = new (window.AudioContext || window.webkitAudioContext) ();
  if (ctx.state === 'suspended') ctx.resume();

  const dest = ctx.createMediaStreamDestination();
  const source = ctx.createMediaElementSource(audio);
  source.connect(dest);

  const tracks = dest.stream.getAudioTracks();

  return tracks[0];
}
*/

/* https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints */
export function showSupportedConstraints(){
  const supported = navigator.mediaDevices.getSupportedConstraints(); 
  console.log(supported);
  return supported;
}

/*
export function switchCameras(track, camera) {
  const constraints = track.getConstraints();
  constraints.facingMode = camera;
  track.applyConstraints(constraints);
}
*/

export function setAudioTrackProperty(track, property, value){
  const constraints = track.getConstraints();

  switch(property){
    case 'autoGainControl':
      constraints.autoGainControl = value;
      break;
    case 'echoCancellation':
      constraints.echoCancellation = value;
      break;
    case 'noiseSuppression':
      constraints.noiseSuppression = value;
      break;
    default:
      console.error(property + ' not defined');
      break;
  }

  track.applyConstraints(constraints);
   
}
