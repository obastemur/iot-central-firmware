// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.

#include "../inc/globals.h"
#include "../inc/deviceControl.h"
#include "../inc/sensors.h"

DeviceState DeviceControl::deviceState = NORMAL;
DigitalIn DeviceControl::button(USER_BUTTON);

bool DeviceControl::IsButtonClicked()
{
    return button == 0;
}

void DeviceControl::showState() {
    switch(deviceState) {
        case NORMAL:
            Globals::sensorController.setLedColor(0x00, 0xFF, 0x00);
            break;
        case CAUTION:
            Globals::sensorController.setLedColor(0xFF, 0xC2, 0x00);
            break;
        case DANGER:
            Globals::sensorController.setLedColor(0xFF, 0x00, 0x00);
            break;
        default:
            Globals::sensorController.turnLedOff();
    }
}

DeviceState DeviceControl::getDeviceState() {
    return deviceState;
}

void DeviceControl::incrementDeviceState() {
    deviceState = (DeviceState)((deviceState + 1) % 3);
}