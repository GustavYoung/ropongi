#!/bin/bash
#Copyright 2019 Gustavo Santana
#(C) Mirai Works LLC
#tput setab [1-7] Set the background colour using ANSI escape
#tput setaf [1-7] Set the foreground colour using ANSI escape
black=`tput setaf 0`
red=`tput setaf 1`
green=`tput setaf 2`
white=`tput setaf 7`
bg_black=`tput setab 0`
bg_red=`tput setab 1`
bg_green=`tput setab 2`
bg_white=`tput setab 7`
ng=`tput bold`
reset=`tput sgr0`
#echo "${red}red text ${green}green text${reset}"


#Variables para carpetas
uxmal2_native='/home/uslu/uxmalstream/streamer/'
uxmal2_mgrtd='/home/uslu/uxmal_2.0/'
target_fix='/home/uslu/uxmalstream/streamer/'
name=$HOSTNAME
place='Homeless'
address='streets'
i_native=0
i_native_ok=0
i_mgrtd=0
i_mgrtd_ok=0

echo "Leyendo configuración" >&2
echo "Limpiando cosas anteriores, desactivando automaticos"
echo "respaldando......"
sudo killall rsync
sudo killall rsync
sudo killall rsync
sudo killall rsync
sudo killall rsync
sudo killall rsync
sudo mkdir /home/uslu/backup_down
sudo cp /home/uslu/gstool/cliente.cfg /home/uslu/backup_down/cliente.cfg
sudo cp /home/uslu/AdsSync/sync.cfg /home/uslu/backup_down/sync.cfg
sudo rm full_reinstall.sh
sudo rm Leinstall.sh
sudo rm -rf AdsSync
sudo rm -rf gstool
sudo rm -rf Llayer_utils
sudo rm -rf adplay-alone
sudo rm -rf adsplayer
sudo rm -rf sponsors
echo "Version ${red}0.7.1 24/02/2021${reset}" >&2
echo "instalando nuevo reproductor."
sudo service ropongi stop;
cd /home/uslu/ropongi/
npm install
sudo cp /home/uslu/ropongi/ropongi /etc/init.d/ropongi;
sudo chmod +x /etc/init.d/ropongi;
sudo update-rc.d ropongi defaults;
sudo systemctl enable ropongi;
sudo service ropongi start;
sleep 10;
sudo screen -S ropongi -X stuff "set passport name $name^M"
sleep 2
sudo screen -S ropongi -X stuff "set passport place $place^M"
sleep 2
sudo screen -S ropongi -X stuff "set passport address $address^M"
sleep 2

#Comprobacion de carpetas 10/09/2020
if [ -d "$uxmal2_mgrtd" ]; then
  echo "App migrada :S"
  cd /home/uslu/uxmal_2.0/uploads/genres/
  for dir in */
  do
  GENRE=$(basename "$dir")
  DIR_TO_CHECK="/home/uslu/uxmal_2.0/uploads/genres/$GENRE"
  PATH_TO_EXCLUDE="/home/uslu/uxmal_2.0/uploads/genres/$GENRE/_playlist.m3u"
  echo 'Agregando nuevo genero'
  mv -v /home/uslu/uxmal_2.0/uploads/genres/$GENRE /home/uslu/ropongi/uploads/genres/$GENRE
  sudo screen -S ropongi -X stuff "add genres $GENRE^M"
  sleep 2
  sudo screen -S ropongi -X stuff "del playlist $GENRE^M"
  sleep 2
  sudo screen -S ropongi -X stuff "make random playlist $GENRE^M"
done
#Comprobacion de Link virtual memorias migradas.
#
#
while [ $i_mgrtd_ok -lt 5 ]
do
  target_fix='/home/uslu/uxmal_2.0/'
  mv /home/uslu/uxmal_2.0/uploads/genres/ads/ad1/* /home/uslu/ropongi/uploads/sharedday/
  i_mgrtd_ok=11
  if [[ "$i_mgrtd_ok" == '11' ]]; then
    break
  fi
done
  clear;
fi
if [ -d "$uxmal2_native" ]; then
  echo "App nativa :)";
  cd /home/uslu/uxmalstream/streamer/uploads/genres/
  for dir in */
  do
  GENRE=$(basename "$dir")
  DIR_TO_CHECK="/home/uslu/uxmalstream/streamer/uploads/genres/$GENRE"
  PATH_TO_EXCLUDE="/home/uslu/uxmalstream/streamer/uploads/genres/$GENRE/_playlist.m3u"
  echo 'Agregando nuevo genero'
  sudo screen -S ropongi -X stuff "add genres $GENRE^M"
  sleep 2
  mv -v /home/uslu/uxmalstream/streamer/uploads/genres/$GENRE/* /home/uslu/ropongi/uploads/genres/$GENRE/
  sleep 2
  sudo screen -S ropongi -X stuff "del playlist $GENRE^M"
  sleep 2
  sudo screen -S ropongi -X stuff "make random playlist $GENRE^M"
done
#Comprobacion de Link virtual memorias migradas.
#
#
while [ $i_native_ok -lt 5 ]
do
  target_fix='/home/uslu/uxmalstream/streamer/uploads'
  mv /home/uslu/uxmalstream/streamer/uploads/ads/ad1/* /home/uslu/ropongi/uploads/sharedday
  i_native_ok=11
  if [[ "$i_native_ok" == '11' ]]; then
    break
  fi
done
  clear;
fi
