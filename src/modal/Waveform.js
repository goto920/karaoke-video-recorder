import React, {useState} from 'react';

export default function Waveform(props) {

  return (
    <div>
    <canvas id="vocal" width="400" height="150"></canvas><br/>
    <canvas id="karaoke" width="400" height="150"></canvas>
    </div>
  );

}
