import React from 'react';
import './Slider.css';

const Slider = () => {
  return (
    <div className="slider">
      <div className="slider-track">
        <span> Verified, not viral</span>
        <span>•</span>
        <span> Truly independent</span>
        <span>•</span>
        <span> Manifestos that matter</span>
        <span>•</span>

        {/* duplicate for loop */}
        <span> Verified, not viral</span>
        <span>•</span>
        <span> Truly independent</span>
        <span>•</span>
        <span> Manifestos that matter</span>
        <span>•</span>
      </div>
    </div>
  );
};

export default Slider;