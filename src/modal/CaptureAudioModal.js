import React, {useCallback, useState} from 'react';

export default function CaptureAudioModal(props) {
  // read only

  const current = props.mediaDeviceList;
  const setDevice = props.setCaptureDevice; // callback

  const [selectedDevice,setSelectedDevice] = useState('none');

  const handleSelect = useCallback((event) => {
    const {value} = event.target;
    setSelectedDevice(value);
    setDevice(value);
  },[setDevice]);

  return (
    <div>
      Select monitor audio if any
      <hr/>
      <div>
       <select name='select' value={selectedDevice} onChange={handleSelect}>
       <option key='-1' value='none' >None</option>)}
       {current.audioInputDevices.map((device, index) =>
        <option key={index} value={device.deviceId} >{device.label}</option>)}
       </select>
      </div>
    <hr />
    <button name="close" onClick={()=>props.close()} 
      style={{float: 'right'}}>Close</button>&emsp;
    </div>
  );

}
