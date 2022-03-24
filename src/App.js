// import logo from './logo.svg';
import React, { useRef, useState } from 'react';
import './App.css';
import asyncModal from 'react-async-modal';
import 'react-responsive-modal/styles.css';

// my libraries
import {sleep} from './lib/sleep.js';
import * as mediaUtils from './lib/mediaDeviceUtils.js';
import StreamRecorder from './lib/StreamRecorder.js';
import exportRecordedBlob from './lib/exportRecordedBlob.js';
import GainAndMeter from './lib/GainAndMeter.js';
// import MixBlobsToStream from './lib/MixBlobsToStream.js';
import SimplePlayback from './lib/SimplePlayback.js';
import packageJSON from '../package.json';
import AvSettingModal from './modal/AvSettingModal.js';
import CaptureAudioModal from './modal/CaptureAudioModal.js';

// https://stackoverflow.com/questions/44360301/web-audio-api-creating-a-peak-meter-with-analysernode

// const showExperimental = false;  // for hiding unimplemented controls
const showExperimental = true;  // for hiding unimplemented controls

asyncModal.setDefaultModalProps({
  showCloseIcon: false,
  style: {
    modal: {
      width: 500
    }
  }
});

// Global constants
const mediaDeviceList = 
     {audioInputDevices: [], videoInputDevices: [], audioOutputDevices: []};

const avSettings = {
  audioInput: undefined,
  videoInput: undefined,
  audioOutput: undefined,
  autoGainControl: false,
  noiseSuppression: false,
  echoCancellation: false,
  audioInputGain: 1.0,
  karaokeFile: undefined
};

const monitorStream = new MediaStream();
let gainAndMeter = undefined;
const captureStream = new MediaStream();
const karaokePlayerAudio = new Audio();
const ctx = new (window.AudioContext || window.webkitAudioContext) ();

const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();


let monitorRecorder = null;
let monitorBlob = null;
let captureRecorder = null;
let captureBlob = null;
let mixBlob = null;
let mixer = undefined;
let mixerRecorder = undefined;
let meterPeakGlobal = -60;
let captureDeviceId = undefined;

/* // default
  const deviceOptions = {
     video: {
       deviceId: null,
       width: {ideal: 1920}, height: {ideal: 1080}
     },
     audio: {
       deviceId: null,
       autoGainControl: false,
       echoCancellation: false,
       noiseSuppression: false
     }
  };
*/

function App() {
  const videoRef = useRef();
  const peakMeter = useRef();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [micGain, setMicGain] = useState(0); // in dB
  const [meterValue, setMeterValue] = useState(-100); 
  const [meterPeak, setMeterPeak] = useState(meterPeakGlobal); 
  const [monitorVolume, setMonitorVolume] = useState(0); // 0 to 1
  const [karaokeVolume, setKaraokeVolume] = useState(0.5); // 0 to 1
  const [mixVocalGain, setMixVocalGain] = useState(0); // dB
  const [mixKaraokeGain, setMixKaraokeGain] = useState(-6); // dB
  const [mixKaraokeDelay, setMixKaraokeDelay] = useState(0); // msec
  const [balance, setbalance] = useState(0.5); // 0 to 1

  const [recordDisabled, setRecordDisabled] = useState(true);
  const [exportDisabled, setExportDisabled] = useState(true);
  const [exportMixDisabled, setExportMixDisabled] = useState(true);

  // references

  async function constructor() { 

    console.log("CONSTRUCTOR");
    setIsInitialized(true);

    console.log('supported', supportedConstraints);

    navigator.mediaDevices.ondevicechange = getMediaDeviceList;

    try {
      await getMediaDeviceList();
      // console.log('mediaDeviceList', mediaDeviceList);
      return;
    } catch (err) {console.error(err);}

  }; // constructor;

  const getMediaDeviceList = async () => {
    const list = await mediaUtils.getMediaDeviceList(mediaDeviceList);
    // console.log('getMediaDeviceList()',list);
    mediaDeviceList.audioInputDevices = list.audioInputDevices;
    mediaDeviceList.videoInputDevices = list.videoInputDevices;
    mediaDeviceList.audioOutputDevices = list.audioOutputDevices;

    return;
  };

  const setMediaDevice = async (command, value) => {
    // console.log('setMediaDevice', command, value);

    if (videoRef.current.srcObject === undefined 
        || videoRef.current.srcObject === null) 
       videoRef.current.srcObject = monitorStream;

    if (command === 'audioinput'){ 
      // console.log('setMediaDevice audioInput', value);
      avSettings.audioInput = value; // audioConstraints
      avSettings.autoGainControl = value.autoGainControl;
      avSettings.noiseSuppression = value.noiseSuppression;
      avSettings.echoCancellation = value.echoCancellation;

    try {

      monitorStream.getAudioTracks().forEach ( track => {
        monitorStream.removeTrack(track);
        track.stop();
      });

      const originalAudioTrack = await mediaUtils.getMicTrack(value);  
      console.log('getMicTrack constraints', 
        originalAudioTrack.getConstraints());

      gainAndMeter = new GainAndMeter(ctx,originalAudioTrack,micGain,
        meterCallback);

      const processedAudioTrack = gainAndMeter.getOutputTrack();
      // console.log('gainAndMeter', processedAudioTrack);
      monitorStream.addTrack(processedAudioTrack);
      videoRef.current.volume = monitorVolume;

      setRecordDisabled(false);

      return;
    } catch(err) {console.log(err);}

      return;
    }

    if (command === 'videoinput'){ 
      try {
        avSettings.videoInput = value; // videoConstraints

        monitorStream.getVideoTracks().forEach ( track => {
          monitorStream.removeTrack(track);
          track.stop();
        });

        monitorStream.addTrack(await mediaUtils.getCameraTrack(value));  

        videoRef.current.volume = monitorVolume;
        setRecordDisabled(false);

        return;

      } catch(err) {console.log(err);}

    }

    if (command === 'audioOutput'){ 
      avSettings.audioOutput = value;

      try { 
        await videoRef.current.setSinkId(value.deviceId);
        await karaokePlayerAudio.setSinkId(value.deviceId);
        return;
      } catch (err) {console.error(err);}
    }

    if (command === 'loadFile'){ 
      avSettings.karaokeFile = value;
      // console.log('karaokeFile', avSettings.karaokeFile);
      setRecordDisabled(false);
      return;
    }

    if (command === 'audioInputGain'){ 
      avSettings.audioInputGain = value;
      return;
    }

    return;
  };

  const openAvSettings = async () => {
    try {
      // console.log('openAvSettings()', mediaDeviceList);
      // console.log('openAvSettings()', avSettings);
      await asyncModal(AvSettingModal, { 
         mediaDeviceList: mediaDeviceList,
         avSettings: avSettings,
         setMediaDevice : setMediaDevice // callback function
      });
    } catch(e) {console.error(e);}
  }; 

  const startRecording = async (event) => {

    //event.preventDefault();

    if (isPlaying) {
      console.log('Recording not possible while playing');
      return;
    }

    if (isRecording) {
      console.log('stop recording');
        karaokePlayerAudio.pause();

      if (monitorRecorder) {
        monitorBlob = await monitorRecorder.stop();
        console.log('monitorBlob', monitorBlob);
      }

      if (monitorBlob !== null)
         setExportDisabled(false);

      setIsRecording(false);
      return;
    } // end stop recording 

 // startRecording
    console.log('start recording');

 // prepare stream

/*
    karaokeStream.getTracks().forEach ( track => {
        karaokeStream.removeTrack(track);
        track.stop();
    });
*/

// set players
   if (avSettings.karaokeFile !== undefined) {
     karaokePlayerAudio.pause(); // no GUI
     karaokePlayerAudio.src = URL.createObjectURL(avSettings.karaokeFile);
     karaokePlayerAudio.volume = karaokeVolume;
   }

// check number of tracks in the streams
    const numMonitorTracks = monitorStream.getTracks().length;

    if (numMonitorTracks === 0) {
      console.log('No tracks to record');
      return;
    }

// set recorders   
    monitorRecorder = null;
    monitorBlob = null; 

    if (numMonitorTracks > 0) {
      monitorRecorder = new StreamRecorder(monitorStream);
      monitorRecorder.start();
    }

    //await sleep(5000);
    karaokePlayerAudio.play();

    setIsRecording(true);
    return;
  };

  const playback = async (event) => {
    if (isRecording) return;

    if (isPlaying) {
      console.log('stop playback mix');
      mixer.stop();
      // mixBlob = await mixerRecorder.stop()
      setIsPlaying(false);
    } else {
      console.log('start playback mix');

      mixer = new SimplePlayback(ctx, videoRef.current, 
              karaokePlayerAudio,monitorBlob,
              avSettings.karaokeFile, mixKaraokeGain);
/*
      setMonitorVolume(videoRef.current.volume); 
      setKaraokeVolume(karaokePlayerAudio.volume); 
*/

/*
      mixer = new MixBlobsToStream(ctx,monitorBlob, avSettings.karaokeFile,
         mixKaraokeDelay,mixVocalGain,mixKaraokeGain);
      const stream = await mixer.getOutputStream();
*/

      /* 
       mixerRecorder = new StreamRecorder(stream);
       mixerRecorder.start();
      */

/*
      videoRef.current.pause(); 
      videoRef.current.src = null
      videoRef.current.srcObject = stream;
      videoRef.current.volume = 1.0;
      videoRef.current.play();
      setMonitorVolume(videoRef.current.volume); 
*/

      setIsPlaying(true);
    }
  };

  const exportFiles = (event) => {
    if (isPlaying || isRecording) return;

    const seconds = Math.floor(Date.now()/1000);
    exportRecordedBlob(monitorBlob, 'monitor_' + seconds);
    // exportRecordedBlob(mixBlob, 'mix_' + seconds);

  };

  const handleVolume = (event) => {
    const name = event.target.name;
    const volume = parseFloat(event.target.value);

    if (name === 'monitorVolume'){
      videoRef.current.volume = volume;
      setMonitorVolume(volume);
    } else if (name === 'karaokeVolume'){
      karaokePlayerAudio.volume = volume;
      setKaraokeVolume(volume);
    }
  };

  const handleMicGain = (event) => {
    const gain = parseFloat(event.target.value);
    setMicGain(gain);
    if (gainAndMeter !== undefined) gainAndMeter.setGain(gain);
  };

  const meterCallback = (peakPowerDB) => {
     setMeterValue(peakPowerDB);   
     if (peakPowerDB > meterPeakGlobal) meterPeakGlobal = peakPowerDB;
     setMeterPeak (meterPeakGlobal);
  };

  const setCaptureDevice = (device) => { captureDeviceId = device; };

  const handleScreenCapture = async (event) => {

    if (event.target.name === 'set'){
      monitorStream.getTracks().forEach(track => track.stop());
      try {
        const track = await mediaUtils.getScreenCaptureAudioTrack(); 
        if (track !== null) { captureStream.addTrack(track); return;}

        console.log('trying monitor audio');
        await asyncModal(CaptureAudioModal, { 
          mediaDeviceList: mediaDeviceList,
          setCaptureDevice : setCaptureDevice // callback function
        });

        if (captureDeviceId) {
          const track = await mediaUtils.getMonitorTrack(captureDeviceId);
          captureStream.addTrack(track);
          captureRecorder = new StreamRecorder(captureStream); 
          return;
        }

      } catch (err) {console.error(err)}
 
      return;
    } // set

    if (event.target.name === 'record'){
      if (!isCapturing) {
        console.log('record capture start');
        try {
          captureRecorder.start(); 
          setIsCapturing(true); return;
        } catch(err) {console.log(err);}

        return; 
      } else {

        console.log('record capture stop');

        if (captureRecorder !== null) {
          captureBlob = await captureRecorder.stop();
          console.log('captureBlob', captureBlob);
          captureRecorder.clearStream();
        }

        setIsCapturing(false);
        return;
      } // isCapturing

    } // record

    if (event.target.name === 'export' && !isCapturing){
      console.log('record export');
      try {
        const seconds = Math.floor(Date.now()/1000);
        exportRecordedBlob(captureBlob, 'capture_' + seconds);
      } catch(err) {console.log(err);}
      return;
    }
    
  }; // handleScreenCapture 

  const handleMixerSettings = (e) => {
    // console.log(e.target.name);

    const name = e.target.name;
    const vg = mixVocalGain;
    const kg = mixKaraokeGain;
    const delay = mixKaraokeDelay;

    switch (name) {
     case 'vocalSub':
       setMixVocalGain(vg - 1);
       if(mixer) mixer.setVocalGain(vg - 1);
     break;
     case 'vocalAdd':
       setMixVocalGain(vg + 1);
       if(mixer) mixer.setVocalGain(vg + 1);
     break;
     case 'karaokeSub':
       setMixKaraokeGain(kg - 1);
       if(mixer) mixer.setKaraokeGain(kg - 1);
     break;
     case 'karaokeAdd':
       setMixKaraokeGain(kg + 1);
       if(mixer) mixer.setKaraokeGain(kg + 1);
     break;
     case 'karaokeDelaySub':
       setMixKaraokeDelay(delay - 1);
       if(mixer) mixer.setKaraokeDelay(delay - 1);
     break;
     case 'karaokeDelayAdd':
       setMixKaraokeDelay(delay + 1);
       if(mixer) mixer.setKaraokeDelay(delay + 1);
     break;
     default:
     break;
    }

  }

  if (!isInitialized) constructor();

  return (
    <div className="App">
    <h2>KG's Karaoke Video Recorder</h2>
    (Need karaoke file?) Screen Audio Capture: &emsp; 
    <button name="set" className="smallButton" 
      onClick={handleScreenCapture}>Set</button> &emsp;
    <button name="record" className="smallButton" 
      onClick={handleScreenCapture}
       style={{backgroundColor: isCapturing ? '#55ff55' : '#eeeeee' }} >
    {isCapturing ? 'Stop' : 'Record'}</button> &emsp;
    <button name="export" className="smallButton"
      onClick={handleScreenCapture}>Export</button> &emsp;
    <hr/>
    <span>
    1) <button className="button"
      name="avSetting" onClick={openAvSettings}>AVSet</button>
    &ensp; 
    2) <button className="button" disabled={recordDisabled}
       name="record" onClick={startRecording} 
       style={{backgroundColor: isRecording ? '#55ff55' : '#eeeeee' }} >
      {isRecording ? 'Stop' : 'Record'}</button>
    &ensp; 
    3 or 6) <button className="button" disabled={exportDisabled}
       name="export" 
       onClick={exportFiles}>Export</button>
    <br/>
Playback:&ensp;
    4) <button className="button" disabled={exportDisabled}
       name="playback" onClick={playback}
       style={{backgroundColor: isPlaying ? '#55ff55' : '#eeeeee' }} >
      {isPlaying ? 'Stop' : 'Play'}</button>
    &ensp;
    5) <button className="button" >Record</button>
    &ensp;
    </span>
    <hr/>
    <div>
     MicGain(dB): &emsp;<input type='range' name='micGain'
         min={-24} max={24} step={1}
         value ={micGain} onChange = {handleMicGain} /> 
       &nbsp;{ micGain >= 0 ? 
          "+" + ('000' + Math.abs(micGain)).slice(-2)
          : "-" + ('000' + Math.abs(micGain)).slice(-2) }<br/>
     &nbsp; <button className='smallButton'
          onClick={(e) => meterPeakGlobal = -60}>Reset</button>
     &nbsp;-36&nbsp;
     <meter ref={peakMeter} min={-36} high={-3} max={10} value={meterValue}
     style={{width: '20%'}}></meter>&nbsp;10, Peak {meterPeak.toFixed(1)}
     <br/>
     Monitor: &emsp;<input type='range' name='monitorVolume'
         min={0} max={1} step={0.01}
         value ={monitorVolume} onChange = {handleVolume} /> 
       &nbsp;{monitorVolume.toFixed(2)}
     &emsp;&emsp;
     Karaoke: &emsp;<input type='range' name='karaokeVolume'
        min={0} max={1} step={0.01}
       value ={karaokeVolume} onChange = {handleVolume} /> 
       &nbsp;{karaokeVolume.toFixed(2)}<br/>
    <hr/>
 {/* 
   <div>
     Mix:&emsp;
     Vocal:&nbsp;
     <span>
     <button name="vocalSub" className="tinyButton"
      onClick={handleMixerSettings} >-</button>
     &nbsp;{mixVocalGain}&nbsp;
     <button name="vocalAdd" className="tinyButton"
      onClick={handleMixerSettings} >+</button>&nbsp;|
     Karaoke:&nbsp;
     <button name="karaokeSub" className="tinyButton"
      onClick={handleMixerSettings} >-</button>
     &nbsp;{mixKaraokeGain}&nbsp;
     <button name="karaokeAdd" className="tinyButton"
      onClick={handleMixerSettings} >+</button>&nbsp;
    | KaraokeDelay:&nbsp;
     <button name="karaokeDelaySub" className="tinyButton"
      onClick={handleMixerSettings} >-</button>
     &nbsp;{mixKaraokeDelay} msec&nbsp;
     <button name="karaokeDelayAdd" className="tinyButton"
      onClick={handleMixerSettings} >+</button>
    </span>
    <hr/>
    </div>
*/}
      <video ref={videoRef} autoPlay 
       playsInline style={{width: '100%'}} />
    </div>

    <hr />

    <div>
    Version: {packageJSON.version} &emsp; 
{/*
    <a href="./guide/index.html" target="_blank" 
         rel="noreferrer">Brief Guide</a>
*/}
    <a href="https://goto920.github.io/demos/karaoke-video-recorder/" 
     target="_blank" rel="noreferrer">
    Manual/Update</a>&nbsp;on goto920.github.io<hr/>
    </div>

    </div>
  );

} // end App()

export default App;
