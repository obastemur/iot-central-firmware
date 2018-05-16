// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.

#include "../inc/globals.h"

// Sensors drivers present in the BSP library
#include "stm32l475e_iot01_tsensor.h"
#include "stm32l475e_iot01_hsensor.h"
#include "stm32l475e_iot01_psensor.h"
#include "stm32l475e_iot01_magneto.h"
#include "stm32l475e_iot01_gyro.h"
#include "stm32l475e_iot01_accelero.h"

#include "../inc/sensors.h"

SensorController::~SensorController() { /* noop */ }

void SensorController::initSensors() {
    LOG_VERBOSE("- SensorController::initSensors");
    BSP_TSENSOR_Init();
    BSP_HSENSOR_Init();
    BSP_PSENSOR_Init();

    BSP_MAGNETO_Init();
    BSP_GYRO_Init();
    BSP_ACCELERO_Init();
}

float SensorController::readHumidity() {
    LOG_VERBOSE("- SensorController::readHumidity");

    return BSP_HSENSOR_ReadHumidity();
}

float SensorController::readTemperature() {
    LOG_VERBOSE("- SensorController::readTemperature");

    return BSP_TSENSOR_ReadTemp();
}

float SensorController::readPressure() {
    LOG_VERBOSE("- SensorController::readPressure");

    return BSP_PSENSOR_ReadPressure();
}

void SensorController::readMagnetometer(int16_t *axes) {
    LOG_VERBOSE("- SensorController::readMagnetometer");
    assert(axes != NULL);

    BSP_MAGNETO_GetXYZ(axes);
}

void SensorController::readAccelerometer(int16_t *axes) {
    LOG_VERBOSE("- SensorController::readAccelerometer");
    assert(axes != NULL);

    BSP_ACCELERO_AccGetXYZ(axes);
}

void SensorController::readGyroscope(float *axes) {
    LOG_VERBOSE("- SensorController::readGyroscope");
    assert(axes != NULL);

    BSP_GYRO_GetXYZ(axes);
}

bool SensorController::checkForShake() {
    LOG_VERBOSE("- SensorController::checkForShake");

    // TODO: implement me
    // Board doesn't provide step counter support.
    return false;
}

// RGB LED
void SensorController::setLedColor(uint8_t red, uint8_t green, uint8_t blue) {
    LOG_VERBOSE("- SensorController::setLedColor");
    // TODO: implement me
}

void SensorController::turnLedOff() {
    LOG_VERBOSE("- SensorController::turnLedOff");
    // TODO: implement me
}