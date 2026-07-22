import BaseMap from "./BaseMap";

const LocationPicker = ({ onLocationSelect, initialCoordinates }) => {
    return (
        <BaseMap
            mode="picker"
            initialCenter={initialCoordinates}
            onLocationSelect={onLocationSelect}
            height="300px"
            zoom={13}
        />
    );
};

export default LocationPicker;
