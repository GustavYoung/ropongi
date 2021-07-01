# ropongi

## Installation.

1.-clone

2.-npm install

## Launch:

The simpliest option to get the script working is:

sudo node index.js

The way its launched by the service is using a screen 

sudo screen -dmS ropongi node index.js;

to access at the screen session use the command:

sudo screen -r ropo

## use:

The first thing to do is set the name place and address of the system

Example:

set passport name Pizza_Joe

set passport place Pizza_Joe_new_mexico

set passport address Fake St. 123 New mexico TX

To check the changes use the command info
### Folders (genres):

To enable a genre and make the directory use the command

add genres name_of_the_genre

the next thing to do is set the tasks of the device:
### Tasks:
These tasks gonna keep playing from 6 am to 11:59 PM of the same day 

set task monday 06:00 monday 23:59
set task tuesday 06:00 tuesday 23:59
set task wednesday 06:00 wednesday 23:59
set task thursday 06:00 thursday 23:59
set task friday 06:00 friday 23:59
set task saturday 06:00 saturday 23:59
set task sunday 06:00 sunday 23:59

The genres scheulde is determined by these lines

set taskgenres monday dia 19:00 noche
set taskgenres tuesday dia 19:00 noche
set taskgenres wednesday dia 19:00 noche
set taskgenres thursday dia 19:00 noche
set taskgenres friday dia 19:00 noche
set taskgenres saturday dia 19:00 noche
set taskgenres sunday dia 19:00 noche


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