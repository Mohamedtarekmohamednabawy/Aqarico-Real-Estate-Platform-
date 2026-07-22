import BaseMap from "./BaseMap";

const HeroMap = () => {
    return (
        <BaseMap
            mode="hero"
            properties={[]}
            searchRadius={5}
            height="500px"
            zoom={10}
            isLoading={false}
        />
    );
};

export default HeroMap;
