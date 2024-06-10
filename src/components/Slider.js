import React from 'react';
import './styles.css';

const Slider = ({ label, name, value, onChange, minLabel, maxLabel, description }) => {
  return (
    <div className="slider-container">
      <label className="slider-label">
        {label}
      </label>
      <div className="slider-description">
        {description}
      </div>
      <div className="slider-input-container">
        <span className="slider-min">{minLabel}</span>
        <input 
          type="range" 
          name={name} 
          min="0" 
          max="100" 
          value={value} 
          onChange={onChange} 
          className="slider-input"
        />
        <span className="slider-max">{maxLabel}</span>
      </div>
      <div className="slider-value">{value}</div>
    </div>
  );
};

export default Slider;