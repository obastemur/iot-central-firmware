// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.

#ifndef SENSORS_H
#define SENSORS_H

class SensorController
{
    void initSensors();
public:
    SensorController() { initSensors(); }
    ~SensorController();

    float readHumidity();
    float readTemperature();
    float readPressure();
    void readMagnetometer(int16_t *axes);
    void readAccelerometer(int16_t *axes);
    void readGyroscope(float *axes);
    bool checkForShake();

    // RGB LED
    void setLedColor(uint8_t red, uint8_t green, uint8_t blue);
    void turnLedOff();
};

#endif /* SENSORS_H */