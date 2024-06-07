import React from 'react';

const Slider = ({ label, name, value, onChange }) => {
  return (
    <div className="slider-container">
      <label>
        {label}
        <input
          type="range"
          name={name}
          min="0"
          max="100"
          value={value}
          onChange={onChange}
        />
      </label>
    </div>
  );
};

export default Slider;