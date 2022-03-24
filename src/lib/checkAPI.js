export default checkAPI () {
// API
  const definitonCheckList = {
    prefix: '', 
    names: [AudioContext, MediaDevices, MediaRecorder]
  };

  const navigatorMediCheckList = {prefix: 'navigator.mediadevices',
   names: [enumerateDevices, getUserMedia]
  }

  let AudioContext = window.AudioContext || window.webkitAudioContext;
  let OfflineAudioContext = window.OfflineAudioContext 
      || window.webkitOfflineAudioContext;

  const audioContextCheckList = {prefix: '',
   names: [AudioContext, OfflineAudioContext, AudioWorkletNode,
           GainNode]
  };

  const ctx = new AudioContext();
  const audioFunctionsCheckList = {prefix: 'ctx',
   names: [audioWorklet, audioWorklet.addModule,
     createMediaStreamDestination,
     createMediaElementSource]
  };
  ctx.close();

  const offlineCtx = new OfflineAudioContext();
  offlineCtx.close();

}
