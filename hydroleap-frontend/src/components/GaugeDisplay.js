import ReactSpeedometer from 'react-d3-speedometer';
import "./GaugeDisplay.css";

const GaugeDisplay = ({ label, value, maxValue, unit }) => {
  const showGauge = value !== null && value !== undefined;

  return (
    <div className="gauge-container">
      <p className="gauge-label">{label}</p>
      {showGauge ? (
        <div className="gauge-speedometer">
          <ReactSpeedometer
            maxValue={maxValue}
            value={value}
            segments={6}
            needleColor="#00d4c8"
            startColor="#10b981"
            endColor="#ef4444"
            needleTransitionDuration={800}
            needleTransition="easeElastic"
            textColor="transparent"
            width={260}
            height={155}
            ringWidth={28}
            currentValueText=" "
          />
          <div className="gauge-value-overlay">
            <span className="gauge-value-number">{value}</span>
            {unit && <span className="gauge-value-unit">{unit}</span>}
          </div>
        </div>
      ) : (
        <div className="gauge-na">N/A</div>
      )}
    </div>
  );
};

export default GaugeDisplay;
