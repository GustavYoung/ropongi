"use strict";
// @ts-ignore
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ropongi = void 0;
require("colors");
class Ropongi {
    constructor() {
        this._l = require('lodash');
        this.appdirs = ['uploads', 'saves', 'uploads/sharedday', 'logs', 'uploads/genres'];
        this.autoRandomMissingPlaylist = false;
        this.basePath = __dirname + '/..';
        this.configs = { output: 'local', logs: true, debug: true, schedulesType: 'genres', autoShutdown: false };
        this.email = { service: 'gmail', auth: { user: '@@gmail.com', pass: '0' } };
        this.events = require('events');
        this.eventEmitter = new this.events.EventEmitter();
        this.exec = require('child_process').exec;
        this.filetypes = ['mkv', 'mp4', 'mp3', 'avi', 'mpeg'];
        this.fs = require('fs');
        this.genres = [];
        this.http = require('http');
        this.ip = require('ip');
        this.lastGenresPlays = [];
        this.lastPlay = { files: [], currentIndex: 0, directory: '' };
        this.milisLinks = { index: 0, fullCircle: false, links: ['http://worldclockapi.com/api/json/est/now', 'http://currentmillis.com/time/minutes-since-unix-epoch.php'] };
        this.networkInfo = { localIp: null, networkIp: null };
        this.new_rdm_at_end = 1;
        this.nodemailer = require('nodemailer');
        this.omx = require('omx-manager');
        this.omxconfig = { '-o': 'local', '--vol': '0', '-b': false, '-g': true, '--advanced': false, '--no-osd': true, '--no-keys': false, '-M': false, '-w': false };
        this.os = require('os');
        this.outputTypes = ['both', 'hdmi', 'local'];
        this.passport = { name: 'n/a', place: 'n/a', address: 'n/a' };
        this.mailOptions = { from: this.passport.name, to: 'ropongi@ideasign.mx', subject: 'ropongiStream ' + this.passport.name, text: 'no messege' };
        this.playlist = { files: [], currentIndex: 0, path: '', directory: '', mtimeMs: 0 };
        this.q = require('q');
        this.rl = require('readline').createInterface(process.stdin, process.stdout);
        this.rtc = true;
        this.schedule = require('node-schedule');
        this.schedules = [];
        this.schedulesGenres = [[], [], [], [], [], [], []];
        this.schedulesGenresSpliters = [[], [], [], [], [], [], []];
        this.schedulesStart = [];
        this.schedulesStartObject = [];
        this.schedulesStop = [];
        this.schedulesStopObject = [];
        this.schedulesType = ['days', 'genres'];
        this.sharedday = this.basePath + '/uploads/sharedday';
        this.streaming = false;
        this.transporter = this.nodemailer.createTransport(this.email);
        this.util = require('util');
        this.version = '0.7.1';
        this.weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        this.wifiCheck = { status: false, minutes: 10 };
        this.omx.setOmxCommand('/usr/bin/omxplayer');
        this.omx.enableHangingHandler();
        this.omx.on('play', (path) => {
            let pathArray = path.split('/');
            if (!pathArray.length) {
                return;
            }
            // Test por string
            let file = pathArray.pop();
            this.logAndPrint('info', 'playing index: ' + (this.playlist.files.indexOf(file) + 1)
                + '/' + this.playlist.files.length + ' : ' + file + ' in ' + this.playlist.directory + ' folder.');
            this.playNext();
            // Compare playlist
            this.fs.stat(this.playlist.path + '/_playlist.m3u', (error, stats) => {
                if (error) {
                    this.logAndPrint('err', ` ${error.message}`, error);
                }
                else {
                    if (stats.mtimeMs > this.playlist.mtimeMs) {
                        let deferred = this.q.defer();
                        switch (this.configs.schedulesType) {
                            case 'days':
                                this.loadPlayList(this.updateDay().name);
                                break;
                            case 'genres':
                                this.loadGenresPlayList(this.updateDay().name);
                                break;
                            default:
                                deferred.reject(new Error('missing tasks type in configs'));
                                break;
                        }
                    }
                }
            });
            setTimeout(() => {
                this.killOmxplayerDuplicates();
            }, 200);
        });
        this.omx.on('stderr', (err) => {
            this.logAndPrint('err', 'omxplayer error: ' + err.message, err);
        });
        this.rl.on('line', (line) => {
            let arr;
            this.logInput(line);
            switch (line.trim().split(' ')[0]) {
                case 'mail':
                    this.sendMail();
                    break;
                case 'help':
                    this.printHelp();
                    break;
                case 'stop':
                    this.stopPlay().then((data) => {
                        this.logAndPrint('pass', data.message);
                    });
                    break;
                case 'skip':
                    this.skipPlay(line.trim().split(' ')[1]);
                    break;
                case 'start':
                    this.playIfPlayTime().then(() => {
                        this.logAndPrint('pass', 'starting stream.');
                    }, (err) => {
                        this.logAndPrint('err', err.message, err);
                    });
                    break;
                case 'tasks':
                    this.displaySchedules();
                    break;
                case 'genres':
                    this.printGenres();
                    break;
                case 'info':
                    this.currentStatus();
                    break;
                case 'update':
                    switch (line.trim().split(' ')[1]) {
                        case 'time':
                            this.setTime();
                            break;
                        default:
                            this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'make':
                    switch (line.trim().split(' ')[1]) {
                        case 'playlist':
                            arr = line.trim().split(' ').slice(2);
                            if (arr.length > 0 && arr.length < 3)
                                this.createPlayListSwitch(arr, false, false);
                            else
                                this.logAndPrint('fail', 'input must be 1 parameter.');
                            break;
                        case 'playlist+shared':
                            arr = line.trim().split(' ').slice(2);
                            if (arr.length > 0 && arr.length < 3)
                                this.createPlayListSwitch(arr, false, true);
                            else
                                this.logAndPrint('fail', 'input must be 1 parameter.');
                            break;
                        case 'random':
                            switch (line.trim().split(' ')[2]) {
                                case 'playlist':
                                    arr = line.trim().split(' ').slice(3);
                                    if (arr.length > 0 && arr.length < 3)
                                        this.createPlayListSwitch(arr, true, false);
                                    else
                                        this.logAndPrint('fail', 'input must be 1 parameter.');
                                    break;
                            }
                            break;
                        case 'random+shared':
                            switch (line.trim().split(' ')[2]) {
                                case 'playlist':
                                    arr = line.trim().split(' ').slice(3);
                                    if (arr.length > 0 && arr.length < 3)
                                        this.createPlayListSwitch(arr, true, true);
                                    else
                                        this.logAndPrint('fail', 'input must be 1 parameter.');
                                    break;
                            }
                            break;
                        default:
                            this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'add':
                    switch (line.trim().split(' ')[1]) {
                        case 'genres':
                            arr = line.trim().split(' ').slice(2);
                            this.addGenres(arr);
                            break;
                        default:
                            this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'del':
                    switch (line.trim().split(' ')[1]) {
                        case 'genres':
                            arr = line.trim().split(' ').slice(2);
                            this.delGenres(arr);
                            break;
                        case 'playlist':
                            arr = line.trim().split(' ').slice(2);
                            this.delPlayListSwitch(arr);
                            break;
                        case 'task':
                            arr = line.trim().split(' ').slice(2);
                            if (arr.length === 1)
                                this.delSchedule(arr[0]);
                            else
                                this.logAndPrint('fail', 'input must be 1 parameter.');
                            break;
                        default:
                            this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'set':
                    switch (line.trim().split(' ')[1]) {
                        case 'time': {
                            let data = line.trim().split(' ').slice(2)[0];
                            if ((data === null || data === void 0 ? void 0 : data.toString().length) === 13) {
                                this.setTimeManual(data);
                            }
                            else
                                this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                        }
                        case 'email':
                            {
                                let arr = line.trim().split(' ').slice(2);
                                if (arr.length === 2)
                                    this.setEmail(arr[0], arr[1]);
                                else
                                    this.logAndPrint('fail', 'input must be 2 parameters (email pass).'.bold);
                                break;
                            }
                        case 'task':
                            {
                                let arr = line.trim().split(' ').slice(2);
                                if (arr.length < 3 || arr.length > 4) {
                                    this.logAndPrint('fail', 'input must be 3 or 4 parameters.'.bold);
                                    break;
                                }
                                this.addSchedule(...arr);
                                break;
                            }
                        case 'taskgenres':
                            let day = line.trim().split(' ')[2];
                            let arr = line.trim().split(' ').slice(3);
                            this.setScheduleGenres(day, arr);
                            break;
                        case 'passport':
                            {
                                let field = line.trim().split(' ')[2], data = line.trim().split(' ').slice(3).join(' ');
                                switch (field) {
                                    case 'name':
                                        this.setPassport(field, data);
                                        break;
                                    case 'place':
                                        this.setPassport(field, data);
                                        break;
                                    case 'address':
                                        this.setPassport(field, data);
                                        break;
                                    default:
                                        this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                                        break;
                                }
                                break;
                            }
                        case 'output':
                            {
                                let data = line.trim().split(' ').slice(2)[0];
                                if (!this.setConfigs('output', data))
                                    this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                                break;
                            }
                        case 'wificheck':
                            {
                                let field = line.trim().split(' ')[2], data = parseInt(line.trim().split(' ').slice(3).join(' '));
                                switch (field) {
                                    case 'on':
                                        this.setWifiCheck(true, data);
                                        break;
                                    case 'off':
                                        this.setWifiCheck(false);
                                        break;
                                    default:
                                        this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                                        break;
                                }
                                break;
                            }
                        case 'autoshutdown':
                            let field = line.trim().split(' ')[2];
                            switch (field) {
                                case 'on':
                                    this.setAutoShutdown(true);
                                    break;
                                case 'off':
                                    this.setAutoShutdown(false);
                                    break;
                                default:
                                    this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                                    break;
                            }
                            break;
                        case 'logs':
                            {
                                let field = line.trim().split(' ')[2];
                                switch (field) {
                                    case 'on':
                                        this.setLogs(true);
                                        break;
                                    case 'off':
                                        this.setLogs(false);
                                        break;
                                }
                                break;
                            }
                        case 'debug':
                            {
                                let field = line.trim().split(' ')[2];
                                switch (field) {
                                    case 'on':
                                        this.setDebug(true);
                                        break;
                                    case 'off':
                                        this.setDebug(false);
                                        break;
                                }
                                break;
                            }
                        case 'taskstype':
                            {
                                let field = line.trim().split(' ')[2];
                                switch (field) {
                                    case 'days':
                                        this.setSchedulesType(field);
                                        break;
                                    case 'genres':
                                        this.setSchedulesType(field);
                                        break;
                                    default:
                                        this.logAndPrint('fail', line.trim() + ' bad command, schedules type can be days or genres.');
                                        break;
                                }
                                break;
                            }
                        default:
                            this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                default:
                    this.logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
            }
        });
    }
    chmodRAll() {
        this.exec('sudo chmod -R 777 *');
    }
    checkWifi() {
        this.exec('sudo ifconfig wlan0', (error, stdout, stderr) => {
            if (error) {
                this.logAndPrint('err', `exec error: ${error}`, error);
            }
            if (stderr) {
                this.logAndPrint('fail', `stderr on checkWifi ifconfig: ${stderr}`);
            }
            if (stdout && stdout.indexOf('inet addr:') === -1) {
                this.exec('sudo ifdown --force wlan0', (error, stdout, stderr) => {
                    if (error) {
                        this.logAndPrint('err', `exec error: ${error}`, error);
                        return;
                    }
                    if (stderr) {
                        this.logAndPrint('fail', `stderr on checkWifi ifdown: ${stderr}`);
                    }
                    setTimeout(() => {
                        this.exec('sudo ifup --force wlan0', (error, stdout, stderr) => {
                            if (error) {
                                this.logAndPrint('err', `exec error: ${error}`, error);
                                return;
                            }
                            if (stderr) {
                                this.logAndPrint('fail', `stderr on checkWifi force wlan0: ${stderr}`);
                            }
                            this.logAndPrint('pass', 'wifi restarted.');
                        });
                    }, 5 * 1000);
                });
            }
        });
    }
    updateToRTC(cb) {
        if (this.rtc) {
            this.exec('sudo hwclock -w', (err, stdout, stderr) => {
                if (stderr) {
                    this.logAndPrint('fail', `stderr on updateToRTC hwclock: ${stderr}`);
                }
                if (err) {
                    this.logAndPrint('err', `RTC couldnt be updated from system time, RTC error: ${err}`, err);
                }
                else {
                    this.logAndPrint('info', 'RTC updated from system clock: ' + new Date());
                }
                if (cb) {
                    cb(err);
                }
            });
        }
        else {
            if (cb)
                cb('no RTC available');
        }
    }
    updateFromRTC(cb) {
        if (this.rtc) {
            this.exec('sudo hwclock -s', (err, stdout, stderr) => {
                if (stderr) {
                    this.logAndPrint('fail', `stderr updateFromRTC hwclock: ${stderr}`);
                }
                if (err) {
                    this.logAndPrint('err', `RTC couldnt be updated from system time, RTC error: ${err}`, err);
                }
                else {
                    this.logAndPrint('info', 'system clock updated from RTC: ' + new Date());
                }
                if (cb) {
                    cb(err);
                }
            });
        }
        else {
            if (cb)
                cb('no RTC available');
        }
    }
    enableRTC() {
        let deferred = this.q.defer();
        this.exec('sudo hwclock -r', (err, stdout, stderr) => {
            if (stderr) {
                this.logAndPrint('fail', `stderr on enableRTC: ${stderr}`);
            }
            this.rtc = (!err || (err && err.code == '1')) ? true : false;
            if (this.rtc) {
                deferred.resolve();
            }
            else {
                this.logAndPrint('err', `exec error: ${err}`, err);
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
    isJsonObject(data) {
        let object;
        try {
            object = JSON.parse(data);
        }
        catch (e) {
            return false;
        }
        return (typeof object === 'object');
    }
    resetMilisLinks() {
        this.milisLinks.index = 0;
        this.milisLinks.fullCircle = false;
    }
    setTimeManual(millis) {
        if (millis && millis.toString().length === 13) {
            clearTimeout(this.setTimeTimeout);
            this.exec('sudo date --set="' + new Date(parseInt(millis)) + '"', (err, stdout, stderr) => {
                if (err) {
                    this.logAndPrint('err', `exec err: ${err}`, err);
                    return;
                }
                if (stderr) {
                    this.logAndPrint('fail', `stderr on setTimeManual date --set: ${stderr}`);
                }
                if (stdout) {
                    this.logAndPrint('info', 'time set to: ' + new Date());
                    this.updateToRTC((err) => {
                        if (err) {
                            if (typeof err == 'string') {
                                this.logAndPrint('fail', `stderr on setTimeManual updateToRTC: ${err}`);
                            }
                            else {
                                this.logAndPrint('err', `exec error: ${err}`, err);
                            }
                        }
                    });
                    this.eventEmitter.emit('timeSet');
                    this.resetMilisLinks();
                }
            });
        }
    }
    setTimeProxy() {
        this.logAndPrint('info', 'attempt to load time from: ' + this.milisLinks.links[this.milisLinks.index].split('/')[2]);
        let proxy = {
            hostname: '192.168.200.2',
            port: 1111,
            path: this.milisLinks.links[this.milisLinks.index]
        };
        this.http.get(proxy, (res) => {
            let stringData = '';
            res.on("data", (rdata) => {
                stringData += rdata;
            });
            res.on('end', () => {
                let millis = this.getMillis(stringData);
                if (millis) {
                    this.exec('sudo date --set="' + new Date(millis) + '"', (err, stdout, stderr) => {
                        if (err) {
                            this.logAndPrint('err', `exec err: ${err}`, err);
                            return;
                        }
                        if (stderr) {
                            this.logAndPrint('fail', `stderr on setTimeProxy date --set: ${stderr}`);
                        }
                        if (stdout) {
                            this.logAndPrint('info', 'time set to: ' + new Date());
                            this.updateToRTC((err) => {
                                if (err) {
                                    if (typeof err == 'string') {
                                        this.logAndPrint('fail', `stderr on setTimeProxy updateToRTC: ${err}`);
                                    }
                                    else {
                                        this.logAndPrint('err', `exec error: ${err}`, err);
                                    }
                                }
                            });
                            this.eventEmitter.emit('timeSet');
                            this.resetMilisLinks();
                        }
                    });
                }
                else {
                    this.logAndPrint('warningInfo', 'time not set, bad response from millis server: ' + this.milisLinks.links[this.milisLinks.index]);
                    this.updateFromRTC((err) => {
                        if (err) {
                            if (typeof err == 'string') {
                                this.logAndPrint('fail', `stderr  on setTimeProxy updateFromRTC: ${err}`);
                            }
                            else {
                                this.logAndPrint('err', `exec error: ${err}`, err);
                            }
                            this.eventEmitter.emit('timeNotSet', {
                                msg: 'bad response from ' + this.milisLinks.links[this.milisLinks.index],
                                code: 0
                            });
                        }
                        else {
                            this.eventEmitter.emit('timeSet');
                            this.resetMilisLinks();
                        }
                    });
                }
            });
        }).on('error', (err) => {
            this.logAndPrint('warningInfo', 'time not set, no response from millis server: ' + this.milisLinks.links[this.milisLinks.index]);
            this.updateFromRTC((err) => {
                if (err) {
                    if (typeof err == 'string') {
                        this.logAndPrint('fail', `stderr on setTimeProxy updateFromRTC: ${err}`);
                    }
                    else {
                        this.logAndPrint('err', `exec error: ${err}`, err);
                    }
                    this.eventEmitter.emit('timeNotSet', {
                        msg: 'no response from ' + this.milisLinks.links[this.milisLinks.index],
                        code: 1
                    });
                }
                else {
                    this.eventEmitter.emit('timeSet');
                    this.resetMilisLinks();
                }
            });
        });
    }
    setTime() {
        this.logAndPrint('info', 'attempt to load time from: ' + this.milisLinks.links[this.milisLinks.index].split('/')[2]);
        this.http.get(this.milisLinks.links[this.milisLinks.index], (res) => {
            let stringData = "";
            res.on("data", (data) => {
                stringData += data;
            });
            res.on('close', () => {
                let millis = this.getMillis(stringData);
                if (millis) {
                    this.exec('sudo date --set="' + new Date(millis) + '"', (err, stdout, stderr) => {
                        if (err) {
                            this.logAndPrint('err', `exec err: ${err}`, err);
                        }
                        if (stderr) {
                            this.logAndPrint('fail', `stderr on setTime date --set: ${stderr}`);
                        }
                        if (stdout) {
                            this.logAndPrint('info', 'time set to: ' + new Date());
                            this.updateToRTC((err) => {
                                if (err) {
                                    if (typeof err == 'string') {
                                        this.logAndPrint('fail', `stderr on setTime updateToRTC: ${err}`);
                                    }
                                    else {
                                        this.logAndPrint('err', `exec error: ${err}`, err);
                                    }
                                }
                            });
                            this.eventEmitter.emit('timeSet');
                            this.resetMilisLinks();
                        }
                    });
                }
                else {
                    this.logAndPrint('warningInfo', 'time not set, bad response from millis server: ' + this.milisLinks.links[this.milisLinks.index]);
                    this.updateFromRTC((err) => {
                        if (err) {
                            if (typeof err == 'string') {
                                this.logAndPrint('fail', `stderr on setTime updateToRTC: ${err}`);
                            }
                            else {
                                this.logAndPrint('err', `exec error: ${err}`, err);
                            }
                            this.eventEmitter.emit('timeNotSet', {
                                msg: 'bad response from ' + this.milisLinks.links[this.milisLinks.index],
                                code: 0
                            });
                        }
                        else {
                            this.eventEmitter.emit('timeSet');
                            this.resetMilisLinks();
                        }
                    });
                }
            });
        }).on('error', (err) => {
            this.logAndPrint('err', 'time not set, no response from millis server: ' + this.milisLinks.links[this.milisLinks.index], err);
            this.updateFromRTC((err) => {
                if (err) {
                    if (typeof err == 'string') {
                        this.logAndPrint('fail', `stderr on setTime updateToRTC: ${err}`);
                    }
                    else {
                        this.logAndPrint('err', `exec error: ${err}`, err);
                    }
                    this.eventEmitter.emit('timeNotSet', {
                        msg: 'no response from ' + this.milisLinks.links[this.milisLinks.index],
                        code: 1
                    });
                }
                else {
                    this.eventEmitter.emit('timeSet');
                    this.resetMilisLinks();
                }
            });
        });
    }
    logError(data) {
        let path = this.basePath + '/logs', fileName = 'omxplayer_errors.log';
        if (this.configs.logs) {
            this.fs.appendFile(path + '/' + fileName, '(' + this.getDate() + ' - ' + this.getTime() + ') ' + 'command: ' + data + '\n', (err) => {
                if (err)
                    console.log('info: '.red + '(' + this.getTime() + ') ' + 'failing to write log, ' + err);
            });
        }
    }
    logInput(input) {
        let path = this.basePath + '/logs', fileName = this.getDate() + '.log';
        if (this.configs.logs)
            this.fs.appendFile(path + '/' + fileName, 'command: ' + input + '\n', (err) => {
                if (err)
                    console.log('info: '.red + '(' + this.getTime() + ') ' + 'failing to write log, ' + err);
            });
    }
    logAndPrint(type, output, err = null) {
        var _a;
        if (type === 'pass') {
            console.log('pass: '.green + '(' + this.getTime() + ') ' + output);
        }
        else if (type === 'passInfo') {
            console.log('pass: '.cyan + '(' + this.getTime() + ') ' + output);
        }
        else if (type === 'info') {
            console.log('info: '.cyan + '(' + this.getTime() + ') ' + output);
        }
        else if (type === 'warningInfo') {
            console.log('info: '.red + '(' + this.getTime() + ') ' + output);
            if (this.configs.debug) {
                console.trace();
            }
        }
        else if (type === 'fail') {
            console.log('fail: '.red + '(' + this.getTime() + ') ' + output);
            this.logError('fail: ' + output);
            if (this.configs.debug) {
                console.trace();
            }
        }
        else if (type === 'err') {
            console.log('err: '.red + '(' + this.getTime() + ') ' + output);
            this.logError('err: ' + output);
            if (this.configs.debug) {
                console.error(err);
                console.trace();
                this.logError((_a = err === null || err === void 0 ? void 0 : err.stack) !== null && _a !== void 0 ? _a : '');
            }
        }
        const path = this.basePath + '/logs';
        const fileName = this.getDate() + '.log';
        if (this.configs.logs) {
            this.fs.appendFile(path + '/' + fileName, type + ': (' + this.getTime() + ') ' + output + '\n', (err) => {
                if (err) {
                    console.log('err: '.red + '(' + this.getTime() + ') ' + 'failing to write log, ' + err.message);
                    console.error(err);
                }
            });
        }
    }
    saveWifiCheck() {
        return !!this.fs.writeFileSync(this.basePath + '/saves/wificheck.json', JSON.stringify(this.wifiCheck));
    }
    saveConfigs() {
        return !!this.fs.writeFileSync(this.basePath + '/saves/configs.json', JSON.stringify(this.configs));
    }
    savePassport() {
        return !!this.fs.writeFileSync(this.basePath + '/saves/passport.json', JSON.stringify(this.passport));
    }
    saveEmail() {
        return !!this.fs.writeFileSync(this.basePath + '/saves/email.json', JSON.stringify(this.email));
    }
    saveGenres() {
        return !!this.fs.writeFileSync(this.basePath + '/saves/genres.json', JSON.stringify(this.genres));
    }
    addGenres(genresArr) {
        let addedGenres = '';
        for (let i in genresArr) {
            genresArr[i] = genresArr[i].toLowerCase();
            if (this.genres.indexOf(genresArr[i]) === -1 && genresArr[i] !== 'all') {
                addedGenres += genresArr[i] + ' ';
                this.genres.push(genresArr[i]);
                if (!this.fs.existsSync(this.basePath + '/uploads/genres/' + genresArr[i])) {
                    this.fs.mkdirSync(this.basePath + '/uploads/genres/' + genresArr[i]);
                }
            }
        }
        this.chmodRAll();
        this.saveGenres();
        addedGenres.trim();
        if (addedGenres.length !== 0)
            this.logAndPrint('pass', 'new genres: ' + addedGenres);
        else
            this.logAndPrint('pass', 'no new genres added.');
    }
    isUsedGenre(genre) {
        for (let i in this.schedulesGenres)
            if (this.schedulesGenres[i].indexOf(genre.toLowerCase()) !== -1)
                return true;
        return false;
    }
    delGenres(genresArr) {
        let deletedGenres = '', usedGenres = '';
        let genresArrLength = genresArr.length;
        for (let i = genresArrLength; i > 0; i--) {
            genresArr[i - 1] = genresArr[i - 1].toLowerCase();
            if (this.isUsedGenre(genresArr[i - 1])) {
                usedGenres += genresArr[i - 1] + ' ';
                genresArr.splice(i - 1, 1);
            }
            else if (this.genres.indexOf(genresArr[i - 1]) !== -1)
                deletedGenres += genresArr[i - 1] + ' ';
        }
        if (this.lastGenresPlays.length === 0)
            this.loadLastGenresPlays();
        let modifed = false;
        for (let i in genresArr) {
            this.delGenrePlaylist(genresArr[i]);
        }
        this.saveLastGenresPlays();
        if (modifed)
            this.saveLastGenresPlays();
        this.genres = this._l.difference(this.genres, genresArr);
        this.saveGenres();
        deletedGenres.trim();
        usedGenres.trim();
        if (usedGenres.length !== 0)
            this.logAndPrint('passInfo', 'genres in use: ' + usedGenres);
        if (deletedGenres.length !== 0)
            this.logAndPrint('pass', 'removed genres: ' + deletedGenres);
        else
            this.logAndPrint('pass', 'no genres removed.');
    }
    loadGenres() {
        let tempGenres = this.genres;
        if (this.fs.existsSync(this.basePath + '/saves/genres.json')) {
            try {
                this.genres = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/genres.json'));
                for (let i in this.genres)
                    if (!this.fs.existsSync(this.basePath + '/uploads/genres/' + this.genres[i]))
                        this.fs.mkdirSync(this.basePath + '/uploads/genres/' + this.genres[i]);
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/genres.json');
                this.logAndPrint('fail', 'genres.json damaged, and deleted.');
                this.genres = tempGenres;
                return false;
            }
        }
        return true;
    }
    loadEmail() {
        let tempEmail = this.email;
        if (this.fs.existsSync(this.basePath + '/saves/email.json')) {
            try {
                this.email = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/email.json'));
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/email.json');
                this.logAndPrint('err', 'email.json damaged, and deleted.', err);
                this.email = tempEmail;
                return false;
            }
        }
        this.transporter = this.nodemailer.createTransport(this.email);
        return true;
    }
    loadConfigs() {
        let tempConfigs = this.configs;
        if (this.fs.existsSync(this.basePath + '/saves/configs.json')) {
            try {
                this.configs = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/configs.json'));
                this.omxconfig['-o'] = this.configs.output;
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/configs.json');
                this.logAndPrint('err', 'email.json damaged, and deleted.', err);
                this.configs = tempConfigs;
                return false;
            }
        }
        return true;
    }
    loadPassport() {
        let tempConfigs = this.passport;
        if (this.fs.existsSync(this.basePath + '/saves/passport.json')) {
            try {
                this.passport = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/passport.json'));
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/passport.json');
                this.logAndPrint('err', 'passport.json damaged, and deleted.', err);
                this.passport = tempConfigs;
                return false;
            }
        }
        return true;
    }
    loadWifiCheck() {
        let tempWifiCheck = this.wifiCheck;
        if (this.fs.existsSync(this.basePath + '/saves/wificheck.json')) {
            try {
                this.wifiCheck = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/wificheck.json'));
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/wificheck.json');
                this.logAndPrint('err', 'wificheck.json damaged, and deleted.', err);
                this.wifiCheck = tempWifiCheck;
                return false;
            }
        }
        return true;
    }
    saveLastPlay() {
        if (this.isDaysMode()) {
            this.lastPlay = {
                files: this.playlist.files,
                currentIndex: this.playlist.currentIndex,
                directory: this.playlist.directory
            };
            this.fs.writeFileSync(this.basePath + '/saves/lastplay.json', JSON.stringify(this.lastPlay));
        }
        else if (this.isGenresMode()) {
            let modifed = false;
            for (let i in this.lastGenresPlays) {
                if (this.lastGenresPlays[i].directory === this.playlist.directory) {
                    this.lastGenresPlays[i].files = this.playlist.files;
                    this.lastGenresPlays[i].currentIndex = this.playlist.currentIndex;
                    modifed = true;
                    break;
                }
            }
            if (!modifed)
                this.lastGenresPlays.push({
                    files: this.playlist.files,
                    currentIndex: this.playlist.currentIndex,
                    directory: this.playlist.directory
                });
            this.fs.writeFileSync(this.basePath + '/saves/lastgenresplays.json', JSON.stringify(this.lastGenresPlays));
        }
    }
    loadLastPlay() {
        if (this.isDaysMode()) {
            let tempLastPlay = this.lastPlay;
            if (this.fs.existsSync(this.basePath + '/saves/lastplay.json')) {
                try {
                    this.lastPlay = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/lastplay.json'));
                }
                catch (err) {
                    this.fs.unlinkSync(this.basePath + '/saves/lastplay.json');
                    this.logAndPrint('err', 'lastplay.json damaged, and deleted.', err);
                    this.lastPlay = tempLastPlay;
                    return false;
                }
            }
            if (this._l.difference(this.playlist.files, this.lastPlay.files).length === 0
                && this.playlist.directory === this.lastPlay.directory) {
                this.playlist.currentIndex = this.lastPlay.currentIndex >= 0 ? this.lastPlay.currentIndex : 0;
            }
            return true;
        }
        else if (this.isGenresMode()) {
            let tempLastGenresPlays = this.lastGenresPlays;
            if (this.fs.existsSync(this.basePath + '/saves/lastgenresplays.json')) {
                try {
                    this.lastGenresPlays = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/lastgenresplays.json'));
                }
                catch (err) {
                    this.fs.unlinkSync(this.basePath + '/saves/lastgenresplays.json');
                    this.logAndPrint('err', 'lastgenresplays.json damaged, and deleted.', err);
                    this.lastGenresPlays = tempLastGenresPlays;
                    return false;
                }
            }
            for (let i in this.lastGenresPlays) {
                if (this.lastGenresPlays[i].directory === this.playlist.directory && this._l.difference(this.playlist.files, this.lastGenresPlays[i].files).length === 0) {
                    this.playlist.currentIndex = this.lastGenresPlays[i].currentIndex >= 0 ? this.lastGenresPlays[i].currentIndex : 0;
                }
            }
            return true;
        }
    }
    loadLastGenresPlays() {
        let tempLastGenresPlays = this.lastGenresPlays;
        if (this.fs.existsSync(this.basePath + '/saves/lastgenresplays.json')) {
            try {
                this.lastGenresPlays = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/lastgenresplays.json'));
                return true;
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/lastgenresplays.json');
                this.logAndPrint('err', 'lastgenresplays.json damaged, and deleted.', err);
                this.lastGenresPlays = tempLastGenresPlays;
                return false;
            }
        }
    }
    saveLastGenresPlays() {
        return !!this.fs.writeFileSync(this.basePath + '/saves/lastgenresplays.json', JSON.stringify(this.lastGenresPlays));
    }
    setWifiCheck(status, minutes = 0) {
        if (this.wifiCheckIntervalObject)
            clearInterval(this.wifiCheckIntervalObject);
        if (status === true) {
            const that = this;
            this.wifiCheck.status = true;
            if (minutes > 0)
                this.wifiCheck.minutes = minutes;
            else
                this.wifiCheck.minutes = 30;
            this.wifiCheckIntervalObject = setInterval(() => {
                that.checkWifi();
            }, this.wifiCheck.minutes * 60 * 1000);
            this.logAndPrint('pass', 'wifi check set ON, interval: ' + this.wifiCheck.minutes + ' minutes.');
        }
        else if (status === false) {
            this.wifiCheck.status = false;
            this.logAndPrint('pass', 'wifi check set OFF.');
        }
        this.saveWifiCheck();
    }
    setConfigs(field, data) {
        switch (field) {
            case 'output':
                if (this.outputTypes.indexOf(data) !== -1) {
                    this.configs.output = data;
                    this.omxconfig['-o'] = this.configs.output;
                }
                else {
                    return false;
                }
                break;
            default:
                return false;
                break;
        }
        this.saveConfigs();
        return true;
    }
    setPassport(field, data) {
        switch (field) {
            case 'name':
                this.passport.name = data;
                break;
            case 'place':
                this.passport.place = data;
                break;
            case 'address':
                this.passport.address = data;
                break;
            default:
                return false;
                break;
        }
        this.savePassport();
        return true;
    }
    setEmail(e, p) {
        this.email.auth.user = e;
        this.email.auth.pass = p;
        this.saveEmail();
        return true;
    }
    sendMail() {
        //Fuction out of use
        this.logAndPrint('Info', 'mail aborted ');
    }
    sendMailIfIpChange() {
        //Fuction out of use
        this.logAndPrint('info', 'IP Changed ()');
    }
    setLogs(bool) {
        this.configs.logs = bool;
        let status = this.configs.logs ? 'on' : 'off';
        this.logAndPrint('pass', 'logging turned ' + status + '.');
        this.saveConfigs();
    }
    setDebug(bool) {
        this.configs.debug = bool;
        let status = this.configs.debug ? 'on' : 'off';
        this.logAndPrint('pass', 'debug logging turned ' + status + '.');
        this.saveConfigs();
    }
    printHelp() {
        this.logAndPrint('pass', 'ropongiStream commands list:');
        this.logAndPrint('pass', '| * DAY = { all days,' + this.weekday + ' }');
        this.logAndPrint('pass', '| * GENRE = { all genres,' + this.genres.toString() + ' }');
        this.logAndPrint('pass', '| * STATUS == on,off');
        this.logAndPrint('pass', '| * NUM == index of file in playlist, starts from 0');
        this.logAndPrint('pass', '| start | starts streaming if task set.');
        this.logAndPrint('pass', '| stop | stop streaming.');
        this.logAndPrint('pass', '| skip | skips to the next file');
        this.logAndPrint('pass', '| skip NUM | skips to the next NUM index file');
        this.logAndPrint('pass', '| set taskstype TYPE | TYPE == ' + this.schedulesType.toString().red);
        this.logAndPrint('pass', '| set task DAY HH:MM DAY HH:MM');
        this.logAndPrint('pass', '| set task DAY HH:MM HH:MM');
        this.logAndPrint('pass', '| set taskgenres GENRE TIME GENRE... or GENRE');
        this.logAndPrint('pass', '| set passport FIELD DATA | FIELD == name,place,address');
        this.logAndPrint('pass', '| set output TYPE | TYPE == ' + this.outputTypes);
        this.logAndPrint('pass', '| set wificheck STATUS MINUTES | MINUTES == 1,2, etc.. (default 10min)');
        this.logAndPrint('pass', '| set email EMAIL PASS');
        this.logAndPrint('pass', '| set logs STATUS (on, off)');
        this.logAndPrint('pass', '| set debug STATUS(on, off)');
        this.logAndPrint('pass', '| set autoshutdown STATUS');
        this.logAndPrint('pass', '| set time MILLIS | get from http://currentmillis.com/ OR js: new Date().valueOf()');
        this.logAndPrint('pass', '| add genres GENRES');
        this.logAndPrint('pass', '| del task DAY');
        this.logAndPrint('pass', '| del playlist DAY or GENRE');
        this.logAndPrint('pass', '| del genres GENRES');
        this.logAndPrint('pass', '| make playlist DAY or GENRE');
        this.logAndPrint('pass', '| make playlist+shared DAY | will use all files in DAY folder together with sharedday folder as 1 folder');
        this.logAndPrint('pass', '| make random playlist DAY or GENRE');
        this.logAndPrint('pass', '| make random+shared playlist DAY | will use all files in DAY folder together with sharedday folder as 1 folder');
        this.logAndPrint('pass', '| update time | will restart all tasks after new time set');
        this.logAndPrint('pass', '| info');
        this.logAndPrint('pass', '| tasks');
        this.logAndPrint('pass', '| genres');
    }
    makeMaindirs() {
        for (let i in this.appdirs) {
            if (!this.fs.existsSync(this.basePath + '/' + this.appdirs[i])) {
                this.fs.mkdirSync(this.basePath + '/' + this.appdirs[i]);
            }
        }
    }
    makeDaydirs() {
        for (let i in this.weekday) {
            if (!this.fs.existsSync(this.basePath + '/uploads/' + this.weekday[i])) {
                this.fs.mkdirSync(this.basePath + '/uploads/' + this.weekday[i]);
            }
        }
    }
    playIfPlayTime() {
        let deferred = this.q.defer();
        let playingDay = this.getPlayingStartDay();
        if (!this.omx.isPlaying() && !this.streaming && playingDay) {
            this.startPlay(playingDay).then(() => {
                deferred.resolve();
            }, () => {
                // Wait and verify if there really is an omxplayer started.
                setTimeout(() => {
                    this.exec('sudo pidof omxplayer.bin', (err, stdout, stderr) => {
                        if (err) {
                            this.logAndPrint('warningInfo', 'Allready streaming condition erro on startPlay. No omxplayer detected.', err);
                            this.streaming = false;
                            this.startPlay(playingDay).then(() => {
                                return deferred.resolve();
                            });
                        }
                        if (stdout && typeof stdout == 'string') {
                            deferred.reject(new Error('allready streaming. Omx player pid: ' + stdout));
                        }
                    });
                }, 200);
            });
        }
        else if (this.omx.isPlaying() || this.streaming) {
            // Wait and verify if there really is an omxplayer started.
            setTimeout(() => {
                this.exec('sudo pidof omxplayer.bin', (err, stdout, stderr) => {
                    if (err) {
                        this.logAndPrint('warningInfo', 'Allready streaming condition erro on startPlay. No omxplayer detected.', err);
                        this.streaming = false;
                        this.startPlay(playingDay).then(() => {
                            return deferred.resolve();
                        });
                    }
                    if (stdout && typeof stdout == 'string') {
                        return deferred.reject(new Error('allready streaming. Omx player pid: ' + stdout));
                    }
                });
            }, 200);
        }
        else if (!playingDay) {
            deferred.reject(new Error('no task set'));
        }
        return deferred.promise;
    }
    stopSchedule() {
        this.stopPlay().then(() => {
            this.logAndPrint('info', 'task ended');
            this.shutdownIfSet();
        });
    }
    startSchedule() {
        this.startPlay().then(() => {
            this.logAndPrint('info', 'starting task play');
        }, () => {
            this.logAndPrint('warningInfo', 'cant task');
        });
    }
    runSchedules() {
        let sth, stm, eth, etm;
        for (let i = 0; i < 7; i++) {
            if (this.schedules[i]) {
                if (this.schedules[i].hasOwnProperty('startTime') && this.schedules[i].hasOwnProperty('endTime')) {
                    sth = parseInt(this.schedules[i].startTime.split(':')[0]);
                    stm = parseInt(this.schedules[i].startTime.split(':')[1]);
                    eth = parseInt(this.schedules[i].endTime.split(':')[0]);
                    etm = parseInt(this.schedules[i].endTime.split(':')[1]);
                    this.schedulesStartObject[i] = {
                        hour: sth,
                        minute: stm,
                        dayOfWeek: i
                    };
                    this.schedulesStart[i] = this.schedule.scheduleJob(`Start on ${this.weekday[i]} ${sth}:${stm}`, this.schedulesStartObject[i], () => this.startSchedule());
                    this.schedulesStopObject[i] = {
                        hour: eth,
                        minute: etm,
                        dayOfWeek: this.weekday.indexOf(this.schedules[i].endDay)
                    };
                    this.schedulesStop[i] = this.schedule.scheduleJob(`Stop on ${this.weekday[i]} ${eth}:${etm}`, this.schedulesStopObject[i], () => this.stopSchedule());
                }
            }
        }
        this.playIfPlayTime().then(() => {
            this.logAndPrint('info', 'starting task play');
        }, (err) => {
            this.logAndPrint('err', err.message, err);
        });
        this.logAndPrint('info', 'Current schedule: ');
        Object.keys(this.schedule.scheduledJobs).forEach((key, index) => {
            this.logAndPrint('info', this.schedule.scheduledJobs[key].name);
        });
    }
    startPlay(day = null) {
        let deferred = this.q.defer();
        if (this.omx.isPlaying() || this.streaming) {
            deferred.reject(new Error('allready streaming'));
        }
        else {
            day = day ? day : this.updateDay().name;
            switch (this.configs.schedulesType) {
                case 'days':
                    this.loadPlayList(day);
                    break;
                case 'genres':
                    this.loadGenresPlayList(day);
                    break;
                default:
                    deferred.reject(new Error('missing tasks type in configs'));
                    break;
            }
            this.playPlayList();
            deferred.resolve();
        }
        return deferred.promise;
    }
    startPlayOLD(day) {
        if (this.omx.isPlaying() || this.streaming)
            return false;
        day = day ? day : this.updateDay().name;
        switch (this.configs.schedulesType) {
            case 'days':
                this.loadPlayList(day);
                break;
            case 'genres':
                this.loadGenresPlayList(day);
                break;
            default:
                this.loadPlayList(day);
                break;
        }
        this.playPlayList();
        return true;
    }
    stopPlay() {
        let deferred = this.q.defer();
        this.streaming = false;
        if (this.omx.isPlaying()) {
            this.omx.stop();
            deferred.resolve({
                message: 'play and task has been stopped'
            });
        }
        else {
            deferred.resolve({
                message: 'task stopped'
            });
        }
        return deferred.promise;
    }
    skipPlay(val) {
        const num = parseInt(val === null || val === void 0 ? void 0 : val.toString()) || 0;
        if (num && this.playlist.files.length && (num < 0 || num >= this.playlist.files.length)) {
            this.logAndPrint('fail', 'skip between 0 to ' + (this.playlist.files.length - 1));
            return;
        }
        else if (num && this.playlist.files.length) {
            console.log(this.playlist.currentIndex);
            () => this.playlist.currentIndex = (num - 1 + this.playlist.files.length) % this.playlist.files.length;
            console.log(this.playlist.currentIndex);
        }
        if (this.omx.isPlaying()) {
            this.omx.stop();
        }
        else {
            this.playIfPlayTime().then(() => {
                this.logAndPrint('pass', 'starting stream.');
            }, (err) => {
                this.logAndPrint('err', err.message, err);
            });
        }
    }
    getTime() {
        let hour = new Date().getHours().toString(), minute = new Date().getMinutes().toString(), second = new Date().getSeconds().toString();
        hour = parseInt(hour) < 10 ? '0' + hour : hour;
        minute = parseInt(minute) < 10 ? '0' + minute : minute;
        second = parseInt(second) < 10 ? '0' + second : second;
        return hour + ':' + minute + ":" + second;
    }
    getDate() {
        let date = new Date();
        let dd = date.getDate(), mm = date.getMonth() + 1, yy = date.getFullYear();
        return yy + '-' + mm + '-' + dd;
    }
    playPlayList() {
        //sendMailIfIpChange();
        if (this.omx.isPlaying() || this.playlist.files.length === 0)
            return false;
        this.streaming = true;
        this.playNext();
    }
    playNext() {
        let forceStop = false;
        let streamedOnesAtLeast = this.playlist.currentIndex === 0 ? false : true;
        if (this.isGenresMode()) {
            let currentGenre, startDay = this.getPlayingStartDay();
            if (this.isRealDayName(startDay)) {
                currentGenre = this.getCurrentGenre(startDay);
            }
            else {
                forceStop = true;
                this.stopPlay();
            }
            if (!forceStop && currentGenre && this.playlist.directory !== currentGenre) {
                this.loadGenresPlayList(startDay);
            }
        }
        while (!forceStop
            && !this.fs.existsSync(this.playlist.path + '/' + this.playlist.files[this.playlist.currentIndex])
            && !this.fs.existsSync(this.sharedday + '/' + this.playlist.files[this.playlist.currentIndex])) {
            this.logAndPrint('warningInfo', 'missing file, playing index: '
                + (this.playlist.currentIndex + 1) + '/'
                + this.playlist.files.length + ' : '
                + this.playlist.files[this.playlist.currentIndex] + ' in '
                + this.playlist.directory + ' folder.');
            if (this.playlist.currentIndex + 1 === this.playlist.files.length) {
                if (streamedOnesAtLeast) {
                    streamedOnesAtLeast = false;
                }
                else {
                    forceStop = true;
                    this.stopPlay().then(() => {
                        this.logAndPrint('pass', 'task stopped due to missing of all playlist files');
                    });
                    break;
                }
            }
            this.playlist.currentIndex = (this.playlist.currentIndex + 1 + this.playlist.files.length) % this.playlist.files.length;
        }
        if (!this.omx.isPlaying() && !forceStop) {
            streamedOnesAtLeast = true;
            //Get all pid's of omxplayer 
            this.exec('sudo pidof omxplayer.bin', (err, stdout, stderr) => {
                if (err) {
                    this.logAndPrint('info', `No previous omxplayer found, start playing ${this.playlist.files[this.playlist.currentIndex]}.`, err);
                    if (this.fs.existsSync(this.playlist.path + '/' + this.playlist.files[this.playlist.currentIndex])) {
                        this.omx.play(this.playlist.path + '/' + this.playlist.files[this.playlist.currentIndex], this.omxconfig);
                    }
                    else if (this.fs.existsSync(this.sharedday + '/' + this.playlist.files[this.playlist.currentIndex])) {
                        this.omx.play(this.sharedday + '/' + this.playlist.files[this.playlist.currentIndex], this.omxconfig);
                    }
                    else {
                        this.logAndPrint('warningInfo', 'missing file, playing index: '
                            + (this.playlist.currentIndex + 1) + '/'
                            + this.playlist.files.length + ' : '
                            + this.playlist.files[this.playlist.currentIndex]);
                    }
                    return;
                }
                if (stderr) {
                    this.logAndPrint('fail', `stderr on pidof omxplayer: ${stderr}`);
                }
                if (stdout && typeof stdout == 'string') {
                    this.logAndPrint('warningInfo', 'Previus omxplayer open, omx.play aborted.');
                    this.logAndPrint('warningInfo', 'Omx players pids: ' + stdout);
                }
            });
            this.omx.once('end', () => {
                if (this.new_rdm_at_end === 1 && this.streaming && this.playlist.currentIndex === 0) {
                    this.logAndPrint('info', 'Reloading playlist ' + (this.playlist.currentIndex) + (this.playlist.files.length));
                    this.stopPlay().then((data) => {
                        this.logAndPrint('pass', data.message);
                    });
                    this.delGenresPlayList(this.playlist.directory);
                    this.createGenresPlayList(this.playlist.directory, true);
                    this.exec('sudo killall omxplayer.bin', (err, stdout, stderr) => {
                        if (err) {
                            this.logAndPrint('err', `can't kill all omxplayers: ${err.message}`, err);
                            return;
                        }
                        if (stderr) {
                            this.logAndPrint('fail', `stderr on playNext killall omxplayer: ${stderr}`);
                        }
                        this.logAndPrint('info', 'all omx players killed ' + new Date());
                        this.skipPlay(1);
                    });
                    this.playNext();
                }
                else if (this.streaming) {
                    this.playNext();
                }
            });
            this.saveLastPlay();
            this.playlist.currentIndex = (this.playlist.currentIndex + 1 + this.playlist.files.length) % this.playlist.files.length;
        }
    }
    killOmxplayerDuplicates() {
        //Get all pid's of omxplayer 
        this.exec('sudo pidof omxplayer.bin', (err, stdout, stderr) => {
            if (err) {
                this.logAndPrint('warningInfo', `No previous omxplayer found`, err);
                return;
            }
            if (stderr) {
                this.logAndPrint('fail', `stderr on pidof omxplayer: ${stderr}`);
            }
            if (stdout && typeof stdout == 'string') {
                this.logAndPrint('info', 'Omx players pids: ' + stdout);
                let pids = stdout.replace(/(\r\n|\n|\r)/gm, "").split(' ');
                //Look for duplicated omxplayer
                if (pids[1]) {
                    this.logAndPrint('warningInfo', `Multiple omx players detected: `);
                    console.log(pids);
                    // Identify and kill the newest proces
                    // this.exec(`sudo ps p ${pids[1]} o etimes=`, (err: Error, stdout: string|Buffer, stderr: string|Buffer) => {
                    //     let pidToKill = pids[1];
                    //     if (err) {
                    //         this.logAndPrint('err', `${err.message}`, err);
                    //         return;
                    //     }
                    //     if(stderr){
                    //         this.logAndPrint('fail', `${stderr}`)
                    //     }
                    //     let time0 = '0';
                    //     const time1 = stdout as string;
                    //     if (stdout){
                    //         this.exec(`sudo ps p ${pids[0]} o etimes=`, (err: Error, stdout: string|Buffer, stderr: string|Buffer) => {
                    //             if (err) {
                    //                 this.logAndPrint('err', `${err.message}`, err);
                    //                 return;
                    //             }
                    //             if(stderr){
                    //                 this.logAndPrint('fail', `${stderr}`)
                    //             }
                    //             if (stdout){
                    //                 time0 = stdout as string;
                    //             }
                    //         });
                    //         pidToKill = parseInt(time0) < parseInt(time1) ?  pids[0] :  pids[1];
                    //         this.exec('sudo kill -9 ' + pidToKill, (err: Error, stdout: string|Buffer, stderr: string|Buffer) => {
                    //             if (err) {
                    //                 this.logAndPrint('err', `can't kill omxplayer: ${err.message}`, err);
                    //                 return;
                    //             }
                    //             if(stderr){
                    //                 this.logAndPrint('fail', `stderr on playNext kill omxplayer: ${stderr}`)
                    //             }
                    //             this.logAndPrint('info', `omx player ${pidToKill} killed. ${stdout} ` + new Date());
                    //         });
                    //     }
                    // });
                }
            }
        });
    }
    getPlayingStartDay() {
        let sStartDay, sStopDay, sStartDayIndex, sStopDayIndex, sStartHour, sStartMinute, sStopHour, sStopMinute, day = this.weekday[new Date().getDay()], dayIndex = this.weekday.indexOf(day), hour = new Date().getHours(), minute = new Date().getMinutes();
        for (let j = 0; j < this.schedules.length; j++) {
            if (this.schedules[j]) {
                if (this.schedules[j].startDay && this.schedules[j].startTime && this.schedules[j].startDay && this.schedules[j].startTime) {
                    sStartDay = this.schedules[j].startDay;
                    sStopDay = this.schedules[j].endDay;
                    sStartDayIndex = this.weekday.indexOf(sStartDay);
                    sStopDayIndex = this.weekday.indexOf(sStopDay);
                    sStartHour = parseInt(this.schedules[j].startTime.split(':')[0]);
                    sStartMinute = parseInt(this.schedules[j].startTime.split(':')[1]);
                    sStopHour = parseInt(this.schedules[j].endTime.split(':')[0]);
                    sStopMinute = parseInt(this.schedules[j].endTime.split(':')[1]);
                    if (sStartDayIndex === dayIndex && sStopDayIndex === dayIndex) //start end same day
                        if (sStartHour * 60 + sStartMinute <= hour * 60 + minute && sStopHour * 60 + sStopMinute > hour * 60 + minute)
                            return sStartDay;
                    if (sStartDayIndex === dayIndex && sStopDayIndex !== dayIndex) //start end next day
                        if (sStartHour * 60 + sStartMinute <= hour * 60 + minute)
                            return sStartDay;
                    if (sStopDayIndex === dayIndex && sStartDayIndex === this.getPreviousDayIndex(dayIndex))
                        if (sStopHour * 60 + sStopMinute > hour * 60 + minute)
                            return sStartDay;
                }
            }
        }
        return null;
    }
    getPreviousDayIndex(index) {
        if (index >= 0 && index <= 6) {
            return index > 0 ? index - 1 : 6;
        }
        return -1;
    }
    loadSchedules() {
        if (this.fs.existsSync(this.basePath + '/saves/tasks.json')) {
            try {
                this.schedules = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/tasks.json'));
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/tasks.json');
                this.logAndPrint('fail', 'tasks.json damaged, and deleted.');
            }
        }
    }
    displaySchedules() {
        let haveSchedules = false;
        this.logAndPrint('pass', 'tasks list:');
        for (let i = 0; i < this.schedules.length; i++) {
            if (this.schedules[i]) {
                this.logAndPrint('pass', '|- ' + this.schedules[i].startDay + ' ' + this.schedules[i].startTime + ' - ' + this.schedules[i].endDay + ' ' + this.schedules[i].endTime);
                if (this.isGenresMode()) {
                    this.logAndPrint('pass', '|-- timeline: ' + this.buildTimeLineGenres(this.weekday[i]));
                }
                haveSchedules = true;
            }
        }
        if (!haveSchedules) {
            this.logAndPrint('pass', '|- ' + 'empty'.red);
        }
    }
    saveSchedules() {
        if (this.fs.writeFileSync(this.basePath + '/saves/tasks.json', JSON.stringify(this.schedules))) {
            this.logAndPrint('pass', 'tasks list:');
        }
    }
    loadPlayList(day) {
        if (!this.isRealDayName(day)) {
            return false;
        }
        this.playlist = {
            files: [],
            currentIndex: 0,
            path: '',
            directory: '',
            mtimeMs: 0
        };
        this.playlist.directory = day;
        this.playlist.path = this.basePath + '/uploads/' + this.playlist.directory;
        if (!this.fs.existsSync(this.playlist.path + '/_playlist.m3u')) {
            this.logAndPrint('info', 'creating playlist of ' + this.playlist.directory);
            this.createPlayListSwitch([this.playlist.directory], this.autoRandomMissingPlaylist, false);
        }
        if (this.fs.existsSync(this.playlist.path + '/_playlist.m3u')) {
            let data = this.fs.readFileSync(this.playlist.path + '/_playlist.m3u', {
                encoding: 'utf8'
            });
            this.fs.stat(this.playlist.path + '/_playlist.m3u', (error, stats) => {
                if (error) {
                    this.logAndPrint('err', ` ${error.message}`, error);
                }
                else {
                    if (stats.mtimeMs > this.playlist.mtimeMs) {
                        this.playlist.mtimeMs = stats.mtimeMs;
                    }
                }
            });
            if (data) {
                this.logAndPrint('info', 'loading ' + this.playlist.directory + ' playlist.');
                this.playlist.files = this.getOnlyPlayFiles(data.split('\n'));
                this.loadLastPlay();
            }
            else {
                this.logAndPrint('warningInfo', this.playlist.directory + ' playlist is empty');
                this.playlist.files = [];
            }
        }
        else {
            this.logAndPrint('warningInfo', this.playlist.directory + ' folder is empty');
            this.playlist.files = [];
        }
    }
    isRealDayName(toCheck) {
        if (!toCheck || !this._l.isString(toCheck) || this.weekday.indexOf(toCheck.toLowerCase()) === -1)
            return false;
        return true;
    }
    isPlayableFile(toCheck) {
        if (!toCheck) {
            return false;
        }
        let arr = toCheck.split('.'), type = arr.pop();
        return (this._l.indexOf(this.filetypes, type) !== -1);
    }
    isAllString(toCheck) {
        if (!toCheck || !this._l.isString(toCheck) || toCheck.toLowerCase() != 'all')
            return false;
        return true;
    }
    isRealTime(time) {
        const regularExpressionTime = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!time || !regularExpressionTime.test(time.startsWith('n') ? time.substring(1) : time)) {
            return false;
        }
        return true;
    }
    delPlayListSwitch(arrDayGenre) {
        if (arrDayGenre.length === 2 && this.isAllString(arrDayGenre[0])) {
            if (arrDayGenre[1] === 'days')
                this.delPlayList(arrDayGenre[0]);
            else if (arrDayGenre[1] === 'genres')
                this.delGenresPlayList(arrDayGenre[0]);
        }
        else if (arrDayGenre.length === 1 && !this.isAllString(arrDayGenre[0])) {
            if (this.isRealDayName(arrDayGenre[0]))
                this.delPlayList(arrDayGenre[0]);
            else if (this.isRealGenre(arrDayGenre[0]))
                this.delGenresPlayList(arrDayGenre[0]);
        }
    }
    delPlayList(day) {
        if (this.isRealDayName(day)) {
            let daydir = this.basePath + '/uploads/' + day;
            if (this.fs.existsSync(daydir + '/_playlist.m3u')) {
                this.fs.unlinkSync(daydir + '/_playlist.m3u');
                this.logAndPrint('pass', day + ' playlist deleted.');
                return true;
            }
            else
                this.logAndPrint('fail', day + ' missing a playlist.');
        }
        else if (this.isAllString(day)) {
            for (let i = 0; i < this.weekday.length; i++) {
                this.delPlayList(this.weekday[i]);
            }
        }
        else
            this.logAndPrint('fail', 'day is misspelled');
        return false;
    }
    createPlayListSwitch(arrDayGenre, random, shared) {
        if (arrDayGenre.length === 2 && this.isAllString(arrDayGenre[0])) {
            if (arrDayGenre[1] === 'days')
                this.createPlayList(arrDayGenre[0], random, shared);
            else if (arrDayGenre[1] === 'genres')
                this.createGenresPlayList(arrDayGenre[0], random);
        }
        else if (arrDayGenre.length === 1 && !this.isAllString(arrDayGenre[0])) {
            if (this.isRealDayName(arrDayGenre[0]))
                this.createPlayList(arrDayGenre[0], random, shared);
            else if (this.isRealGenre(arrDayGenre[0]))
                this.createGenresPlayList(arrDayGenre[0], random);
        }
    }
    createPlayList(day, random, shared) {
        random = random ? random : false;
        shared = shared ? shared : false;
        let i = 0, j, endi = 0, daydir, files, sharedFiles, rNum, fileName;
        if (this.isRealDayName(day)) {
            i = this.weekday.indexOf(day);
            endi = i + 1;
        }
        else if (this.isAllString(day)) {
            i = 0;
            endi = 7;
        }
        for (i; i < endi; i++) {
            daydir = this.basePath + '/uploads/' + this.weekday[i];
            if (this.fs.existsSync(daydir)) {
                files = this.getOnlyPlayFiles(this.fs.readdirSync(daydir + '/'));
                if (shared)
                    sharedFiles = this.getOnlyPlayFiles(this.fs.readdirSync(this.sharedday + '/'));
                if (this.util.isArray(sharedFiles))
                    files = files.concat(sharedFiles);
                if (this.util.isArray(files)) {
                    if (files.length === 0)
                        this.logAndPrint('fail', 'no files exists in ' + this.weekday[i]);
                    else {
                        if (!this.fs.existsSync(daydir + '/_playlist.m3u')) {
                            if (random)
                                for (j = files.length - 1; j >= 0; j--) {
                                    rNum = Math.floor(Math.random() * j);
                                    fileName = files[rNum];
                                    files[rNum] = files[j];
                                    files[j] = fileName;
                                }
                            for (j = 0; j < files.length; j++)
                                this.fs.appendFileSync(daydir + '/_playlist.m3u', files[j] + '\n');
                            if (this.fs.existsSync(daydir + '/_playlist.m3u'))
                                this.logAndPrint('pass', 'new playlist created in ' + this.weekday[i]);
                        }
                        else
                            this.logAndPrint('fail', 'playlist already exists in ' + this.weekday[i]);
                    }
                }
            }
        }
    }
    getOnlyPlayFiles(arr) {
        let retArr = [];
        if (this.util.isArray(arr)) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i][0] != '#' || arr[i].length > 0) {
                    arr[i] == arr[i].replace(/(\r\n|\n|\r)/gm, "");
                    if (arr[i].indexOf('/') != -1)
                        arr[i] == arr[i].split('/')[arr[i].split('/').length - 1];
                    if (arr[i].indexOf('\\') != -1)
                        arr[i] == arr[i].split('\\')[arr[i].split('\\').length - 1];
                    if (this.isPlayableFile(arr[i])) {
                        retArr.push(arr[i]);
                    }
                }
            }
        }
        return retArr;
    }
    updateDay() {
        const name = this.weekday[new Date().getDay()];
        const today = {
            name: name,
            index: this.weekday.indexOf(name),
            dir: this.basePath + '/uploads/' + name
        };
        this.today = today;
        return today;
    }
    isEmptyScheduleTime(scheduleObject) {
        let prevIndex = (scheduleObject.startDayIndex - 1 + 7) % 7, nextIndex = (scheduleObject.startDayIndex + 1 + 7) % 7, t1, t2;
        if (this.schedules[prevIndex]) {
            if (this.schedules[prevIndex].endDayIndex === scheduleObject.startDayIndex) {
                t1 = parseInt(this.schedules[prevIndex].endTime.split(':')[0]) * 60 + parseInt(this.schedules[prevIndex].endTime.split(':')[1]);
                t2 = parseInt(scheduleObject.startTime.split(':')[0]) * 60 + parseInt(scheduleObject.startTime.split(':')[1]);
                if (t1 >= t2)
                    return false;
            }
        }
        if (this.schedules[nextIndex]) {
            if (this.schedules[nextIndex].startDayIndex === scheduleObject.endDayIndex) {
                t1 = parseInt(this.schedules[nextIndex].startTime.split(':')[0]) * 60 + parseInt(this.schedules[nextIndex].startTime.split(':')[1]);
                t2 = parseInt(scheduleObject.endTime.split(':')[0]) * 60 + parseInt(scheduleObject.endTime.split(':')[1]);
                if (t1 <= t2)
                    return false;
            }
        }
        return true;
    }
    delSchedule(day) {
        if (this.isRealDayName(day)) {
            let ipt = this.getPlayingStartDay();
            if (ipt && ipt === day)
                this.stopPlay();
            let dayIndex = this.weekday.indexOf(day);
            if (this.schedules[dayIndex]) {
                this.schedules[dayIndex] = null;
                this.schedulesStartObject[dayIndex] = null;
                this.schedulesStart[dayIndex] = null;
                this.schedulesStopObject[dayIndex] = null;
                this.schedulesStop[dayIndex] = null;
                this.logAndPrint('pass', day + ' task deleted.');
                this.saveSchedules();
                this.schedulesGenres[dayIndex] = [];
                this.schedulesGenresSpliters[dayIndex] = [];
                this.saveSchedulesGenresAndSpliters();
                return true;
            }
            else {
                this.logAndPrint('fail', day + ' missing a task');
                return false;
            }
        }
        else if (this.isAllString(day)) {
            let haveSchedules = false;
            this.stopPlay();
            for (let i = 0; i < this.weekday.length; i++) {
                if (this.schedules[i]) {
                    this.schedules[i] = null;
                    this.schedulesStartObject[i] = null;
                    this.schedulesStart[i] = null;
                    this.schedulesStopObject[i] = null;
                    this.schedulesStop[i] = null;
                    this.logAndPrint('pass', this.weekday[i] + ' task deleted.');
                    haveSchedules = true;
                    this.schedulesGenres[i] = [];
                    this.schedulesGenresSpliters[i] = [];
                }
            }
            if (!haveSchedules) {
                this.logAndPrint('fail', 'empty schedules list.');
                return false;
            }
            else {
                this.saveSchedules();
                this.saveSchedulesGenresAndSpliters();
                return true;
            }
        }
        else
            this.logAndPrint('fail', 'day is misspelled');
        return false;
    }
    isCorrectStartEndTime(start, end) {
        let shr, sm, ehr, em;
        shr = parseInt(start.split(':')[0]);
        sm = parseInt(start.split(':')[1]);
        ehr = parseInt(end.split(':')[0]);
        em = parseInt(end.split(':')[1]);
        if (shr * 60 + sm < ehr * 60 + em)
            return true;
        return false;
    }
    addSchedule(...args) {
        let startDay, startDayIndex, endDayIndex, startTime, endDay, endTime, scheduleObject;
        if (!(args.length >= 3 && args.length <= 4)) {
            this.logAndPrint('fail', 'input must be 3 or 4 parameters.'.bold);
            return false;
        }
        if (this.isRealDayName(args[0])) {
            startDay = args[0];
            startDayIndex = this.weekday.indexOf(startDay);
        }
        else {
            this.logAndPrint('fail', 'start day is misspelled'.bold);
            return false;
        }
        if (this.isRealTime(args[1])) {
            startTime = args[1];
        }
        else {
            this.logAndPrint('fail', 'start time is misspelled, use HH:MM'.bold);
            return false;
        }
        endDayIndex = startDayIndex;
        endDay = startDay;
        if (args.length === 3) {
            if (this.isRealTime(args[2])) {
                endTime = args[2];
            }
            else {
                this.logAndPrint('fail', 'end time is misspelled, use HH:MM'.bold);
                return false;
            }
            if (!this.isCorrectStartEndTime(startTime, endTime)) {
                this.logAndPrint('fail', 'end time is lower than start time.'.bold);
                return false;
            }
        }
        else if (args.length === 4) {
            if (this.isRealDayName(args[2])) {
                endDay = args[2];
                endDayIndex = this.weekday.indexOf(endDay);
            }
            else {
                this.logAndPrint('fail', 'end day is misspelled'.bold);
                return false;
            }
            if (this.isRealTime(args[3])) {
                endTime = args[3];
            }
            else {
                this.logAndPrint('fail', 'end time is misspelled, use HH:MM'.bold);
                return false;
            }
        }
        if (!(endDayIndex - startDayIndex <= 1 && endDayIndex - startDayIndex >= 0 || endDayIndex - startDayIndex === -6)) {
            this.logAndPrint('fail', 'allowed set 1 day difference maximum'.bold);
            return false;
        }
        scheduleObject = {
            startDay: startDay,
            startDayIndex: startDayIndex,
            startTime: startTime,
            endDay: endDay,
            endDayIndex: endDayIndex,
            endTime: endTime
        };
        if (!this.isEmptyScheduleTime(scheduleObject)) {
            this.logAndPrint('fail', 'trying set task on other task time.'.bold);
            return false;
        }
        this.schedules[startDayIndex] = scheduleObject;
        this.saveSchedules();
        this.schedulesGenres[startDayIndex] = [];
        this.schedulesGenresSpliters[startDayIndex] = [];
        this.saveSchedulesGenresAndSpliters();
        this.logAndPrint('pass', 'task added: ' + this.schedules[startDayIndex].startDay
            + ' ' + this.schedules[startDayIndex].startTime + ' - '
            + this.schedules[startDayIndex].endDay + ' ' + this.schedules[startDayIndex].endTime);
        if (this.isGenresMode())
            this.logAndPrint('passInfo', 'use: set taskgenres ' + this.schedules[startDayIndex].startDay + ' GENRE or GENRE TIME GENRE... GENRE');
        if (this.isDaysMode())
            this.runSchedules();
        return true;
    }
    getUptime() {
        let seconds = this.os.uptime();
        return Math.floor(seconds / 86400) + ' days ' + Math.floor((seconds % 86400) / 3600)
            + ' hours ' + Math.floor(((seconds % 86400) % 3600) / 60) + ' minutes '
            + Math.floor(((seconds % 86400) % 3600) % 60) + ' seconds';
    }
    currentStatus() {
        var _a;
        this.updateDay();
        this.logAndPrint('pass', 'Ropongi_Stream v' + this.version + ' ' + this.passport.name + ' current status:');
        this.logAndPrint('pass', 'email ' + this.email.auth.user);
        this.logAndPrint('pass', 'output ' + this.configs.output);
        this.logAndPrint('pass', 'location ' + this.passport.place + ' at ' + this.passport.address);
        this.logAndPrint('pass', 'current time: ' + ((_a = this.today) === null || _a === void 0 ? void 0 : _a.name) + ' ' + this.getTime());
        this.logAndPrint('pass', 'uptime: ' + this.getUptime());
        this.logAndPrint('pass', 'local ip: ' + this.ip.address() + ' network ip: ' + this.networkInfo.networkIp);
        let wifiInfo = this.wifiCheck.status ? 'ON'.green + ' , interval: ' + this.wifiCheck.minutes + ' minutes' : 'OFF'.red;
        this.logAndPrint('pass', 'wifi check is ' + wifiInfo);
        let rtcInfo = this.rtc ? 'AVAILABLE'.green : 'MISSING'.red;
        this.logAndPrint('pass', 'RTC: ' + rtcInfo);
        let autoShutdownInfo = this.configs.autoShutdown ? 'ON'.green : 'OFF'.red;
        this.logAndPrint('pass', 'auto shutdown after task end ' + autoShutdownInfo);
        let logsInfo = this.configs.logs ? 'ON'.green : 'OFF'.red;
        this.logAndPrint('pass', 'logging logs is ' + logsInfo);
        let debugMode = this.configs.debug ? 'ON'.green : 'OFF'.red;
        this.logAndPrint('pass', 'debug mode is ' + debugMode);
        this.logAndPrint('pass', 'tasks type is ' + this.configs.schedulesType);
        if (this.omx.isPlaying() || this.streaming) {
            let playIndex = (this.playlist.currentIndex - 1 + this.playlist.files.length) % this.playlist.files.length;
            this.logAndPrint('pass', 'stream is ' + 'ON'.green + ' task of ' + this.playlist.directory + ' - ' + this.playlist.files[playIndex]);
            this.logAndPrint('pass', 'stream index ' + playIndex + ' of ' + this.playlist.files.length);
        }
        else {
            this.logAndPrint('pass', 'stream is ' + 'OFF'.red);
        }
        this.exec('vcgencmd measure_temp', (error, stdout, stderr) => {
            if (error) {
                this.logAndPrint('err', `Exec error: ${error.message}`, error);
            }
            if (stderr) {
                this.logAndPrint('fail', `stderron currentStatus vcgencmd measure_temp: ${stderr}`);
            }
            if (stdout) {
                this.logAndPrint('pass', 'temp: ' + stdout.toString().replace(/\s+/g, " ").trim().split('=')[1]);
            }
        });
        this.exec('df / -h', (error, stdout, stderr) => {
            if (error) {
                this.logAndPrint('err', `Exec error: ${error.message}`, error);
            }
            if (stderr) {
                this.logAndPrint('fail', `stderr currentStatus df: ${stderr}`);
            }
            if (stdout) {
                let arr = stdout.toString().replace(/\s+/g, " ").trim().split(' ').slice(8);
                this.logAndPrint('pass', 'SD size: ' + arr[0] + ' used: ' + arr[1] + ' / ' + arr[3] + ' available: ' + arr[2]);
            }
        });
        //Get all pid's of omxplayer 
        this.exec('sudo pidof omxplayer.bin', (err, stdout, stderr) => {
            if (err) {
                this.logAndPrint('warningInfo', `No previous omxplayer found`, err);
                return;
            }
            if (stderr) {
                this.logAndPrint('fail', `stderr on pidof omxplayer: ${stderr}`);
            }
            if (stdout && typeof stdout == 'string') {
                this.logAndPrint('pass', 'Omx players pids: ' + stdout);
            }
        });
    }
    getListOfGenresDirs() {
        let path = this.basePath + '/uploads/genres', dirs = [], files = [];
        try {
            files = this.fs.readdirSync(path);
        }
        catch (err) {
            return dirs;
        }
        for (let i in files) {
            if (this.fs.statSync(path + '/' + files[i]).isDirectory())
                dirs.push(files[i]);
        }
        return dirs;
    }
    getLastGenresPlaysPlaylist(genre) {
        for (let i in this.lastGenresPlays)
            if (this.lastGenresPlays[i].directory === genre)
                return this.lastGenresPlays[i];
        return null;
    }
    getLastGenresPlaysPlaylistIndex(genre) {
        for (let i in this.lastGenresPlays)
            if (this.lastGenresPlays[i].directory === genre)
                return i;
        return -1;
    }
    updateLastGenresPlays(playlist) {
        let genre = playlist.directory;
        if (this.getLastGenresPlaysPlaylistIndex(genre) === -1) {
            this.lastGenresPlays.push(playlist);
            return true;
        }
        return false;
    }
    delGenrePlaylist(genre) {
        for (let i = 0; i < this.lastGenresPlays.length; i++) {
            if (this.lastGenresPlays[i].directory === genre) {
                this.lastGenresPlays.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    printGenres() {
        this.logAndPrint('pass', 'genres list: ' + this.genres.length + ' genres');
        if (this.genres.length !== 0) {
            for (let i in this.genres) {
                let genrePlaylist = this.getLastGenresPlaysPlaylist(this.genres[i]), extraInfo = '';
                if (genrePlaylist)
                    extraInfo = ' info: last index ' + genrePlaylist.currentIndex + ' of ' + genrePlaylist.files.length + ' tracks.';
                this.logAndPrint('pass', '|- ' + this.genres[i] + extraInfo);
            }
        }
        else
            this.logAndPrint('pass', '|- ' + 'empty'.red);
    }
    isRealGenre(genre) {
        if (!genre || !this._l.isString(genre) || this.genres.indexOf(genre) === -1)
            return false;
        return true;
    }
    isCurrentType(type) {
        return this.configs.schedulesType === type;
    }
    setSchedulesType(type) {
        if (this.isCurrentType(type)) {
            this.logAndPrint('passInfo', 'schedules type ' + type + ' already set.');
            return false;
        }
        this.stopPlay().then(() => {
            this.configs.schedulesType = type;
            this.logAndPrint('pass', 'schedules type set to ' + this.configs.schedulesType + '.');
            this.saveConfigs();
            this.playIfPlayTime().then(() => {
                this.logAndPrint('pass', 'starting stream.');
            }, (err) => {
                this.logAndPrint('err', err.message, err);
            });
        });
    }
    delGenresPlayList(genre) {
        if (this.isRealGenre(genre)) {
            this.delGenrePlaylist(genre);
            this.saveLastGenresPlays();
            let playdir = this.basePath + '/uploads/genres/' + genre;
            if (this.fs.existsSync(playdir + '/_playlist.m3u')) {
                this.fs.unlinkSync(playdir + '/_playlist.m3u');
                this.logAndPrint('pass', genre + ' playlist deleted.');
                return true;
            }
            else
                this.logAndPrint('fail', genre + ' is missing a playlist.');
        }
        else if (this.isAllString(genre)) {
            for (let i in this.genres) {
                this.delGenresPlayList(this.genres[i]);
            }
        }
        else
            this.logAndPrint('fail', 'genre folder is misspelled');
        return false;
    }
    isGenresMode() {
        return this.configs.schedulesType === 'genres';
    }
    isDaysMode() {
        return this.configs.schedulesType === 'days';
    }
    createGenresPlayList(genre, random) {
        random = random ? random : false;
        let i = 0, j, endi = 0, genredir, files = [], genres = this.getListOfGenresDirs(), rNum, fileName;
        if (this.isRealGenre(genre)) {
            i = genres.indexOf(genre);
            endi = i + 1;
        }
        else if (this.isAllString(genre)) {
            i = 0;
            endi = genres.length;
        }
        for (i; i < endi; i++) {
            genredir = this.basePath + '/uploads/genres/' + genres[i];
            if (this.fs.existsSync(genredir)) {
                files = this.getOnlyPlayFiles(this.fs.readdirSync(genredir + '/'));
                if (this.util.isArray(files)) {
                    if (files.length === 0)
                        this.logAndPrint('fail', 'no files exists in genre ' + genres[i]);
                    else {
                        if (!this.fs.existsSync(genredir + '/_playlist.m3u')) {
                            if (random)
                                for (j = files.length - 1; j >= 0; j--) {
                                    rNum = Math.floor(Math.random() * j);
                                    fileName = files[rNum];
                                    files[rNum] = files[j];
                                    files[j] = fileName;
                                }
                            for (j = 0; j < files.length; j++)
                                this.fs.appendFileSync(genredir + '/_playlist.m3u', files[j] + '\n');
                            if (this.fs.existsSync(genredir + '/_playlist.m3u'))
                                this.logAndPrint('pass', 'new playlist created in ' + genres[i]);
                            let playlist = {
                                files: files,
                                currentIndex: 0,
                                directory: genres[i]
                            };
                            if (this.updateLastGenresPlays(playlist))
                                this.saveLastGenresPlays();
                        }
                        else
                            this.logAndPrint('fail', 'playlist already exists in ' + genres[i]);
                    }
                }
            }
        }
    }
    saveSchedulesGenresAndSpliters() {
        let obj = {
            genres: this.schedulesGenres,
            spliters: this.schedulesGenresSpliters
        };
        return !!this.fs.writeFileSync(this.basePath + '/saves/tasksgenres.json', JSON.stringify(obj));
    }
    loadSchedulesGenresAndSpliters() {
        if (this.fs.existsSync(this.basePath + '/saves/tasksgenres.json')) {
            try {
                let obj = JSON.parse(this.fs.readFileSync(this.basePath + '/saves/tasksgenres.json'));
                this.schedulesGenres = obj.genres;
                this.schedulesGenresSpliters = obj.spliters;
            }
            catch (err) {
                this.fs.unlinkSync(this.basePath + '/saves/tasksgenres.json');
                this.logAndPrint('err', 'tasksgenres.json damaged, and deleted.', err);
                return false;
            }
        }
        return true;
    }
    setScheduleGenres(day, genresAndTimesArr) {
        if (!this.isRealDayName(day)) {
            this.logAndPrint('fail', day + ' day is misspelled.');
            return false;
        }
        if (!this.validateGenresAndTimes(genresAndTimesArr))
            return false;
        let times = [];
        for (let i = 0; i < genresAndTimesArr.length; i++) {
            if (i % 2) {
                times.push(genresAndTimesArr[i]);
            }
        }
        if (genresAndTimesArr.length > 2 && !this.validateSceduleTimes(day, times))
            return false;
        let dayIndex = this.weekday.indexOf(day);
        this.schedulesGenres[dayIndex] = [];
        this.schedulesGenresSpliters[dayIndex] = [];
        for (let i = 0; i < genresAndTimesArr.length; i++) {
            if (!(i % 2)) {
                this.schedulesGenres[dayIndex].push(genresAndTimesArr[i]);
            }
            else {
                this.schedulesGenresSpliters[dayIndex].push(genresAndTimesArr[i]);
            }
        }
        this.saveSchedulesGenresAndSpliters();
        this.logAndPrint('pass', day + ' timeline added: ' + this.buildTimeLineGenres(day));
        this.runSchedules();
        return true;
    }
    buildTimeLineGenres(day) {
        if (!this.isRealDayName(day))
            return '';
        let dayIndex = this.weekday.indexOf(day), timeline = '';
        if (this.schedulesGenres[dayIndex].length === 0)
            timeline += 'empty.'.red;
        else {
            timeline += this.schedules[dayIndex].startTime + ' ';
            for (let i in this.schedulesGenres[dayIndex]) {
                timeline += this.schedulesGenres[dayIndex][i] + ' ';
                if (i < this.schedulesGenresSpliters[dayIndex].length) {
                    if (this.is48Hours(this.schedulesGenresSpliters[dayIndex][i])) {
                        timeline += '(' + this.schedules[dayIndex].endDay + ' ';
                        timeline += !this.is24Hours(this.schedulesGenresSpliters[dayIndex][i]) ? this.make24Hours(this.schedulesGenresSpliters[dayIndex][i]) : this.schedulesGenresSpliters[dayIndex][i];
                        timeline += ') ';
                    }
                    else
                        timeline += !this.is24Hours(this.schedulesGenresSpliters[dayIndex][i]) ? this.make24Hours(this.schedulesGenresSpliters[dayIndex][i]) : this.schedulesGenresSpliters[dayIndex][i] + ' ';
                }
            }
            if (this.schedules[dayIndex].startDay !== this.schedules[dayIndex].endDay)
                timeline += '(' + this.schedules[dayIndex].endDay + ' ' + this.schedules[dayIndex].endTime + ')';
            else
                timeline += this.schedules[dayIndex].endTime;
        }
        return timeline.trim();
    }
    validateGenresAndTimes(genresAndTimesArr) {
        if (!(genresAndTimesArr.length % 2)) {
            this.logAndPrint('fail', 'use GENRE TIME GENRE TIME GENRE etc.. or GENRE. (TIME is only for split between GENRES)');
            return false;
        }
        for (let i = 0; i < genresAndTimesArr.length; i++) {
            if (!(i % 2)) {
                if (!this.isRealGenre(genresAndTimesArr[i])) {
                    this.logAndPrint('fail', genresAndTimesArr[i] + ' is not correct genre. use: genres');
                    return false;
                }
            }
            else if (!this.isRealTime(!this.is24Hours(genresAndTimesArr[i]) ? this.make24Hours(genresAndTimesArr[i]) : genresAndTimesArr[i])) {
                this.logAndPrint('fail', genresAndTimesArr[i] + ' is not correct time.');
                return false;
            }
        }
        return true;
    }
    make48Hours(time) {
        let h = parseInt(time.split(':')[0]) <= 24 ? parseInt(time.split(':')[0]) + 24 : parseInt(time.split(':')[0]), m = (parseInt(time.split(':')[1]) < 10) ? '0' + parseInt(time.split(':')[1]) : parseInt(time.split(':')[1]);
        return h + ':' + m;
    }
    make24Hours(time) {
        const h = parseInt(time.split(':')[0]) >= 24 ? parseInt(time.split(':')[0]) - 24 : parseInt(time.split(':')[0]), m = (parseInt(time.split(':')[1]) < 10) ? '0' + parseInt(time.split(':')[1]) : parseInt(time.split(':')[1]);
        const _h = h < 10 ? '0' + h : h.toString();
        return _h + ':' + m;
    }
    is48Hours(time) {
        return parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]) >= 1440;
    }
    is24Hours(time) {
        return parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]) < 1440;
    }
    getCurrentGenre(day) {
        let dayIndex = this.weekday.indexOf(day), currentTime = this.schedules[dayIndex].startDayIndex !== this.schedules[dayIndex].endDayIndex
            && this.schedules[dayIndex].endDayIndex === this.updateDay().index ? this.make48Hours(this.getTime()) : this.getTime(), genreIndex = 0, chr, cm, shr, sm;
        for (let i in this.schedulesGenresSpliters[dayIndex]) {
            chr = parseInt(currentTime.split(':')[0]);
            cm = parseInt(currentTime.split(':')[1]);
            shr = parseInt(this.schedulesGenresSpliters[dayIndex][i].split(':')[0]);
            sm = parseInt(this.schedulesGenresSpliters[dayIndex][i].split(':')[1]);
            if (shr * 60 + sm <= chr * 60 + cm) {
                genreIndex++;
            }
        }
        return this.schedulesGenres[dayIndex][genreIndex];
    }
    validateSceduleTimes(day, times) {
        if (!this.isRealDayName(day))
            return false;
        let dayIndex = this.weekday.indexOf(day), endTime = dayIndex !== this.schedules[dayIndex].endDayIndex ? this.make48Hours(this.schedules[dayIndex].endTime) : this.schedules[dayIndex].endTime, limitTime = this.schedules[dayIndex].startTime, lhr, lm, chr, cm, ehr, em;
        for (let i in times) {
            lhr = parseInt(limitTime.split(':')[0]);
            lm = parseInt(limitTime.split(':')[1]);
            chr = parseInt(times[i].split(':')[0]);
            cm = parseInt(times[i].split(':')[1]);
            ehr = parseInt(endTime.split(':')[0]);
            em = parseInt(endTime.split(':')[1]);
            if (lhr * 60 + lm < chr * 60 + cm && chr * 60 + cm < ehr * 60 + em)
                limitTime = times[i];
            else {
                this.logAndPrint('fail', times[i] + ' split time is wrong. (split must be greater than start time and less than endtime)');
                return false;
            }
        }
        return true;
    }
    loadGenresPlayList(day) {
        this.playlist = {
            files: [],
            currentIndex: 0,
            path: '',
            directory: '',
            mtimeMs: 0
        };
        if (!this.isRealDayName(day))
            return false;
        let genre = this.getCurrentGenre(day);
        if (!genre)
            return false;
        this.playlist.directory = genre;
        this.playlist.path = this.basePath + '/uploads/genres/' + this.playlist.directory;
        if (!this.fs.existsSync(this.playlist.path + '/_playlist.m3u')) {
            this.logAndPrint('info', 'creating this.playlist of ' + this.playlist.directory);
            this.createPlayListSwitch([this.playlist.directory], this.autoRandomMissingPlaylist, false);
        }
        if (this.fs.existsSync(this.playlist.path + '/_playlist.m3u')) {
            ;
            let data = this.fs.readFileSync(this.playlist.path + '/_playlist.m3u', {
                encoding: 'utf8'
            });
            this.fs.stat(this.playlist.path + '/_playlist.m3u', (error, stats) => {
                if (error) {
                    this.logAndPrint('err', ` ${error.message}`, error);
                }
                else {
                    if (stats.mtimeMs > this.playlist.mtimeMs) {
                        this.playlist.mtimeMs = stats.mtimeMs;
                    }
                }
            });
            if (data) {
                this.logAndPrint('info', 'loading ' + this.playlist.directory + ' playlist.');
                this.playlist.files = this.getOnlyPlayFiles(data.split('\n'));
                this.loadLastPlay();
            }
            else {
                this.logAndPrint('warningInfo', this.playlist.directory + ' playlist is empty');
                this.playlist.files = [];
            }
        }
        else {
            this.logAndPrint('warningInfo', this.playlist.directory + ' folder is empty');
            this.playlist.files = [];
        }
    }
    shutdownIfSet() {
        if (this.configs.autoShutdown) {
            this.logAndPrint('info', 'shuting down...');
            this.exec('shutdown -h now', (error, stdout, stderr) => {
                if (error) {
                    this.logAndPrint('err', `Exec error from auto shutdown:: ${error.message}`, error);
                    return;
                }
                if (stderr) {
                    this.logAndPrint('fail', `stderr from auto shutdown:: ${stderr}`);
                }
            });
        }
    }
    setAutoShutdown(status) {
        this.configs.autoShutdown = status;
        if (status)
            this.logAndPrint('pass', 'auto shutdown after task end set ' + 'ON'.green);
        else if (!status)
            this.logAndPrint('pass', 'auto shutdown after task end set ' + 'OFF'.red);
        this.saveConfigs();
    }
    getMillis(stringData) {
        let temp;
        if (this.isJsonObject(stringData)) {
            temp = JSON.parse(stringData);
            if (temp.hasOwnProperty('currentDateTime') && temp.currentDateTime.toString().length === 22) {
                //this.logAndPrint('info', 'diag 1' + temp);
                temp = (temp.currentDateTime);
            }
        }
        else if (stringData.toString().length === 22) {
            this.logAndPrint('info', 'chinga 2' + temp);
            temp = (stringData);
        }
        return temp;
    }
    skipToNextMillisLink() {
        this.milisLinks.index = (this.milisLinks.index + 1) % this.milisLinks.links.length;
        if (this.milisLinks.index === 0 && this.milisLinks.links.length > 1) {
            this.milisLinks.fullCircle = true;
        }
        else if (this.milisLinks.links.length === 1) {
            this.milisLinks.fullCircle = true;
        }
        return this.milisLinks.fullCircle;
    }
    /*
    The music is gonna be played when the function  initialize(); is triggered
    in earlier versions the initialize trigger was in eventEmitter.on('timeSet', initialize);
    but after the api of time was shuted down we moved the trigger after the init steps.
    */
    mainStart() {
        return __awaiter(this, void 0, void 0, function* () {
            this.makeMaindirs();
            this.makeDaydirs();
            this.chmodRAll();
            this.loadConfigs();
            this.loadPassport();
            this.loadEmail();
            this.loadWifiCheck();
            this.loadGenres();
            this.initialize();
            if (this.wifiCheck.status) {
                this.checkWifi();
            }
            this.eventEmitter.on('timeSet', () => this.chmodRAll);
            this.eventEmitter.on('timeNotSet', (err) => {
                let fullCircle = this.skipToNextMillisLink();
                if (err.code === 0 && !fullCircle) {
                    this.logAndPrint('fail', 'next timeset attempt in 10s');
                    clearTimeout(this.setTimeTimeout);
                    this.setTimeTimeout = setTimeout(() => this.setTime, 10 * 1000);
                }
                else if (err.code === 1 && !fullCircle) {
                    this.logAndPrint('info', 'next timeset attempt in 10s');
                    clearTimeout(this.setTimeTimeout);
                    this.setTimeTimeout = setTimeout(() => this.setTime, 10 * 1000);
                }
                else if (fullCircle) {
                    this.logAndPrint('info', 'next timeset attempt in 60s after attempting all servers');
                    clearTimeout(this.setTimeTimeout);
                    this.setTimeTimeout = setTimeout(() => this.setTime, 60 * 1000);
                    this.milisLinks.fullCircle = false;
                }
            });
            this.enableRTC().then(this.setTime, this.setTime);
        });
    }
    initialize() {
        clearTimeout(this.setTimeTimeout);
        this.stopPlay().then(() => {
            this.loadLastGenresPlays();
            this.loadSchedules();
            this.loadSchedulesGenresAndSpliters();
            setTimeout(() => this.runSchedules(), 5 * 1000);
        });
        /*this.sendMail();
        setInterval(() => {
            this.sendMailIfIpChange();
        }, 3600 * 1000);
*/
        if (this.wifiCheck.status)
            this.wifiCheckIntervalObject = setInterval(() => {
                this.checkWifi();
            }, this.wifiCheck.minutes * 60 * 1000);
    }
}
exports.Ropongi = Ropongi;
//# sourceMappingURL=ropongi.js.map