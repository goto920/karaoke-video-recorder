import React, {useCallback, useState} from 'react';

export default function AvSettingModal(props) {
  // read only

  const current = props.mediaDeviceList;
  const currentAv = props.avSettings;
  const setMediaDevice = props.setMediaDevice; // callback

  // states
//  const [isInitialized, setIsInitialized] = useState(false);
  const [audioInput, setAudioInput] 
    = useState(currentAv.audioInput ? 
        currentAv.audioInput.deviceId.exact : 'none');
  const [videoInput, setVideoInput] 
    = useState(currentAv.videoInput ? 
        currentAv.videoInput.deviceId.exact : 'none');
  const [audioOutput, setAudioOutput] 
    = useState(currentAv.audioOutput ? 
      currentAv.audioOutput.deviceId : 'default');
  const [autoGainControl, setAutoGainControl] 
    = useState(currentAv.autoGainControl);
  const [noiseSuppression, setNoiseSuppression] 
    = useState(currentAv.noiseSuppression);
  const [echoCancellation, setEchoCancellation] 
    = useState(currentAv.echoCancellation);
/*
  const [audioInputGain, setAudioInputGain] 
    = useState(currentAv.audioInputGain);
*/

  const handleSelect = useCallback(async (event) => {
    const {name, value} = event.target;

    if (name === 'audioInput') {
      console.log('audioInput', value);

      const audioConstraints = {
        deviceId: {exact: value},
        autoGainControl: autoGainControl,
        noiseSuppression: noiseSuppression,
        echoCancellation: echoCancellation
      };
      setMediaDevice('audioinput',audioConstraints);
      setAudioInput(value);
      return;
    }

    if (name === 'videoInput') {
      console.log('videoInput', value);
      const videoConstraints = {
        deviceId: {exact: value},
        width: {ideal: 1920}, height: {ideal: 1080}};
      setMediaDevice('videoinput',videoConstraints);
      setVideoInput(value);
      return;
    }

    if (name === 'audioOutput') {
      console.log('audioOutput', value);
      const fakeConstraints = {deviceId: value};
      setMediaDevice('audiooutput', fakeConstraints);
      setAudioOutput(value);
      return;
    }
  },[autoGainControl, echoCancellation, noiseSuppression,setMediaDevice]);

  const handleClick = useCallback (async (e) => {
    const {name} = e.target;
    let audioConstraints = {
        deviceId: {exact: audioInput},
        autoGainControl: autoGainControl,
        noiseSuppression: noiseSuppression,
        echoCancellation: echoCancellation
    };

    if (name === 'autoGainControl') {
      audioConstraints.autoGainControl = !audioConstraints.autoGainControl 
      setMediaDevice('audioinput',audioConstraints);
      // setAudioInputGain(1.0);
      setAutoGainControl(!autoGainControl);
      return;
    }

    if (name === 'noiseSuppression') {
      audioConstraints.noiseSuppression = !audioConstraints.noiseSuppression;
      setMediaDevice('audioinput',audioConstraints);
      setNoiseSuppression(!noiseSuppression);
      return;
    }
    if (name === 'echoCancellation') {
      audioConstraints.echoCancellation = !audioConstraints.echoCancellation;
      setMediaDevice('audioinput',audioConstraints);
      setEchoCancellation(!echoCancellation); 
      return;
    }
    return;
  },[audioInput,autoGainControl,noiseSuppression,
     echoCancellation,setMediaDevice]);

  const loadFile = useCallback (async (e) => {
    console.log(e.target.files[0]);
    setMediaDevice('loadFile', e.target.files[0]);
  },[setMediaDevice]);

//  initialize();

  return (
    <div>
      Select at least one of video/audio/karaoke
      <hr/>
      <div>
       <b>VideoInput:</b> &emsp;
       <select name="videoInput" 
          value={videoInput} onChange={handleSelect}>
       <option key='-1' value='none' >None</option>)}
       {current.videoInputDevices.map((device, index) =>
        <option key={index} value={device.deviceId} >{device.label}</option>)}
       </select>
     </div>
     <hr/>
     <div>
      <b>AudioInput:</b> &emsp;
      <select name="audioInput" 
         value={audioInput} onChange={handleSelect}>
      <option key ='-1' value='none'>None</option>
      {current.audioInputDevices.map((device, index) =>
         <option key={index} value={device.deviceId} >{device.label}</option>)}
      </select><br/><br/>
{/*
    Gain: &nbsp; <input type="range" value={audioInputGain} 
      min="0" max="4.0" step="0.01" onChange={handleRange}
     style={{width: '60%'}} />&nbsp; {audioInputGain} <br/><br/>
*/}
    <button name="autoGainControl" 
      style={{backgroundColor: autoGainControl ? '#55ff55' : '#eeeeee' }}
      onClick={handleClick} >AutoGain</button>&emsp;
    <button name="noiseSuppression" 
      style={{backgroundColor: noiseSuppression ? '#55ff55' : '#eeeeee' }}
      onClick={handleClick}>NoiseSuppression</button>&emsp;
    <button name="echoCancellation" 
      style={{backgroundColor: echoCancellation ? '#55ff55' : '#eeeeee' }}
      onClick={handleClick} >EchoCancellation</button><br/><br/>
    </div>
    <hr/>
    <div> 
    <b>Karaoke file:</b>&emsp;
    <input type="file" accept="audio/*" onChange={loadFile} /><br/>
    No file? <br/> 
    Record screen audio in the main menu<br/>
    <font color="red">(May not work on some browsers.)</font>
    </div>
    <hr/>
    <div>
    (option) <b>AudioOutput</b> to external interface<br/><br/>
      <select name="audioOutput" 
        value={audioOutput} onChange={handleSelect}>
        <option key='-1' value='default' >Default</option>)}
      {current.audioOutputDevices.map((device, index) =>
        <option key={index} value={device.deviceId} >{device.label}</option>)}
      </select>
    </div>
    <hr />
    <button name="close" onClick={()=>props.close()} 
      style={{float: 'right'}}>Close</button>&emsp;
    </div>
  );

}