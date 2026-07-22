import BaseMap from "./BaseMap";

const PropertyMap = ({ currentProperty, allProperties, radius = 5 }) => {
    return (
        <BaseMap
            mode="property"
            currentProperty={currentProperty}
            properties={allProperties}
            searchRadius={radius}
            height="560px"
            zoom={14}
        />
    );
};

export default PropertyMap;