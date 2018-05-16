// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.

#ifndef DEVICE_H
#define DEVICE_H

#include "globals.h"
#include <DigitalIn.h>

// SINGLETON
class DeviceControl
{
    static DigitalIn button;
    static bool buttonPressed;
    static DeviceState deviceState;

public:
    static bool IsButtonClicked();
    static void incrementDeviceState();
    static DeviceState getDeviceState();
    static void showState();
};

#endif /* DEVICE_H */