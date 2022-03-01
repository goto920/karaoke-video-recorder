/* MediaDevices manipulation */

export async function getAudioCaptureTrack(){

  const constraints = {video: true, 
     audio: {
       autoGainControl: false, 
       echoCancellation: false, noiseSuppression: false
     }}; // video is required
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia(constraints);

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => track.stop());
    let audioTracks = stream.getAudioTracks();

    if (audioTracks.length > 0) return audioTracks[0];
    else return [];

  } catch (err) {
    console.error(err);
    return [];
  }

}

export async function getMonitorTrack(deviceId){

  const audioConstraints = {
    video: false, 
    audio: { deviceId: {exact: deviceId},
          autoGainControl: false, 
          echoCancellation: false, noiseSuppression: false
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

export async function getListOfMediaDevices(){
  const audioInputDevices = [];
  const audioOutputDevices = [];
  const videoInputDevices = [];

  console.log("getListOfMediaDevices() called");

  let tmpStream = null;

  try {

    tmpStream 
      = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    console.log("initial getUserMedia() completed");

    const devices = await navigator.mediaDevices.enumerateDevices(); 
   // console.log("enumerateDevices completed");

   /* Firefox about:config sinkId (disabled(default) to enabled) 
      Use selectAudioOutput if available */

    devices.forEach( (device) => {
      if (device.kind === 'audioinput') {
        audioInputDevices.push({id: device.deviceId, label: device.label})
      } else if (device.kind === 'videoinput') {
        videoInputDevices.push({id: device.deviceId, label: device.label})
      } else if(device.kind === 'audiooutput') {
        audioOutputDevices.push({id: device.deviceId, label: device.label})
      } else console.error( device.kind + ", id: " 
          + device.deviceId, "label: " + device.label);
      // console.log(device.kind, device.label);
    });

    if (tmpStream) tmpStream.getTracks().forEach (track => track.stop()); 

    return {audioInputDevices, videoInputDevices, audioOutputDevices};

  } catch (e) {
    console.error(e);
    return null;
  }

} // end getListOfDevices

export async function getMicTrack(device, autoGain){
  const constraints = {
    video: false,
    audio: {
          deviceId: {exact: device},
          autoGainControl: autoGain, 
          echoCancellation: false, noiseSuppression: false
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const tracks = stream.getAudioTracks();
    return tracks[0];
  } catch (err) {
    console.error(err);
    return null; 
  }
}

export async function getCameraTrack(device){
  const constraints = {
    video: {
      deviceId: {exact: device},
      width: {ideal: 1920},
      height: {ideal: 1080}
    },
    audio: false
  };

  try {
    const stream 
      = await navigator.mediaDevices.getUserMedia(constraints);
    const tracks = stream.getVideoTracks();
    return tracks[0];
  } catch (err) {
    console.error(err);
    return null; 
  }
  
}

/*
https://stackoverflow.com/questions/52263471/how-to-create-a-mediastream-from-a-uploaded-audio-file-or-a-audio-file-url-using
*/

export function audioToMediaStreamTrack(ctx, audio){
//  const ctx = new (window.AudioContext || window.webkitAudioContext) ();
  if (ctx.state === 'suspended') ctx.resume();

  const dest = ctx.createMediaStreamDestination();
  const source = ctx.createMediaElementSource(audio);
  source.connect(dest);

  const tracks = dest.stream.getAudioTracks();

  return tracks[0];
}

/* https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints */
export function showSupportedConstraints(){
  const supported = navigator.mediaDevices.getSupportedConstraints(); 
  console.log(supported);
  return supported;
}

