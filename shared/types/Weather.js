export var WeatherEnum;
(function (WeatherEnum) {
    WeatherEnum["CLEAR"] = "CLEAR";
    WeatherEnum["RAIN"] = "RAIN";
    WeatherEnum["STORM"] = "STORM";
    WeatherEnum["SNOW"] = "SNOW";
})(WeatherEnum || (WeatherEnum = {}));
export const WeatherIntensity = {
    [WeatherEnum.CLEAR]: 0.02,
    [WeatherEnum.RAIN]: 0.08,
    [WeatherEnum.STORM]: 0.15,
    [WeatherEnum.SNOW]: 0.05
};
