// import logo from './logo.svg';
import React, { useRef, useState } from 'react';
import './App.css';
import * as utils from './lib/MediaDevicesUtils.js';
import packageJSON from '../package.json';

function App() {

  /* https://learnreact.in/stream-camera-output-to-a-video-element-in-react */
  const videoRef = useRef();
  const audioRef = useRef();

  const [constructorHasRun, setConstructorHasRun] = useState(false);

  // const [karaokeFile, setKaraokeFile] = useState(false);
  const [audioInputOptions, setAudioInputOptions] = useState([]);
  const [videoInputOptions, setVideoInputOptions] = useState([]);
  const [audioOutputOptions, setAudioOutputOptions] = useState([]);

  const karaokeStream = new MediaStream();
  const monitorStream = new MediaStream();
  const recordStream = new MediaStream();
  const ctx = new (window.AudioContext || window.webkitAudioContext) ();

  const exportData = [];
  const exportData2 = [];
  const karaokeAudio = audioRef.current;
  const monitorVideo = videoRef.current;
  let recorder = null;
  let karaokeRecorder = null;

  function constructor() { 
    if (constructorHasRun) return;
    setConstructorHasRun(true);
    console.log("CONSTRUCTOR");

//  utils.showSupportedConstraints();

    utils.getListOfMediaDevices()
     .then ((deviceList) => { 
       let tmp = [];
       deviceList.audioInputDevices.forEach(device => 
           tmp.push({value: device.id, label: device.label})
       );
       setAudioInputOptions(tmp);

       tmp = [];
       deviceList.videoInputDevices.forEach(device => 
         tmp.push({value: device.id, label: device.label})
       );
       setVideoInputOptions(tmp);

       tmp = []; 
       deviceList.audioOutputDevices.forEach(device => 
         tmp.push({value: device.id, label: device.label})
       );
       setAudioOutputOptions(tmp);
       
     })
     .catch (e => console.error(e));
   
   }; // constructor;


  async function selectVocalInput(e){ 
    if (e.target.value === 'none') return;

    try {
       const track = await utils.getMicTrack(e.target.value)
       recordStream.addTrack(track);
       // console.log(track.getCapabilities());
    } catch (err) {console.error(err);}
  }

  async function selectAudioOutput(e){
    if (e.target.value === 'none') return;
    try {
      karaokeAudio.setSinkId(e.target.value);
    } catch (err) {console.error(err);}
  }

  async function selectVideoInput(e){
    if (e.target.value === 'none') return;
    try {
       const track = await utils.getCameraTrack(e.target.value)
       monitorStream.addTrack(track);
       recordStream.addTrack(track);
       monitorVideo.srcObject = monitorStream;
    } catch (err) {console.error(err);}
  }

  async function karaokeSource(e) {
    if (karaokeStream.getAudioTracks().length > 0) return;

    const track = await utils.getAudioCaptureTrack();

    if (track.langth > 0) {
      karaokeStream.addTrack(track);
      return;
    }
     
    alert ('Display audio is NOT available on this browser. Trying monitor of audio device.');

    let deviceId = null;
    let deviceLabel = null;
    let found = null;

    audioInputOptions.forEach((option) => {
      found = option.label.match(/monitor/i);
      if (found) {
        deviceId = option.value;
        deviceLabel = option.label;
      }
    });
       

    if (!found) {
      alert ('Sorry desktop audio is NOT available for the browser.');
    } else {
      try {
        alert ('Desktop audio unavailable. Trying... ' + deviceLabel);
        const track = await utils.getMonitorTrack(deviceId);
        karaokeStream.addTrack(track);
      } catch (e) {
        alert ('Sorry monitor and mic cannot be used at once on this browser.');
      }
    } 

  } // End karaokeSource()

/* (Ref)
https://stackoverflow.com/questions/52263471/how-to-create-a-mediastream-from-a-uploaded-audio-file-or-a-audio-file-url-using
*/
  function loadFile(e) {
    if (karaokeStream.getAudioTracks().length > 0) return;

    try { 
      karaokeAudio.src = URL.createObjectURL(e.target.files[0]);
      const track = utils.audioToMediaStreamTrack(ctx, karaokeAudio);
      console.log('track', track);
      karaokeStream.addTrack(track);
      monitorStream.addTrack(track); 
      /* does not add track to monitorStream already shown in video element
        but karaoke will not be heard from the monitor without this
      */
    } catch (e) {console.error(e);}

  }
 
  function startRecording(e){

    const videoOptions = {
      audioBitsPerSecond: 128000,
      // videoBitsPerSecond: 128000,
      mimeType: 'video/webm'
    };

    const audioOptions = {
      audioBitsPerSecond: 128000,
      mimeType: 'audio/webm'
    };

    try {
      console.log('Recording tracks: ');
      console.log(recordStream.getTracks());

      recorder = new MediaRecorder(recordStream, videoOptions);
      if (recordStream.active) recorder.start();
        else console.error('recordStream inactive');

      recorder.ondataavailable = function (e) { exportData.push(e.data); }
      recorder.onstop = function(e) {
        console.log('recorder stopped: ' 
          + exportData.length + ' clips');
        // recordStream.getTracks().forEach(track => track.stop());
      }
      recorder.onpause = function(e) {
        console.log('recorder paused');
      }
      recorder.onresume = function(e) {
        console.log('recorder resumed');
      }

    } catch (err) {console.error('recorder: ' + err);}

    try {
      console.log('Karaoke track: ');
      console.log(karaokeStream.getTracks());
      karaokeRecorder = new MediaRecorder(karaokeStream, audioOptions);

      if (karaokeAudio) karaokeAudio.play(); 
        else console.log('karaokeAudio missing');
      if (karaokeStream.active) {
         karaokeRecorder.start() 
      }  else console.error('karaokeStream inactive');

      karaokeRecorder.ondataavailable = function (e) {exportData2.push(e.data);}
      karaokeRecorder.onstop = function(e) {
        console.log('karaokeRecorder stopped: ' 
        // karaokeStream.getTracks().forEach(track => track.stop());
            +  exportData2.length + ' clips');
        karaokeAudio.pause();
      }
      karaokeRecorder.onpause = function(e) {
      }
      karaokeRecorder.onresume = function(e) {
      }

    } catch (err) {console.error('karaokeRecorder: ' + err);}

  }

  function controlRecording(e){ 
    const op = e.target.name; 

    let recorders = [recorder, karaokeRecorder];
    recorders.forEach( r => {
      if(!r) return;
      if (op === 'stop') {
        r.stop(); 
      } else {
        if(r.state === 'recording') r.pause(); 
        else if(r.state === 'paused') r.resume(); 
      }
    });
  }

  function playback(e){
    console.log('Playback exportData[0]: ' + exportData[0].size);
    console.log('Playback exportData2[0]: ' + exportData2[0].size);

    const url = URL.createObjectURL(exportData[0]);
    const url2 = URL.createObjectURL(exportData2[0]);
    const tmp0 = document.createElement('video');
    const tmp1 = document.createElement('audio');
    tmp0.src = url;
    tmp1.src = url2;
    
    var videoStream = null;
    var audioStream = null;
    if (typeof tmp0.captureStream === 'function'){
       videoStream = tmp0.captureStream();
       audioStream = tmp1.captureStream();
    } else if (typeof tmp0.mozCaptureStream === 'function'){
       videoStream = tmp0.mozCaptureStream();
       audioStream = tmp1.mozCaptureStream();
    } else alert('captureStream() unavailable');

 //   console.log (videoStream);
 //   console.log (audioStream);

    const mixedStream 
      = utils.mixStreamsAudio(ctx, videoStream, audioStream);
   
/* 
    monitorVideo.pause();
    monitorVideo.srcObject = null;
    monitorVideo.src = url;
*/

/*
    console.log('Playback exportData2[0]: ' + exportData2[0].size);
    const karaokeAudio = document.createElement("video");
    karaokeAudio.src = URL.createObjectURL(exportData2[0]);
    karaokeAudio.play();
*/
  }

  function exportRecord(e){ 
    console.log('exportData length: ' + exportData.length); 
    console.log('exportData2 length: ' + exportData2.length); 

    for (let i=0; i < exportData.length; i++) {
      console.log('exportData[' + i + '] size: ' + exportData[i].size);
      const saveLink = document.createElement("a");
      saveLink.href = URL.createObjectURL(exportData[i]);
      saveLink.download = "video-export-" + i + ".webm";
      document.body.appendChild(saveLink);
      saveLink.click();
      document.body.removeChild(saveLink);
    }

    for (let i=0; i < exportData2.length; i++) {
      console.log('exportData2[' + i + '] size: ' + exportData2[i].size);
      const saveLink = document.createElement("a");
      saveLink.href = URL.createObjectURL(exportData2[i]);
      saveLink.download = "video-export-2-" + i + ".webm";
      document.body.appendChild(saveLink);
      saveLink.click();
      document.body.removeChild(saveLink);
    }

  }

/* Main flow */
  constructor();

  return (
    <div className="App">
    <h2>KG's Karaoke Video Recorder</h2>
    <hr/>
    <div>
    <b>1) Mic and Camera Input: </b> &emsp;<br/>
    Mic: <select name="vocalInput" onChange={selectVocalInput}>
    <option key="none" value="none" label="Not Selected">none</option>
    {audioInputOptions.map((option) =>
      <option key={option.value} value={option.value} >
      {option.label}</option>)}
    </select> &emsp; <br/>
    Camera: <select name="videoInput" onChange={selectVideoInput}>
    <option key="none" value="none" label="Not Selected">none</option>
    {videoInputOptions.map((option) =>
      <option key={option.value} value={option.value} >
      {option.label}</option>)}
    </select>
    </div><hr/> 
    <div>
     <b>2) Audio output: </b>&emsp;
     <select name="audioOutput" onChange={selectAudioOutput}>
      <option key="none" value="none" label="default">none</option>
     {audioOutputOptions.map((option) =>
      <option key={option.value} value={option.value} >
      {option.label}</option>)}
     </select>
    </div>
    <hr/>
    <div>
     <b>3) Karaoke audio source: </b>&emsp; <br/>
     Local file: <input type="file" name="inputFile" 
          accept="audio/*" onChange={loadFile}/> <br/>
     Screen: <button name="karaokeSource" onClick={karaokeSource}>
     select display/window/tab</button>
    </div>
    <hr/>
    <div>
    <b>3) Record: </b>&emsp;
    <button id="record" name="record" onClick={startRecording}>
      Record</button>&emsp; 
    <button id="pause" name="pauseResume" onClick={controlRecording}>
      pause/resume</button>&emsp; 
    <button id="stop" name="stop" onClick={controlRecording}>
      Stop</button><br/>
    <hr/>
    <b>4) Playback/export: </b>&emsp;
    <button id="play" name="play" onClick={playback}>Playback</button>&emsp; 
    <button id="export" name="export" onClick={exportRecord}>Export</button>&emsp; 
   </div>
   <hr/>
    <div>
    Karaoke audio<br/>
    <audio ref={audioRef} controls /><hr/>
    Video monitor<br />
    <video ref={videoRef} width="360" autoPlay controls />
    </div>
    <hr/>
    Version: {packageJSON.version} &emsp; 
    <a href="guide.html" target="_blank" rel="noreferrer">Brief Guide</a>
    <a href="https://goto920.github.io/" target="_blank" 
     rel="noreferrer"><br/>
    Manual/Update</a>&nbsp;on goto920.github.io<hr/>
    </div>
  );
}

export default App;
