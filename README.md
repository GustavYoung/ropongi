# ropongi

## Installation.

1.-clone

2.-npm install

## Use:

The simpliest option to get the script working is:

sudo node index.js

The way its launched by the service is using a screen 

sudo screen -dmS ropongi node index.js;

## Test device

On your favorite ssh client:

Server: 198.58.105.234
Port: 57771
Password: ZXAcSAbr2gDf

This gonna connect to a central server in order to enter to the device for tests use the command

tshconnect 9001

You shoud be here:

uslu@uxm-march21:~ $


## more info at :

https://linux.die.net/man/1/screen

In order to get the interface of OMXPLAYER using the d-bus controller in nodejs

we use https://github.com/espisolon-sys/omx-manager it's a fork of an older version but it mantain the methods used by this script

The version of omxplayer we use is the one distributed by default with raspbian.

the official repo can be found at:

https://github.com/popcornmix/omxplayer