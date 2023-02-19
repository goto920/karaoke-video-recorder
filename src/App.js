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
// import VolumeControl from './lib/VolumeControl.js';
import MixBlobsToStream from './lib/MixBlobsToStream.js';
import CaptureStreamFromVideoBlob from './lib/CaptureStreamFromVideoBlob.js';
import packageJSON from '../package.json';
import AvSettingModal from './modal/AvSettingModal.js';
import CaptureAudioModal from './modal/CaptureAudioModal.js';
import estimateLatency from './lib/estimateLatency.js';

// https://stackoverflow.com/questions/44360301/web-audio-api-creating-a-peak-meter-with-analysernode

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
// const monitorAudioStream = new MediaStream();
const captureStream = new MediaStream();
const karaokePlayerAudio = new Audio();
karaokePlayerAudio.id = "karaokePlayerAudio";

const ctx = new (window.AudioContext || window.webkitAudioContext) ();
const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
// const karaokeVolumeCtl = new VolumeControl(ctx, karaokePlayerAudio, -6);

let gainAndMeter = undefined;
let monitorRecorder = null;
let monitorBlob = null;
let captureRecorder = null;
let captureBlob = null;
let mixBlob = null;
let mixer = undefined;
let blobCapture = undefined;
let mixerRecorder = undefined;
let meterPeakGlobal = -60;
let captureDeviceId = undefined;
// let monitorVolumeCtl = undefined;

function App() {

  const videoRef = useRef();
  const peakMeter = useRef();

  const [showCapture, setShowCapture] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [micGain, setMicGain] = useState(0); // in dB
  const [meterValue, setMeterValue] = useState(-100); 
  const [meterPeak, setMeterPeak] = useState(meterPeakGlobal); 
  const [monitorVolume, setMonitorVolume] = useState(-60); // in dB
  const [karaokeVolume, setKaraokeVolume] = useState(-6); // in dB
  const [mixKaraokeDelay, setMixKaraokeDelay] = useState(70); // dB

  const [recordDisabled, setRecordDisabled] = useState(true);
  const [exportDisabled, setExportDisabled] = useState(true);

  // references

  async function constructor() { 

    console.log("CONSTRUCTOR");
    setIsInitialized(true);

    console.log('supported', supportedConstraints);

    asyncModal.setDefaultModalProps({
      showCloseIcon: false, style: { modal: { width: 500 }}});

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
        || videoRef.current.srcObject === null){
       videoRef.current.srcObject = monitorStream;
       videoRef.current.load();
       // videoRef.current.volume = 0;
    //   monitorVolumeCtl = new VolumeControl(ctx, videoRef.current, monitorVolume);
    }

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
      handleVolume ({target: {name: 'monitorVolume', value: -60}})
      monitorStream.addTrack(processedAudioTrack);

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
        setRecordDisabled(false);

        return;

      } catch(err) {console.log(err);}

    }

    if (command === 'audioOutput'){ 
      avSettings.audioOutput = value;
      try { 
        await videoRef.current.setSinkId(value.deviceId);
        await karaokePlayerAudio.setSinkId(value.deviceId);
        console.log('audioOutput', value);
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
      try {
        karaokePlayerAudio.pause();

      if (monitorRecorder) {
        monitorBlob = await monitorRecorder.stop();
        console.log('monitorBlob', monitorBlob);
        monitorRecorder = undefined;
      }

      if (monitorBlob !== null)
         setExportDisabled(false);

      setIsRecording(false);
      return;
      } catch (err) {console.error(err);}
    } // end stop recording 

 // startRecording
    console.log('start recording');

 // prepare stream

// set players
   // console.log('karaokeFile', avSettings.karaokeFile);
   if (avSettings.karaokeFile) {
     karaokePlayerAudio.pause(); // no GUI
     karaokePlayerAudio.src = URL.createObjectURL(avSettings.karaokeFile);
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
      // videoRef.current.volume = 0;
      monitorRecorder = new StreamRecorder(monitorStream);
      await sleep(3000); // 3 sec interval
      monitorRecorder.start();
    }

    if (avSettings.karaokeFile) {
      try {
        karaokePlayerAudio.volume = 1.0;
        await karaokePlayerAudio.play();
      } catch (err) {console.error(err);}
    }

    setIsRecording(true);
    return;
  };


  const playback = async (event) => {
    if (isRecording) return;


/*
    videoRef.current.onended = (event) => {
       console.log("Video ended");
       if (!mixer) return;
       mixer.stop(); mixer = null;
       if (blobCapture) blobCapture.stop();
       blobCapture = null;
       handleVolume ({target: {name: 'monitorVolume', value: -60}})
       videoRef.current.srcObject = monitorStream;
      setIsPlaying(false);
    };
*/

    if (isPlaying) {
      console.log('stop playback mix');

      if (mixer) {
        mixer.stop();
        mixer = null;
        if (blobCapture) blobCapture.stop();
        blobCapture = null;
        // handleVolume ({target: {name: 'monitorVolume', value: -60}})
        videoRef.current.srcObject = monitorStream;
      }

      if(mixerRecorder) {
        mixBlob = await mixerRecorder.stop();
        console.log(mixBlob);
        mixerRecorder = undefined;
      }
      setIsPlaying(false);
    } else {
      console.log('start playback mix');
      if (gainAndMeter) gainAndMeter.setMonitorVolume(-60);

      try {
        videoRef.current.volume = 0;
        videoRef.current.pause();
        videoRef.current.srcObject = null;

        let vocalVolume = -6;

        mixer = new MixBlobsToStream(ctx, monitorBlob, avSettings.karaokeFile, 
           vocalVolume, karaokeVolume);
        await mixer.init();
        handleVolume ({target: {name: 'monitorVolume', value: vocalVolume}})

        const mixerStream = await mixer.getStream();

        blobCapture = new CaptureStreamFromVideoBlob(monitorBlob);
        const videoStream = await blobCapture.getStream();

        const stream = new MediaStream();
        stream.addTrack(videoStream.getVideoTracks()[0]);
        stream.addTrack(mixerStream.getAudioTracks()[0]);
        console.log('mixerStream', stream.getTracks());
        mixerRecorder = new StreamRecorder(stream);

        videoRef.current.srcObject = stream;

      // start audio and video
        mixer.startAt(mixKaraokeDelay); // 1000 msec lead time internally
        blobCapture.start(1000); // 1000 msec lead time

// start monitor player after the stream become active
        try {
          // console.log('playback on monitor');
          await videoRef.current.play();
          // console.log('playback on monitor success');
        } catch (err) {console.error(err);}

        mixerRecorder.start();

      } catch (err) {console.error(err);}

      setIsPlaying(true);
    }

  };

  const exportFiles = (event) => {
    if (isPlaying || isRecording) return;

    // const seconds = Math.floor(Date.now()/1000);
    const now = new Date(Date.now());
    const dateString = now.toISOString();
    // console.log(dateString);

    exportRecordedBlob(monitorBlob, 'monitor_' + dateString);
    exportRecordedBlob(mixBlob, 'mix_' + dateString);

  };

  const handleVolume = (event) => {
    const name = event.target.name;
    const volume = parseFloat(event.target.value);

    if (name === 'monitorVolume'){ // in dB

      if (mixer) { 
        mixer.setVocalGain(volume);
        videoRef.current.muted = false;
        videoRef.current.volume = 1;
        if (gainAndMeter) gainAndMeter.setMonitorVolume(-60);
      } else {
        // videoRef.current.volume = Math.min(1.0,Math.pow(10,volume/20));
        videoRef.current.muted = true;
        // videoRef.current.volume = 0;
        if (gainAndMeter) gainAndMeter.setMonitorVolume(volume);
      }
      setMonitorVolume(volume); // UI

    } else if (name === 'karaokeVolume'){
      if (mixer) {
        mixer.setKaraokeGain(volume);
        setKaraokeVolume(volume); // UI
      } else {
        karaokePlayerAudio.volume = Math.min(1.0,Math.pow(10,volume/20));
        // setKaraokeVolume(Math.min(0,volume)); // UI
        setKaraokeVolume(volume); // UI
      }
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
        if (captureRecorder) {
          console.log('record capture start');
          try {
            if (captureRecorder) captureRecorder.start(); 
            setIsCapturing(true); return;
          } catch(err) {console.log(err);}
        } else console.log('screen capture not ready');

        return; 
      } else {

        console.log('record capture stop');

        if (captureRecorder !== null) {
          captureBlob = await captureRecorder.stop();
          console.log('captureBlob', captureBlob);
          captureRecorder.clearStream();
          captureRecorder = undefined;
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

  const handleDelay = (e) => {
     const delay = parseInt(e.target.value); 
     setMixKaraokeDelay(delay);
     if(mixer) mixer.setKaraokeDelay(delay);
  };

  const handleAutoAdjust = async (e) => {
    const latencyHint = await estimateLatency(ctx,monitorStream,
      karaokePlayerAudio);
    console.log('latencyHint',latencyHint);
    setMixKaraokeDelay(latencyHint); 
  }

  if (!isInitialized) constructor();

  return (
    <div className="App">
    <b>KG's Karaoke Video Recorder</b><br/>
    Need karaoke file?<br/>
    Try screen Audio Capture: &emsp;
    <button onClick={(e) => setShowCapture(!showCapture)}>Show/Hide</button>

  { showCapture &&
    <div>
    <button name="set"
      onClick={handleScreenCapture}>Set</button> &emsp;
    <button name="record"
      onClick={handleScreenCapture}
       style={{backgroundColor: isCapturing ? '#55ff55' : '#eeeeee' }} >
    {isCapturing ? 'Stop' : 'Record'}</button> &emsp;
    <button name="export"
      onClick={handleScreenCapture}>Export</button> &emsp;
    </div>
  }
    <hr/>
    <span>
(Skip 3, if you use a video editor.)<br/>
    1) <button 
      name="avSetting" onClick={openAvSettings}>Set</button>
    &ensp; 
    2) <button disabled={recordDisabled}
       name="record" onClick={startRecording} 
       style={{backgroundColor: isRecording ? '#55ff55' : '#eeeeee' }} >
      {isRecording ? 'Stop' : 'Rec'}</button>
    &ensp; 
    3) <button disabled={exportDisabled}
       name="playback" onClick={playback}
       style={{backgroundColor: isPlaying ? '#55ff55' : '#eeeeee' }} >
      {isPlaying ? 'Stop' : 'Play'}</button>
    &ensp; 
    4) <button disabled={exportDisabled}
       name="export" 
       onClick={exportFiles}>Export</button>
    </span>
    <hr/>
    <div>
     MicGain(dB): &emsp;<input type='range' name='micGain'
         min={-24} max={24} step={1}
         value ={micGain} onChange = {handleMicGain} /> 
       &nbsp;{ micGain >= 0 ? 
          "+" + ('0000' + Math.abs(micGain)).slice(-2)
          : "-" + ('0000' + Math.abs(micGain)).slice(-2) }<br/>
     &nbsp; <button 
          onClick={(e) => meterPeakGlobal = -60}>Reset peak</button>
     &nbsp;&nbsp;-36&nbsp;
     <meter ref={peakMeter} min={-36} high={-3} max={10} value={meterValue}
     style={{width: '20%'}}></meter>&nbsp;10, Peak {meterPeak.toFixed(1)}
     <br/>
     Mon/Vo (dB): &emsp;<input type='range' name='monitorVolume'
         min={-60} max={12} step={0.1}
         value ={monitorVolume} onChange = {handleVolume} /> 
       &nbsp;{monitorVolume.toFixed(4)}
     <br/>
     Karaoke (dB): &emsp;<input type='range' name='karaokeVolume'
        min={-60} max={12} step={0.01}
       value ={karaokeVolume} onChange = {handleVolume} /> 
       &nbsp;{karaokeVolume.toFixed(2)}<br/>
     Playback Compensation (msec): &emsp;<input type='number' name='mixKaraokeDelay'
        min={0} max={1000} step={1} style={{width:"20%"}}
       value ={mixKaraokeDelay} onChange = {handleDelay} /> 
     &emsp;
     <button onClick={handleAutoAdjust}>AutoAdjust</button>
    <hr/>

    <video ref={videoRef} id="monitorVideo" autoPlay
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
     target="_blank" rel="noreferrer"><br/>
    Manual/Update</a>&nbsp;on goto920.github.io<hr/>
    </div>

    </div>
  );

} // end App()

export default App;
