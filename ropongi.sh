#! /bin/sh
# Starts and stops Ropongiplayer
# /etc/init.d/ropongi
### BEGIN INIT INFO
# Provides:     Ropongi Player
# Required-Start:       $syslog
# Required-Stop:        $syslog
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
# Short-Description:    ropongi
### END INIT INFO
#Load up ropongi when called
case "$1" in

start)
        echo "Starting ropongi Player..."
        cd /home/uslu/ropongi/;
        sudo screen -dmS ropongi node index.js;
;;

stop)
        echo "Stopping ropongi Player..."
        sudo screen -S ropongi -X quit;
;;

restart)
        echo "Restarting ImgPlayer..."
        $0 stop
        $0 start
;;
*)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
esac