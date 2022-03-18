// import logo from './logo.svg';
import React, { useRef, useState } from 'react';
import './App.css';
import asyncModal from 'react-async-modal';
import 'react-responsive-modal/styles.css';
// import useAsyncState from './lib/useAsyncState.js';

// my libraries
import {sleep} from './lib/sleep.js';
import * as mediaUtils from './lib/mediaDeviceUtils.js';
import StreamRecorder from './lib/StreamRecorder.js';
import exportRecordedBlob from './lib/exportRecordedBlob.js';
import GainAndMeter from './lib/GainAndMeter.js';
import MixBlobsToStream from './lib/MixBlobsToStream.js';
import packageJSON from '../package.json';
import AvSettingModal from './modal/AvSettingModal.js';
import CaptureAudioModal from './modal/CaptureAudioModal.js';

// https://stackoverflow.com/questions/44360301/web-audio-api-creating-a-peak-meter-with-analysernode

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
const karaokeStream = new MediaStream();
let gainAndMeter = undefined;
const captureStream = new MediaStream();
const karaokeSourceAudio = new Audio();
const karaokePlayerAudio = new Audio();
const ctx = new (window.AudioContext || window.webkitAudioContext) ();

const showPlaybackButtons = false; 

let monitorRecorder = null;
let monitorBlob = null;
let captureRecorder = null;
let captureBlob = null;
let mixBlob = null;
let mixer = undefined;
let mixerRecorder = undefined;
let karaokeRecorder = null;
let karaokeBlob = null;
let meterPeakGlobal = -100;
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
  const [delay, setDelay] = useState(80); // msec
  const [balance, setbalance] = useState(0.5); // 0 to 1

  const [recordDisabled, setRecordDisabled] = useState(true);
  const [exportDisabled, setExportDisabled] = useState(true);
  const [exportMixDisabled, setExportMixDisabled] = useState(true);

  // references

  async function constructor() { 

    console.log("CONSTRUCTOR");
    setIsInitialized(true);

    navigator.mediaDevices.ondevicechange = getMediaDeviceList;

    try {
      await getMediaDeviceList();
      // console.log('mediaDeviceList', mediaDeviceList);
      return;
    } catch (err) {console.error(err);}

  }; // constructor;

  const getMediaDeviceList = async () => {
    const list = await mediaUtils.getMediaDeviceList(mediaDeviceList);
    // console.log('list',list);
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
      videoRef.current.volume = monitorVolume;
      return;
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
        await monitorRecorder.stop();
        monitorBlob = monitorRecorder.getBlob();
        console.log('monitorBlob', monitorBlob);
      }

      if (karaokeRecorder) {
        karaokeSourceAudio.pause();
        await karaokeRecorder.stop();
        karaokeBlob = karaokeRecorder.getBlob();
        karaokeRecorder.clearStream();
        console.log('karaokeBlob', karaokeBlob);
      }

      if (monitorBlob !== null || karaokeBlob !== null)
         setExportDisabled(false);

      setIsRecording(false);
      return;
    } // end stop recording 


 // startRecording
    console.log('start recording');

 // prepare stream

    karaokeStream.getTracks().forEach ( track => {
        karaokeStream.removeTrack(track);
        track.stop();
    });

   if (avSettings.karaokeFile !== undefined) {
     karaokeSourceAudio.pause(); // no GUI
     karaokeSourceAudio.src = URL.createObjectURL(avSettings.karaokeFile);
     karaokeStream.addTrack(
        mediaUtils.audioToMediaStreamTrack(ctx,karaokeSourceAudio));
   }

// set players
    karaokePlayerAudio.srcObject = karaokeStream;
    karaokePlayerAudio.volume = karaokeVolume;

// check number of tracks in the streams
    const numMonitorTracks = monitorStream.getTracks().length;
    const numKaraokeTracks = karaokeStream.getTracks().length;

    if (numMonitorTracks === 0 && numKaraokeTracks === 0) {
      console.log('No tracks to record');
      return;
    }

// set recorders   
    monitorRecorder = null;
    karaokeRecorder = null; 
    monitorBlob = null; karaokeBlob = null;

    if (numMonitorTracks > 0) {
      monitorRecorder = new StreamRecorder(monitorStream);
      monitorRecorder.start();
    }

    if (numKaraokeTracks > 0) {
      karaokeRecorder = new StreamRecorder(karaokeStream);
      karaokeSourceAudio.play();
      karaokePlayerAudio.play();
      karaokeRecorder.start(); 
    }

    setIsRecording(true);
    return;
  };

  const playback = (event) => {
    if (isRecording) return;

    if (isPlaying) {
      console.log('stop playback mix');
      mixer.stop();
       /*
       mixerRecorder.stop()
       while (mixBlob === null){
         await sleep(1000);
         mixBlob = mixerRecorder.getBlob();
       }
      */
      setIsPlaying(false);
    } else {
      console.log('start playback mix');
      mixer = new MixBlobsToStream(ctx,monitorBlob,karaokeBlob,delay,balance);
      const stream = mixer.getOutputStream();

      /* 
       mixerRecorder = new StreamRecorder(stream);
       mixerRecorder.start();
      */

      videoRef.current.pause(); 
      videoRef.current.srcObject = stream;
      videoRef.current.volume = 1.0;
      videoRef.current.play();
      mixer.start();

      setIsPlaying(true);
    }
  };

  const exportFiles = (event) => {
    if (isPlaying || isRecording) return;

    const seconds = Math.floor(Date.now()/1000);
    exportRecordedBlob(monitorBlob, 'monitor_' + seconds);
    exportRecordedBlob(karaokeBlob, 'karaoke_' + seconds);
    exportRecordedBlob(mixBlob, 'mix_' + seconds);

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
        // await getMediaDeviceList();
        captureStream.addTrack(
           await mediaUtils.getScreenCaptureAudioTrack()); 
      } catch(err) {
        console.log('trying monitor audio');
        try {
          await asyncModal(CaptureAudioModal, { 
            mediaDeviceList: mediaDeviceList,
            setCaptureDevice : setCaptureDevice // callback function
          });

          if (captureDeviceId) {
            const track = await mediaUtils.getMonitorTrack(captureDeviceId);
            captureStream.addTrack(track);
          }

        } catch (err) {console.error(err)}
      } // catch
 
      return;
    } // set

    if (event.target.name === 'record'){
      if (!isCapturing) {
        console.log('record capture start');

        if (captureStream.getAudioTracks().length > 0) {
          try {
            captureRecorder = new StreamRecorder(captureStream); 
            captureRecorder.start(); 
            setIsCapturing(true);
            return;
          } catch(err) {console.log(err);}
        }

      } else {

        console.log('record capture stop');
        if (captureRecorder !== null) {
          captureRecorder.stop();
          while (captureBlob === null){
            console.log('trying to get captureBlob');
            await sleep(1000);
            captureBlob = captureRecorder.getBlob();
          }
          captureRecorder.clearStream();
          console.log('captureBlob', captureBlob);
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
    &emsp; 

    2) <button className="button" disabled={recordDisabled}
       name="record" onClick={startRecording} 
       style={{backgroundColor: isRecording ? '#55ff55' : '#eeeeee' }} >
      {isRecording ? 'Stop' : 'Record'}</button>
    &emsp; 
    3) <button className="button" disabled={exportDisabled}
       name="export" 
       onClick={exportFiles}>Export</button>
    &emsp;
    </span>
 { showPlaybackButtons === true &&
   <span>
    4) <button className="button" disabled={exportDisabled}
       name="playback" onClick={playback}
       style={{backgroundColor: isPlaying ? '#55ff55' : '#eeeeee' }} >
      {isPlaying ? 'Stop' : 'Play mix'}</button>
    &emsp; 
    <button className="button" name="exportMix" disabled={exportMixDisabled}
       onClick={exportFiles}>Expt. mix</button>
   </span>
 }
    <hr/>
    <div>
     MicGain: &emsp;<input type='range' name='micGain'
         min='-24' max='24' step='1'
         value ={micGain} onChange = {handleMicGain} /> 
       &nbsp;{ micGain > 0 ? 
          "+" + ('000' + Math.abs(micGain)).slice(-3)
          : "-" + ('000' + Math.abs(micGain)).slice(-3) } (dB) 
     &emsp;
     &emsp; <button onClick={(e) => meterPeakGlobal = -100}>Reset</button>
     &emsp;
     <meter ref={peakMeter} min='-100' high='-3' max='10' value={meterValue}
     style={{width: '20%'}}></meter>&nbsp; {meterPeak.toFixed(1)} (Peak dB)
     <br/>
     Monitor: &emsp;<input type='range' name='monitorVolume'
         min='0.0' max='1.0' step='0.01'
         value ={monitorVolume} onChange = {handleVolume} /> 
       &nbsp;{monitorVolume.toFixed(2)}
     &emsp;&emsp;
     Karaoke: &emsp;<input type='range' name='karaokeVolume'
        min='0.0' max='1.0' step='0.01'
       value ={karaokeVolume} onChange = {handleVolume} /> 
       &nbsp;{karaokeVolume.toFixed(2)}<br/>
    <hr/>
      <video ref={videoRef} autoPlay 
       playsInline style={{width: '100%'}} />
    </div>

    <hr />

    <div>
    Version: {packageJSON.version} &emsp; 
    <a href="./guide/index.html" target="_blank" 
         rel="noreferrer">Brief Guide</a>
    <a href="https://goto920.github.io/demos/karaoke-video-recorder/" 
     target="_blank" rel="noreferrer"><br/>
    Manual/Update</a>&nbsp;on goto920.github.io<hr/>
    </div>

    </div>
  );

} // end App()

export default App;
