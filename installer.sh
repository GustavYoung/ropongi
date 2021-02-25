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
i_native=0
i_native_ok=0
i_mgrtd=0
i_mgrtd_ok=0

echo "Leyendo configuración" >&2
echo "Version ${red}0.7.1 24/02/2021${reset}" >&2
echo "instalando nuevo reproductor."
cd /home/uslu/ropongi/
npm install
sudo cp /home/uslu/ropongi/ropongi /etc/init.d/ropongi;
sudo chmod +x /etc/init.d/ropongi;
sudo update-rc.d ropongi defaults;
sudo systemctl enable ropongi;
sudo service ropongi start;

#Comprobacion de carpetas 10/09/2020
if [ -d "$uxmal2_mgrtd" ]; then
  echo "App migrada :S"
#Comprobacion de Link virtual memorias migradas.
while [ $i_mgrtd_ok -lt 5 ]
do
  target_fix='/home/uslu/uxmal_2.0/'

  
  if [[ "$i_mgrtd_ok" == '11' ]]; then
    break
  fi
done
  clear;
fi
if [ -d "$uxmal2_native" ]; then
  echo "App nativa :)";
  #Comprobacion de Link virtual memorias nativas.
while [ $i_native_ok -lt 5 ]
do
  target_fix='/home/uslu/uxmalstream/streamer/uploads'
  echo "Intentos: $i_native"
  ((i_native++));
  if [ ! -L "${virtual_native}" ]
  then
     echo "%ERROR: El link ${virtual_native} no es valido!" >&2
     echo "Reparando link virtual"
     sudo rm -rf /home/uslu/uxmalstream/streamer/uploads/ads/ad1;
     sudo ln -s /home/uslu/elements/Spots_con_audio/ /home/uslu/uxmalstream/streamer/uploads/ads/ad1;
     else
     echo "Link ad1 Valido!!!";
     i_native_ok=11;
  fi
  if [ ! -L "${lv_imgflot_nat}" ]
  then
     echo "%ERROR: El link ${lv_imgflot_nat} no es valido!" >&2
     echo "Reparando link virtual"
     sudo rm -rf /home/uslu/uxmalstream/streamer/uploads/pngads;
     sudo ln -s /home/uslu/elements/imagenes-flotantes/ /home/uslu/uxmalstream/streamer/uploads/pngads;
     else
     echo "Link imagenes flotantes Valido!!!";
     i_mgrtd_ok=11;
  fi      
  if [ ! -L "${lv_adsflot_nat}" ]
  then
     echo "%ERROR: El link ${lv_adsflot_nat} no es valido!" >&2
     echo "Reparando link virtual"
     sudo rm -rf /home/uslu/uxmalstream/streamer/uploads/floatingads;
     sudo ln -s /home/uslu/elements/Spots_sin_audio/ /home/uslu/uxmalstream/streamer/uploads/floatingads;
     else
     echo "Link imagenes flotantes Valido!!!";
     i_mgrtd_ok=11;
  fi      
  if [[ "$i_native_ok" == '11' ]]; then
    break
  fi
done
  clear;
fi
