#include <mbed.h> // wait
#include "inc/application.h"

int main()
{
    ApplicationController::initialize();

    while(1) {
        ApplicationController::loop();
        wait(1);
    }

    return 0; // unlikely
}
