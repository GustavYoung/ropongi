'use strict';
var fs = new require('fs'),
    os = new require('os'),
    colors = require('colors'),
    _l = new require('lodash'),
    schedule = require('node-schedule'),
    util = require('util'),
    rl = require('readline').createInterface(process.stdin, process.stdout),
    exec = require('child_process').exec,
    execFile = require('child_process').execFile,
    spawn = require('child_process').spawn,
    nodemailer = require('nodemailer'),
    http = require('http'),
    events = require('events'),
    eventEmitter = new events.EventEmitter(),
    ip = require('ip'),
    q = require('q'),
    omx = require('omx-manager'),
    weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    genres = [],
    schedulesGenres = [
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ],
    schedulesGenresSpliters = [
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ],
    milisLinks = {
        index: 0,
        fullCircle: false,
        links: ['http://currentmillis.com/time/minutes-since-unix-epoch.php', 'http://worldclockapi.com/api/json/est/now']
    },
    version = '0.7.1',
    filetypes = ['mkv', 'mp4', 'mp3', 'avi', 'mpeg'],
    outputTypes = ['both', 'hdmi', 'local'],
    schedulesType = ['days', 'genres'],
    appdirs = ['uploads', 'saves', 'uploads/sharedday', 'logs', 'uploads/genres'],
    playlist = {
        files: [],
        currentIndex: 0,
        path: '',
        directory: ''
    },
    sharedday = __dirname + '/uploads/sharedday',
    lastPlay = {
        files: [],
        currentIndex: 0,
        directory: ''
    },
    lastGenresPlays = [],
    today = {
        name: null,
        index: null,
        dir: null
    },
    schedules = [],
    schedulesStart = [],
    schedulesStop = [],
    schedulesStartObject = [],
    schedulesStopObject = [],
    regularExpressionTime = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
    streaming = false,
    passport = {
        name: 'n/a',
        place: 'n/a',
        address: 'n/a'
    },
    autoRandomMissingPlaylist = false,
    omxconfig = {
        '-o': 'local',
        '-b': false,
        '-g': true,
	'--advanced': false,
	'-M': false,
	'-w': false
    },
    configs = {
        output: 'local',
        logs: true,
        schedulesType: 'genres',
        autoShutdown: false
    },
    email = {
        service: 'gmail',
        auth: {
            user: '@@gmail.com',
            pass: '0'
        }
    },
    transporter = nodemailer.createTransport(email),
    mailOptions = {
        from: passport.name,
        to: 'gus@guxmalstream.mx',
        subject: 'uStream ' + passport.name,
        text: 'no messege'
    },
    networkInfo = {
        localIp: null,
        networkIp: null
    },
    wifiCheck = {
        status: true,
        minutes: 10
    },
    timeCheck = {
        status: false,
        minutes: 30
    },
    wifiCheckIntervalObject = null,
    rtc = false,
    setTimeTimeout;
omx.setOmxCommand('/usr/bin/omxplayer');
omx.enableHangingHandler();
omx.on('play', function(path) {
    var pathArray = path.split('/');
    if (!pathArray.length) return;
    var file = pathArray.pop();
    logAndPrint('info', 'playing index: ' + (playlist.files.indexOf(file) + 1) + '/' + playlist.files.length + ' : ' + file + ' in ' + playlist.directory + ' folder.');
});
omx.on('stderr', function(err) {
    logAndPrint('warningInfo', 'omxplayer error: ' + err);
});
// omx.on('stdout', function(err) {
//     logAndPrint('warningInfo', 'omxplayer stdout: ' + err);
// });
function chmodRAll() {
    exec('sudo chmod -R 777 *');
}

function checkWifi() {
    exec('sudo ifconfig wlan0', function(error, stdout, stderr) {
        if (stdout && stdout.indexOf('inet addr:') === -1) {
            exec('sudo ifdown --force wlan0', function(error, stdout, stderr) {
                setTimeout(function() {
                    exec('sudo ifup --force wlan0', function(error, stdout, stderr) {
                        // logAndPrint('pass', 'wifi restarted.');
                    });
                }, 5 * 1000);
            });
        }
    });
}

function updateToRTC(cb) {
    if (rtc) {
        exec('sudo hwclock -w', function(err, stdout, stderr) {
            if (!err) {
                logAndPrint('info', 'RTC updated from system clock: ' + new Date());
            } else if (err) {
                logAndPrint('warningInfo', 'RTC couldnt be updated from system time, RTC error');
            }
            if (cb) cb(err);
        });
    } else {
        if (cb) cb({
            err: 'no RTC available'
        });
    }
}

function updateFromRTC(cb) {
    if (rtc) {
        exec('sudo hwclock -s', function(err, stdout, stderr) {
            if (!err) {
                logAndPrint('info', 'system clock updated from RTC: ' + new Date());
            } else if (err) {
                logAndPrint('warningInfo', 'system time couldnt be updated from RTC, RTC error');
            }
            if (cb) cb(err);
        });
    } else {
        if (cb) cb({
            err: 'no RTC available'
        });
    }
}

function enableRTC(cb) {
    var deferred = q.defer();
    exec('sudo echo ds1307 0x68 > /sys/class/i2c-adapter/i2c-1/new_device', function(err, stdout, stderr) {
        rtc = (!err || err && err.code == 1) ? true : false;
        if (rtc) {
            deferred.resolve();
        } else {
            deferred.reject(err);
        }
    });
    return deferred.promise;
}

function isJsonObject(data) {
    var object;
    try {
        object = JSON.parse(data);
    } catch (e) {
        return false;
    }
    return (typeof object === 'object');
}

function resetMilisLinks() {
    milisLinks.index = 0;
    milisLinks.fullCircle = false;
}

function setTimeManual(millis) {
    if (millis && millis.toString().length === 13) {
        clearTimeout(setTimeTimeout);
        exec('sudo date --set="' + new Date(parseInt(millis)) + '"', function(err, stdout, stderr) {
            if (stdout) {
                logAndPrint('info', 'time set to: ' + new Date());
                updateToRTC();
                eventEmitter.emit('timeSet');
                resetMilisLinks();
            }
        });
    }
}

function setTimeProxy() {
    logAndPrint('info', 'attempt to load time from: ' + milisLinks.links[milisLinks.index].split('/')[2]);
    var proxy = {
        hostname: '192.168.200.2',
        port: 1111,
        path: milisLinks.links[milisLinks.index]
    };
    http.get(proxy, function(res) {
        var stringData = '';
        res.on("data", function(rdata) {
            stringData += rdata;
        });
        res.on('end', function() {
            var millis = getMillis(stringData);
            if (millis) {
                exec('sudo date --set="' + new Date(millis) + '"', function(err, stdout, stderr) {
                    if (stdout) {
                        logAndPrint('info', 'time set to: ' + new Date());
                        updateToRTC();
                        eventEmitter.emit('timeSet');
                        resetMilisLinks();
                    }
                });
            } else {
                logAndPrint('warningInfo', 'time not set, bad response from millis server: ' + milisLinks.links[milisLinks.index]);
                updateFromRTC(function(err) {
                    if (err) {
                        eventEmitter.emit('timeNotSet', {
                            msg: 'bad response from ' + milisLinks.links[milisLinks.index],
                            code: 0
                        });
                    } else {
                        eventEmitter.emit('timeSet');
                        resetMilisLinks();
                    }
                });
            }
        });
    }).on('error', function(err) {
        logAndPrint('warningInfo', 'time not set, no response from millis server: ' + milisLinks.links[milisLinks.index]);
        updateFromRTC(function(err) {
            if (err) {
                eventEmitter.emit('timeNotSet', {
                    msg: 'no response from ' + milisLinks.links[milisLinks.index],
                    code: 1
                });
            } else {
                eventEmitter.emit('timeSet');
                resetMilisLinks();
            }
        });
    });
}

function setTime() {
    logAndPrint('info', 'attempt to load time from: ' + milisLinks.links[milisLinks.index].split('/')[2]);
    http.get(milisLinks.links[milisLinks.index], function(res) {
        var stringData = '';
        res.on("data", function(rdata) {
            stringData += rdata;
            logAndPrint('info', 'que mamada' + stringData);
        });
        res.on('end', function() {
            var millis = getMillis(stringData);
            if (millis) {
                exec('sudo date --set="' + new Date(millis) + '"', function(err, stdout, stderr) {
                    if (stdout) {
                        logAndPrint('info', 'time set to: ' + new Date());
                        updateToRTC();
                        eventEmitter.emit('timeSet');
                        resetMilisLinks();
                    }
                });
            } else {
                logAndPrint('warningInfo', 'time not set, bad response from millis server: ' + milisLinks.links[milisLinks.index]);
                updateFromRTC(function(err) {
                    if (err) {
                        eventEmitter.emit('timeNotSet', {
                            msg: 'bad response from ' + milisLinks.links[milisLinks.index],
                            code: 0
                        });
                    } else {
                        eventEmitter.emit('timeSet');
                        resetMilisLinks();
                    }
                });
            }
        });
    }).on('error', function(err) {
        logAndPrint('warningInfo', 'time not set, no response from millis server: ' + milisLinks.links[milisLinks.index]);
        updateFromRTC(function(err) {
            if (err) {
                eventEmitter.emit('timeNotSet', {
                    msg: 'no response from ' + milisLinks.links[milisLinks.index],
                    code: 1
                });
            } else {
                eventEmitter.emit('timeSet');
                resetMilisLinks();
            }
        });
    });
}

function logError(data) {
    var path = __dirname + '/logs',
        fileName = 'omxplayer_errors.log';
    if (configs.logs) fs.appendFile(path + '/' + fileName, 'command: ' + input + '\n', function(err) {
        if (err) console.log('info: '.red + '(' + getTime() + ') ' + 'failing to write log, ' + err);
    });
}

function logInput(input) {
    var path = __dirname + '/logs',
        fileName = getDate() + '.log';
    if (configs.logs) fs.appendFile(path + '/' + fileName, 'command: ' + input + '\n', function(err) {
        if (err) console.log('info: '.red + '(' + getTime() + ') ' + 'failing to write log, ' + err);
    });
}

function logAndPrint(type, output) {
    if (type === 'pass') console.log('pass: '.green + '(' + getTime() + ') ' + output);
    else if (type === 'passInfo') console.log('pass: '.cyan + '(' + getTime() + ') ' + output);
    else if (type === 'info') console.log('info: '.cyan + '(' + getTime() + ') ' + output);
    else if (type === 'warningInfo') console.log('info: '.red + '(' + getTime() + ') ' + output);
    else if (type === 'fail') console.log('fail: '.red + '(' + getTime() + ') ' + output);
    else if (type === 'err') console.log('err: '.red + '(' + getTime() + ') ' + output);
    var path = __dirname + '/logs',
        fileName = getDate() + '.log';
    if (configs.logs) fs.appendFile(path + '/' + fileName, type + ': (' + getTime() + ') ' + output + '\n', function(err) {
        if (err) console.log('info: '.red + '(' + getTime() + ') ' + 'failing to write log, ' + err);
    });
}

function saveWifiCheck() {
    return !!fs.writeFileSync(__dirname + '/saves/wificheck.json', JSON.stringify(wifiCheck));
}

function saveConfigs() {
    return !!fs.writeFileSync(__dirname + '/saves/configs.json', JSON.stringify(configs));
}

function savePassport() {
    return !!fs.writeFileSync(__dirname + '/saves/passport.json', JSON.stringify(passport));
}

function saveEmail() {
    return !!fs.writeFileSync(__dirname + '/saves/email.json', JSON.stringify(email));
}

function saveGenres() {
    return !!fs.writeFileSync(__dirname + '/saves/genres.json', JSON.stringify(genres));
}

function addGenres(genresArr) {
    var addedGenres = '';
    for (var i in genresArr) {
        genresArr[i] = genresArr[i].toLowerCase();
        if (genres.indexOf(genresArr[i]) === -1 && genresArr[i] !== 'all') {
            addedGenres += genresArr[i] + ' ';
            genres.push(genresArr[i]);
            if (!fs.existsSync(__dirname + '/uploads/genres/' + genresArr[i])) {
                fs.mkdirSync(__dirname + '/uploads/genres/' + genresArr[i]);
            }
        }
    }
    chmodRAll();
    saveGenres();
    addedGenres.trim();
    if (addedGenres.length !== 0) logAndPrint('pass', 'new genres: ' + addedGenres);
    else logAndPrint('pass', 'no new genres added.');
}

function isUsedGenre(genre) {
    for (var i in schedulesGenres)
        if (schedulesGenres[i].indexOf(genre.toLowerCase()) !== -1) return true;
    return false;
}

function delGenres(genresArr) {
    var deletedGenres = '',
        usedGenres = '';
    var genresArrLength = genresArr.length;
    for (var i = genresArrLength; i > 0; i--) {
        genresArr[i - 1] = genresArr[i - 1].toLowerCase();
        if (isUsedGenre(genresArr[i - 1])) {
            usedGenres += genresArr[i - 1] + ' ';
            genresArr.splice(i - 1, 1);
        } else if (genres.indexOf(genresArr[i - 1]) !== -1) deletedGenres += genresArr[i - 1] + ' ';
    }
    if (lastGenresPlays.length === 0) loadLastGenresPlays();
    var modifed = false;
    for (var i in genresArr) {
        delGenrePlaylist(genresArr[i]);
    }
    saveLastGenresPlays();
    if (modifed) saveLastGenresPlays();
    genres = _l.difference(genres, genresArr);
    saveGenres();
    deletedGenres.trim();
    usedGenres.trim();
    if (usedGenres.length !== 0) logAndPrint('passInfo', 'genres in use: ' + usedGenres);
    if (deletedGenres.length !== 0) logAndPrint('pass', 'removed genres: ' + deletedGenres);
    else logAndPrint('pass', 'no genres removed.');
}

function loadGenres() {
    var tempGenres = genres;
    if (fs.existsSync(__dirname + '/saves/genres.json')) {
        try {
            genres = JSON.parse(fs.readFileSync(__dirname + '/saves/genres.json'));
            for (var i in genres)
                if (!fs.existsSync(__dirname + '/uploads/genres/' + genres[i])) fs.mkdirSync(__dirname + '/uploads/genres/' + genres[i]);
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/genres.json');
            logAndPrint('fail', 'genres.json damaged, and deleted.');
            genres = tempGenres;
            return false;
        }
    }
    return true;
}

function loadEmail() {
    var tempEmail = email;
    if (fs.existsSync(__dirname + '/saves/email.json')) {
        try {
            email = JSON.parse(fs.readFileSync(__dirname + '/saves/email.json'));
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/email.json');
            logAndPrint('fail', 'email.json damaged, and deleted.');
            email = tempEmail;
            return false;
        }
    }
    transporter = nodemailer.createTransport(email);
    return true;
}

function loadConfigs() {
    var tempConfigs = configs;
    if (fs.existsSync(__dirname + '/saves/configs.json')) {
        try {
            configs = JSON.parse(fs.readFileSync(__dirname + '/saves/configs.json'));
            omxconfig['-o'] = configs.output;
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/configs.json');
            logAndPrint('fail', 'configs.json damaged, and deleted.');
            configs = tempConfigs;
            return false;
        }
    }
    return true;
}

function loadPassport() {
    var tempConfigs = passport;
    if (fs.existsSync(__dirname + '/saves/passport.json')) {
        try {
            passport = JSON.parse(fs.readFileSync(__dirname + '/saves/passport.json'));
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/passport.json');
            logAndPrint('fail', 'passport.json damaged, and deleted.');
            passport = tempConfigs;
            return false;
        }
    }
    return true;
}

function loadWifiCheck() {
    var tempWifiCheck = wifiCheck;
    if (fs.existsSync(__dirname + '/saves/wificheck.json')) {
        try {
            wifiCheck = JSON.parse(fs.readFileSync(__dirname + '/saves/wificheck.json'));
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/wificheck.json');
            logAndPrint('fail', 'wificheck.json damaged, and deleted.');
            wifiCheck = tempWifiCheck;
            return false;
        }
    }
    return true;
}

function saveLastPlay() {
    if (isDaysMode()) {
        lastPlay = {
            files: playlist.files,
            currentIndex: playlist.currentIndex,
            directory: playlist.directory
        };
        fs.writeFileSync(__dirname + '/saves/lastplay.json', JSON.stringify(lastPlay));
    } else if (isGenresMode()) {
        var modifed = false;
        for (var i in lastGenresPlays) {
            if (lastGenresPlays[i].directory === playlist.directory) {
                lastGenresPlays[i].files = playlist.files;
                lastGenresPlays[i].currentIndex = playlist.currentIndex;
                modifed = true;
                break;
            }
        }
        if (!modifed) lastGenresPlays.push({
            files: playlist.files,
            currentIndex: playlist.currentIndex,
            directory: playlist.directory
        });
        fs.writeFileSync(__dirname + '/saves/lastgenresplays.json', JSON.stringify(lastGenresPlays));
    }
}

function loadLastPlay() {
    if (isDaysMode()) {
        var tempLastPlay = lastPlay;
        if (fs.existsSync(__dirname + '/saves/lastplay.json')) {
            try {
                lastPlay = JSON.parse(fs.readFileSync(__dirname + '/saves/lastplay.json'));
            } catch (err) {
                fs.unlinkSync(__dirname + '/saves/lastplay.json');
                logAndPrint('fail', 'lastplay.json damaged, and deleted.');
                lastPlay = tempLastPlay;
                return false;
            }
        }
        if (_l.difference(playlist.files, lastPlay.files).length === 0 && playlist.directory === lastPlay.directory) playlist.currentIndex = lastPlay.currentIndex >= 0 ? lastPlay.currentIndex : 0;
        return true;
    } else if (isGenresMode()) {
        var tempLastGenresPlays = lastGenresPlays;
        if (fs.existsSync(__dirname + '/saves/lastgenresplays.json')) {
            try {
                lastGenresPlays = JSON.parse(fs.readFileSync(__dirname + '/saves/lastgenresplays.json'));
            } catch (err) {
                fs.unlinkSync(__dirname + '/saves/lastgenresplays.json');
                logAndPrint('fail', 'lastgenresplays.json damaged, and deleted.');
                lastGenresPlays = tempLastGenresPlays;
                return false;
            }
        }
        for (var i in lastGenresPlays) {
            if (lastGenresPlays[i].directory === playlist.directory && _l.difference(playlist.files, lastGenresPlays[i].files).length === 0) {
                playlist.currentIndex = lastGenresPlays[i].currentIndex >= 0 ? lastGenresPlays[i].currentIndex : 0;
            }
        }
        return true;
    }
}

function loadLastGenresPlays() {
    var tempLastGenresPlays = lastGenresPlays;
    if (fs.existsSync(__dirname + '/saves/lastgenresplays.json')) {
        try {
            lastGenresPlays = JSON.parse(fs.readFileSync(__dirname + '/saves/lastgenresplays.json'));
            return true;
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/lastgenresplays.json');
            logAndPrint('fail', 'lastgenresplays.json damaged, and deleted.');
            lastGenresPlays = tempLastGenresPlays;
            return false;
        }
    }
}

function saveLastGenresPlays() {
    return !!fs.writeFileSync(__dirname + '/saves/lastgenresplays.json', JSON.stringify(lastGenresPlays));
}

function setWifiCheck(status, minutes) {
    if (wifiCheckIntervalObject) clearInterval(wifiCheckIntervalObject);
    if (status === true) {
        wifiCheck.status = true;
        if (minutes && minutes > 0) wifiCheck.minutes = minutes;
        else wifiCheck.minutes = 30;
        wifiCheckIntervalObject = setInterval(function() {
            checkWifi();
        }, wifiCheck.minutes * 60 * 1000);
        logAndPrint('pass', 'wifi check set ON, interval: ' + wifiCheck.minutes + ' minutes.');
    } else if (status === false) {
        wifiCheck.status = false;
        logAndPrint('pass', 'wifi check set OFF.');
    }
    saveWifiCheck();
}

function setConfigs(field, data) {
    switch (field) {
        case 'output':
            if (outputTypes.indexOf(data) !== -1) {
                configs.output = data;
                omxconfig['-o'] = configs.output;
            } else {
                return false;
            }
            break;
        default:
            return false;
            break;
    }
    saveConfigs();
    return true;
}

function setPassport(field, data) {
    switch (field) {
        case 'name':
            passport.name = data;
            break;
        case 'place':
            passport.place = data;
            break;
        case 'address':
            passport.address = data;
            break;
        default:
            return false;
            break;
    }
    savePassport();
    return true;
}

function setEmail(e, p) {
    email.auth.user = e;
    email.auth.pass = p;
    saveEmail();
    return true;
}

function sendMail() {
    logAndPrint('Info', 'mail aborted ');
    //mailOptions.subject = 'uxmalstream ' + passport.name + ' turned on';
    //mailOptions.text = passport.place + ' at ' + passport.address + ' ';
    //networkInfo.localIp = ip.address();
    //mailOptions.text += 'streamer local ip: ' + networkInfo.localIp + ' ';
    //exec('curl icanhazip.com', function(error, stdout, stderr) {
    //    if (stdout) {
    //        networkInfo.networkIp = stdout.toString().replace(/\s+/g, " ").trim();
    //        mailOptions.text += 'streamer ip: ' + networkInfo.networkIp;
    //        transporter.sendMail(mailOptions, function(error, info) {
    //            if (error) {
    //                logAndPrint('warningInfo', 'mail not sent: ' + error);
    //            } else {
    //                logAndPrint('info', 'mail sent to: ' + mailOptions.to);
    //            }
    //        })
    //    }
    //});
}

function sendMailIfIpChange() {
    logAndPrint('info', 'mail abortado cambio de IP');
    //exec('curl icanhazip.com', function(error, stdout, stderr) {
    //    if (stdout) {
    //        if (networkInfo.networkIp === stdout.toString().replace(/\s+/g, " ").trim() && networkInfo.localIp === ip.address()) return;
    //        mailOptions.subject = 'uxmalstream ' + passport.name + ' ip change';
    //        mailOptions.text = passport.place + ' at ' + passport.address + ' ';
    //        networkInfo.localIp = ip.address();
    //        networkInfo.networkIp = stdout.toString().replace(/\s+/g, " ").trim();
    //        mailOptions.text += 'streamer local ip: ' + networkInfo.localIp + ' ';
    //        mailOptions.text += 'streamer ip: ' + networkInfo.networkIp;
    //        transporter.sendMail(mailOptions, function(error, info) {
    //            if (error) {
    //                logAndPrint('warningInfo', 'mail not sent: ' + error);
    //            } else {
    //                logAndPrint('info', 'mail sent to: ' + mailOptions.to);
    //            }
    //        })
    //    }
    //});
}
process.on('exit', function(code) {
    stopPlay().then(function() {
        logAndPrint('info', 'UxmalStream exited: ' + code);
    });
});
process.on('uncaughtException', function(err) {
    logAndPrint('warningInfo', 'Caught exception message: ' + err.message);
    logAndPrint('warningInfo', 'Caught exception at line: ' + err.lineNumber);
});
rl.on('line', function(line) {
    var arr;
    logInput(line);
    switch (line.trim().split(' ')[0]) {
        case 'mail':
            sendMail();
            break;
        case 'help':
            printHelp();
            break;
        case 'stop':
            stopPlay().then(function(data) {
                logAndPrint('pass', data.message);
            });
            break;
        case 'skip':
            skipPlay(line.trim().split(' ')[1]);
            break;
        case 'start':
            playIfPlayTime().then(function() {
                logAndPrint('pass', 'starting stream.');
            }, function(err) {
                logAndPrint('pass', err.message);
            });
            break;
        case 'tasks':
            displaySchedules();
            break;
        case 'genres':
            printGenres();
            break;
        case 'info':
            currentStatus();
            break;
        case 'update':
            switch (line.trim().split(' ')[1]) {
                case 'time':
                    setTime();
                    break;
                default:
                    logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
            }
            break;
        case 'make':
            switch (line.trim().split(' ')[1]) {
                case 'playlist':
                    arr = line.trim().split(' ').slice(2);
                    if (arr.length > 0 && arr.length < 3) createPlayListSwitch(arr, false, false);
                    else logAndPrint('fail', 'input must be 1 parameter.');
                    break;
                case 'playlist+shared':
                    arr = line.trim().split(' ').slice(2);
                    if (arr.length > 0 && arr.length < 3) createPlayListSwitch(arr, false, true);
                    else logAndPrint('fail', 'input must be 1 parameter.');
                    break;
                case 'random':
                    switch (line.trim().split(' ')[2]) {
                        case 'playlist':
                            arr = line.trim().split(' ').slice(3);
                            if (arr.length > 0 && arr.length < 3) createPlayListSwitch(arr, true, false);
                            else logAndPrint('fail', 'input must be 1 parameter.');
                            break;
                    }
                    break;
                case 'random+shared':
                    switch (line.trim().split(' ')[2]) {
                        case 'playlist':
                            arr = line.trim().split(' ').slice(3);
                            if (arr.length > 0 && arr.length < 3) createPlayListSwitch(arr, true, true);
                            else logAndPrint('fail', 'input must be 1 parameter.');
                            break;
                    }
                    break;
                default:
                    logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
            }
            break;
        case 'add':
            switch (line.trim().split(' ')[1]) {
                case 'genres':
                    arr = line.trim().split(' ').slice(2);
                    addGenres(arr);
                    break;
                default:
                    logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
            }
            break;
        case 'del':
            switch (line.trim().split(' ')[1]) {
                case 'genres':
                    arr = line.trim().split(' ').slice(2);
                    delGenres(arr);
                    break;
                case 'playlist':
                    arr = line.trim().split(' ').slice(2);
                    delPlayListSwitch(arr);
                    break;
                case 'task':
                    arr = line.trim().split(' ').slice(2);
                    if (arr.length === 1) delSchedule(arr[0]);
                    else logAndPrint('fail', 'input must be 1 parameter.');
                    break;
                default:
                    logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
            }
            break;
        case 'set':
            switch (line.trim().split(' ')[1]) {
                case 'time':
                    var data = line.trim().split(' ').slice(2)[0];
                    if (data.toString().length === 13) setTimeManual(data);
                    else logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
                case 'email':
                    var arr = line.trim().split(' ').slice(2);
                    if (arr.length === 2) setEmail(arr[0], arr[1]);
                    else logAndPrint('fail', 'input must be 2 parameters (email pass).'.bold);
                    break;
                case 'task':
                    var arr = line.trim().split(' ').slice(2);
                    if (arr.length === 3) addSchedule(arr[0], arr[1], arr[2]);
                    else if (arr.length === 4) addSchedule(arr[0], arr[1], arr[2], arr[3]);
                    else logAndPrint('fail', 'input must be 3 or 4 parameters.'.bold);
                    break;
                case 'taskgenres':
                    var day = line.trim().split(' ')[2]
                    var arr = line.trim().split(' ').slice(3);
                    setScheduleGenres(day, arr);
                    break;
                case 'passport':
                    var field = line.trim().split(' ')[2],
                        data = line.trim().split(' ').slice(3).join(' ');
                    switch (field) {
                        case 'name':
                            setPassport(field, data);
                            break;
                        case 'place':
                            setPassport(field, data);
                            break;
                        case 'address':
                            setPassport(field, data);
                            break;
                        default:
                            logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'output':
                    var data = line.trim().split(' ').slice(2)[0];
                    if (!setConfigs('output', data)) logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
                case 'wificheck':
                    var field = line.trim().split(' ')[2],
                        data = line.trim().split(' ').slice(3).join(' ');
                    switch (field) {
                        case 'on':
                            setWifiCheck(true, data);
                            break;
                        case 'off':
                            setWifiCheck(false);
                            break;
                        default:
                            logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'autoshutdown':
                    var field = line.trim().split(' ')[2];
                    switch (field) {
                        case 'on':
                            setAutoShutdown(true);
                            break;
                        case 'off':
                            setAutoShutdown(false);
                            break;
                        default:
                            logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                            break;
                    }
                    break;
                case 'logs':
                    var field = line.trim().split(' ')[2];
                    switch (field) {
                        case 'on':
                            setLogs(true);
                            break;
                        case 'off':
                            setLogs(false);
                            break;
                    }
                    break;
                case 'taskstype':
                    var field = line.trim().split(' ')[2];
                    switch (field) {
                        case 'days':
                            setSchedulesType(field);
                            break;
                        case 'genres':
                            setSchedulesType(field);
                            break;
                        default:
                            logAndPrint('fail', line.trim() + ' bad command, schedules type can be days or genres.');
                            break;
                    }
                    break;
                default:
                    logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
                    break;
            }
            break;
        default:
            logAndPrint('fail', line.trim() + ' bad command, use help for list of commands.');
            break;
    }
});

function setLogs(bool) {
    configs.logs = bool;
    var status = configs.logs ? 'on' : 'off';
    logAndPrint('pass', 'logging turned ' + status + '.');
    saveConfigs();
}

function printHelp() {
    logAndPrint('pass', 'UxmalStream commands list:')
    logAndPrint('pass', '| * DAY = { all days,' + weekday + ' }');
    logAndPrint('pass', '| * GENRE = { all genres,' + genres.toString() + ' }');
    logAndPrint('pass', '| * STATUS == on,off');
    logAndPrint('pass', '| * NUM == index of file in playlist, starts from 0');
    logAndPrint('pass', '| start | starts streaming if task set.');
    logAndPrint('pass', '| stop | stop streaming.');
    logAndPrint('pass', '| skip | skips to the next file');
    logAndPrint('pass', '| skip NUM | skips to the next NUM index file');
    logAndPrint('pass', '| set taskstype TYPE | TYPE == ' + schedulesType.toString().red);
    logAndPrint('pass', '| set task DAY HH:MM DAY HH:MM');
    logAndPrint('pass', '| set task DAY HH:MM HH:MM');
    logAndPrint('pass', '| set taskgenres GENRE TIME GENRE... or GENRE');
    logAndPrint('pass', '| set passport FIELD DATA | FIELD == name,place,address');
    logAndPrint('pass', '| set output TYPE | TYPE == ' + outputTypes);
    logAndPrint('pass', '| set wificheck STATUS MINUTES | MINUTES == 1,2, etc.. (default 10min)');
    logAndPrint('pass', '| set email EMAIL PASS');
    logAndPrint('pass', '| set logs STATUS');
    logAndPrint('pass', '| set autoshutdown STATUS');
    logAndPrint('pass', '| set time MILLIS | get from http://currentmillis.com/ OR http://millis.uxmalstream.mx:1337/api/millis OR js: new Date().valueOf()');
    logAndPrint('pass', '| add genres GENRES');
    logAndPrint('pass', '| del task DAY');
    logAndPrint('pass', '| del playlist DAY or GENRE');
    logAndPrint('pass', '| del genres GENRES');
    logAndPrint('pass', '| make playlist DAY or GENRE');
    logAndPrint('pass', '| make playlist+shared DAY | will use all files in DAY folder together with sharedday folder as 1 folder');
    logAndPrint('pass', '| make random playlist DAY or GENRE');
    logAndPrint('pass', '| make random+shared playlist DAY | will use all files in DAY folder together with sharedday folder as 1 folder');
    logAndPrint('pass', '| update time | will restart all tasks after new time set');
    logAndPrint('pass', '| info');
    logAndPrint('pass', '| tasks');
    logAndPrint('pass', '| genres');
}

function makeMaindirs() {
    for (var i in appdirs) {
        if (!fs.existsSync(__dirname + '/' + appdirs[i])) {
            fs.mkdirSync(__dirname + '/' + appdirs[i]);
        }
    }
}

function makeDaydirs() {
    for (var i in weekday) {
        if (!fs.existsSync(__dirname + '/uploads/' + weekday[i])) {
            fs.mkdirSync(__dirname + '/uploads/' + weekday[i]);
        }
    }
}

function playIfPlayTime() {
    var deferred = q.defer();
    var playingDay = getPlayingStartDay();
    if (!omx.isPlaying() && !streaming && playingDay) {
        startPlay(playingDay).then(function() {
            deferred.resolve();
        }, function() {
            deferred.reject(new Error('allready streaming'));
        });
    } else if (omx.isPlaying() || streaming) {
        deferred.reject(new Error('allready streaming'));
    } else if (!playingDay) {
        deferred.reject(new Error('no task set'));
    }
    return deferred.promise;
}

function stopSchedule() {
    stopPlay().then(function() {
        logAndPrint('info', 'task ended');
        shutdownIfSet();
    });
}

function startSchedule() {
    startPlay().then(function() {
        logAndPrint('info', 'starting task play');
    }, function() {
        logAndPrint('warningInfo', 'cant task');
    });
}

function runSchedules() {
    var sth, stm, eth, etm;
    for (var i = 0; i < 7; i++) {
        if (schedules[i]) {
            if (schedules[i].hasOwnProperty('startTime') && schedules[i].hasOwnProperty('endTime')) {
                sth = parseInt(schedules[i].startTime.split(':')[0]);
                stm = parseInt(schedules[i].startTime.split(':')[1]);
                eth = parseInt(schedules[i].endTime.split(':')[0]);
                etm = parseInt(schedules[i].endTime.split(':')[1]);
                schedulesStartObject[i] = {
                    hour: sth,
                    minute: stm,
                    dayOfWeek: i
                };
                schedulesStart[i] = schedule.scheduleJob(schedulesStartObject[i], startSchedule);
                schedulesStopObject[i] = {
                    hour: eth,
                    minute: etm,
                    dayOfWeek: weekday.indexOf(schedules[i].endDay)
                };
                schedulesStop[i] = schedule.scheduleJob(schedulesStopObject[i], stopSchedule);
            }
        }
    }
    playIfPlayTime().then(function() {
        logAndPrint('info', 'starting task play');
    }, function(err) {
        logAndPrint('pass', err.message);
    });
}

function startPlay(day) {
    var deferred = q.defer();
    if (omx.isPlaying() || streaming) {
        deferred.reject(new Error('allready streaming'));
        // return false;
    } else {
        day = day ? day : updateDay().name;
        switch (configs.schedulesType) {
            case 'days':
                loadPlayList(day);
                break;
            case 'genres':
                loadGenresPlayList(day);
                break;
            default:
                deferred.reject(new Error('missing tasks type in configs'));
                break;
        }
        playPlayList();
        deferred.resolve();
    }
    // return true;
    return deferred.promise;
}

function startPlayOLD(day) {
    if (omx.isPlaying() || streaming) return false;
    day = day ? day : updateDay().name;
    switch (configs.schedulesType) {
        case 'days':
            loadPlayList(day);
            break;
        case 'genres':
            loadGenresPlayList(day);
            break;
        default:
            loadPlayList(day);
            break;
    }
    playPlayList();
    return true;
}

function stopPlay() {
    var deferred = q.defer();
    streaming = false;
    if (omx.isPlaying()) {
        omx.stop();
        deferred.resolve({
            message: 'play and task has been stopped'
        });
    } else {
        deferred.resolve({
            message: 'task stopped'
        });
    }
    return deferred.promise;
}

function skipPlay(num) {
    if (parseInt(num) && playlist.files.length && (parseInt(num) < 0 || parseInt(num) >= playlist.files.length)) {
        logAndPrint('fail', 'skip between 0 to ' + (playlist.files.length - 1).bold);
        return;
    } else if (parseInt(num) && playlist.files.length) {
        playlist.currentIndex = (parseInt(num) - 1 + playlist.files.length) % playlist.files.length;
    }
    if (omx.isPlaying()) {
        omx.stop();
    } else {
        playIfPlayTime().then(function() {
            logAndPrint('pass', 'starting stream.');
        }, function(err) {
            logAndPrint('pass', err.message);
        });
    }
}

function getTime() {
    var hour = parseInt(new Date().getHours()),
        minute = parseInt(new Date().getMinutes()),
        second = parseInt(new Date().getSeconds());
    hour = hour < 10 ? '0' + hour : hour;
    minute = minute < 10 ? '0' + minute : minute;
    second = second < 10 ? '0' + second : second;
    return hour + ':' + minute + ":" + second;
}

function getDate() {
    var date = new Date();
    var dd = date.getDate(),
        mm = date.getMonth() + 1,
        yy = date.getFullYear();
    return yy + '-' + mm + '-' + dd;
}

function playPlayList() {
    //sendMailIfIpChange();
    var forceStop = false,
        streamedOnesAtLeast = playlist.currentIndex === 0 ? false : true;
    if (omx.isPlaying() || playlist.files.length === 0) return false;
    streaming = true;
    playNext();

    function playNext() {
        if (isGenresMode()) {
            var currentGenre, startDay = getPlayingStartDay();
            if (isRealDayName(startDay)) {
                currentGenre = getCurrentGenre(startDay);
            } else {
                forceStop = true;
                stopPlay();
            }
            if (!forceStop && currentGenre && playlist.directory !== currentGenre) {
                loadGenresPlayList(startDay);
            }
        }
        while (!forceStop && !fs.existsSync(playlist.path + '/' + playlist.files[playlist.currentIndex]) && !fs.existsSync(sharedday + '/' + playlist.files[playlist.currentIndex])) {
            logAndPrint('warningInfo', 'missing file, playing index: ' + (playlist.currentIndex + 1) + '/' + playlist.files.length + ' : ' + playlist.files[playlist.currentIndex] + ' in ' + playlist.directory + ' folder.');
            if (playlist.currentIndex + 1 === playlist.files.length)
                if (streamedOnesAtLeast) {
                    streamedOnesAtLeast = false;
                } else {
                    forceStop = true;
                    stopPlay().then(function() {
                        logAndPrint('pass', 'task stopped due to missing of all playlist files');
                    });
                    break;
                }
            playlist.currentIndex = (playlist.currentIndex + 1 + playlist.files.length) % playlist.files.length;
        }
        if (!omx.isPlaying() && !forceStop) {
            streamedOnesAtLeast = true;
            if (fs.existsSync(playlist.path + '/' + playlist.files[playlist.currentIndex])) {
                omx.play(playlist.path + '/' + playlist.files[playlist.currentIndex], omxconfig);
                // omxplayer = spawn('/usr/bin/omxplayer', ['-o', configs.output, '-b', '--no-keys', '-g', playlist.path + '/' + playlist.files[playlist.currentIndex]]);
            } else if (fs.existsSync(sharedday + '/' + playlist.files[playlist.currentIndex])) {
                omx.play(sharedday + '/' + playlist.files[playlist.currentIndex], omxconfig);
                // omxplayer = spawn('/usr/bin/omxplayer', ['-o', configs.output, '-b', '--no-keys', '-g', sharedday + '/' + playlist.files[playlist.currentIndex]]);
            }
            omx.once('end', function() {
                if (streaming) {
                    playNext();
                }
            });
            saveLastPlay();
            playlist.currentIndex = (playlist.currentIndex + 1 + playlist.files.length) % playlist.files.length;
        }
    }
}

function getPlayingStartDay() {
    var sStartDay, sStopDay, sStartDayIndex, sStopDayIndex, sStartHour, sStartMinute, sStopHour, sStopMinute,
        day = weekday[new Date().getDay()],
        dayIndex = weekday.indexOf(day),
        hour = parseInt(new Date().getHours()),
        minute = parseInt(new Date().getMinutes());
    for (var j = 0; j < schedules.length; j++) {
        if (schedules[j]) {
            if (schedules[j].startDay && schedules[j].startTime && schedules[j].startDay && schedules[j].startTime) {
                sStartDay = schedules[j].startDay;
                sStopDay = schedules[j].endDay;
                sStartDayIndex = weekday.indexOf(sStartDay);
                sStopDayIndex = weekday.indexOf(sStopDay);
                sStartHour = parseInt(schedules[j].startTime.split(':')[0]);
                sStartMinute = parseInt(schedules[j].startTime.split(':')[1]);
                sStopHour = parseInt(schedules[j].endTime.split(':')[0]);
                sStopMinute = parseInt(schedules[j].endTime.split(':')[1]);
                if (sStartDayIndex === dayIndex && sStopDayIndex === dayIndex) //start end same day
                    if (sStartHour * 60 + sStartMinute <= hour * 60 + minute && sStopHour * 60 + sStopMinute > hour * 60 + minute) return sStartDay;
                if (sStartDayIndex === dayIndex && sStopDayIndex !== dayIndex) //start end next day
                    if (sStartHour * 60 + sStartMinute <= hour * 60 + minute) return sStartDay;
                if (sStopDayIndex === dayIndex && sStartDayIndex === getPreviousDayIndex(dayIndex))
                    if (sStopHour * 60 + sStopMinute > hour * 60 + minute) return sStartDay;
            }
        }
    }
    return null;
}

function getPreviousDayIndex() {
    if (arguments.length === 1 && _l.isNumber(arguments[0]) && arguments[0] >= 0 && arguments[0] <= 6) {
        var dayIndex = arguments[0];
        return dayIndex > 0 ? dayIndex - 1 : 6;
    }
    return -1;
}

function loadSchedules() {
    if (fs.existsSync(__dirname + '/saves/tasks.json')) {
        try {
            schedules = JSON.parse(fs.readFileSync(__dirname + '/saves/tasks.json'));
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/tasks.json');
            logAndPrint('fail', 'tasks.json damaged, and deleted.');
        }
    }
}

function displaySchedules() {
    var haveSchedules = false;
    logAndPrint('pass', 'tasks list:');
    for (var i = 0; i < schedules.length; i++) {
        if (schedules[i]) {
            logAndPrint('pass', '|- ' + schedules[i].startDay + ' ' + schedules[i].startTime + ' - ' + schedules[i].endDay + ' ' + schedules[i].endTime);
            if (isGenresMode()) {
                logAndPrint('pass', '|-- timeline: ' + buildTimeLineGenres(weekday[i]));
            }
            haveSchedules = true;
        }
    }
    if (!haveSchedules) {
        logAndPrint('pass', '|- ' + 'empty'.red);
    }
}

function saveSchedules() {
    if (fs.writeFileSync(__dirname + '/saves/tasks.json', JSON.stringify(schedules))) {
        logAndPrint('pass', 'tasks list:');
    }
}

function loadPlayList(day) {
    if (!isRealDayName(day)) {
        return false;
    }
    playlist = {
        files: [],
        currentIndex: 0,
        path: '',
        directory: ''
    };
    playlist.directory = day;
    playlist.path = __dirname + '/uploads/' + playlist.directory;
    if (!fs.existsSync(playlist.path + '/_playlist.m3u')) {
        logAndPrint('info', 'creating playlist of ' + playlist.directory);
        createPlayListSwitch([playlist.directory], autoRandomMissingPlaylist, false);
    }
    if (fs.existsSync(playlist.path + '/_playlist.m3u')) {
        var data = fs.readFileSync(playlist.path + '/_playlist.m3u', {
            encoding: 'utf8'
        });
        if (data) {
            logAndPrint('info', 'loading ' + playlist.directory + ' playlist.');
            playlist.files = getOnlyPlayFiles(data.split('\n'));
            loadLastPlay();
        } else {
            logAndPrint('warningInfo', playlist.directory + ' playlist is empty');
            playlist.files = [];
        }
    } else {
        logAndPrint('warningInfo', playlist.directory + ' folder is empty');
        playlist.files = [];
    }
}

function isRealDayName(toCheck) {
    if (!toCheck || !_l.isString(toCheck) || weekday.indexOf(toCheck.toLowerCase()) === -1) return false;
    return true;
}

function isPlayableFile(toCheck) {
    if (!toCheck) {
        return false;
    }
    var arr = toCheck.split('.'),
        type = arr.pop();
    return (_l.indexOf(filetypes, type) !== -1);
}

function isAllString(toCheck) {
    if (!toCheck || !_l.isString(toCheck) || toCheck.toLowerCase() != 'all') return false;
    return true;
}

function isRealTime(time) {
    if (!time || !_l.isString(time) || !regularExpressionTime.test(time[0] === 'n' ? time.splice(0, 1) : time)) return false;
    return true;
}

function delPlayListSwitch(arrDayGenre) {
    if (arrDayGenre.length === 2 && isAllString(arrDayGenre[0])) {
        if (arrDayGenre[1] === 'days') delPlayList(arrDayGenre[0]);
        else if (arrDayGenre[1] === 'genres') delGenresPlayList(arrDayGenre[0]);
    } else if (arrDayGenre.length === 1 && !isAllString(arrDayGenre[0])) {
        if (isRealDayName(arrDayGenre[0])) delPlayList(arrDayGenre[0]);
        else if (isRealGenre(arrDayGenre[0])) delGenresPlayList(arrDayGenre[0]);
    }
}

function delPlayList(day) {
    if (isRealDayName(day)) {
        var daydir = __dirname + '/uploads/' + day;
        if (fs.existsSync(daydir + '/_playlist.m3u')) {
            fs.unlinkSync(daydir + '/_playlist.m3u');
            logAndPrint('pass', day + ' playlist deleted.');
            return true;
        } else logAndPrint('fail', day + ' missing a playlist.');
    } else if (isAllString(day)) {
        for (var i = 0; i < weekday.length; i++) {
            delPlayList(weekday[i]);
        }
    } else logAndPrint('fail', 'day is misspelled');
    return false;
}

function createPlayListSwitch(arrDayGenre, random, shared) {
    if (arrDayGenre.length === 2 && isAllString(arrDayGenre[0])) {
        if (arrDayGenre[1] === 'days') createPlayList(arrDayGenre[0], random, shared);
        else if (arrDayGenre[1] === 'genres') createGenresPlayList(arrDayGenre[0], random, shared);
    } else if (arrDayGenre.length === 1 && !isAllString(arrDayGenre[0])) {
        if (isRealDayName(arrDayGenre[0])) createPlayList(arrDayGenre[0], random, shared);
        else if (isRealGenre(arrDayGenre[0])) createGenresPlayList(arrDayGenre[0], random, shared);
    }
}

function createPlayList(day, random, shared) {
    var i = 0,
        j, endi = 0,
        random = random ? random : false,
        daydir, shared = shared ? shared : false,
        files, sharedFiles, rNum, fileName;
    if (isRealDayName(day)) {
        i = weekday.indexOf(day);
        endi = i + 1;
    } else if (isAllString(day)) {
        i = 0;
        endi = 7;
    }
    for (i; i < endi; i++) {
        daydir = __dirname + '/uploads/' + weekday[i];
        if (fs.existsSync(daydir)) {
            files = getOnlyPlayFiles(fs.readdirSync(daydir + '/'));
            if (shared) sharedFiles = getOnlyPlayFiles(fs.readdirSync(sharedday + '/'));
            if (util.isArray(sharedFiles)) files = files.concat(sharedFiles);
            if (util.isArray(files)) {
                if (files.length === 0) logAndPrint('fail', 'no files exists in ' + weekday[i]);
                else {
                    if (!fs.existsSync(daydir + '/_playlist.m3u')) {
                        if (random)
                            for (j = files.length - 1; j >= 0; j--) {
                                rNum = Math.floor(Math.random() * j);
                                fileName = files[rNum];
                                files[rNum] = files[j];
                                files[j] = fileName;
                            }
                        for (j = 0; j < files.length; j++) fs.appendFileSync(daydir + '/_playlist.m3u', files[j] + '\n');
                        if (fs.existsSync(daydir + '/_playlist.m3u')) logAndPrint('pass', 'new playlist created in ' + weekday[i]);
                    } else logAndPrint('fail', 'playlist already exists in ' + weekday[i]);
                }
            }
        }
    }
}

function getOnlyPlayFiles(arr) {
    var retArr = [];
    if (util.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i][0] != '#' || arr[i].length > 0) {
                arr[i] = arr[i].replace(/(\r\n|\n|\r)/gm, "");
                if (arr[i].indexOf('/') != -1) arr[i] = arr[i].split('/')[arr[i].split('/').length - 1];
                if (arr[i].indexOf('\\') != -1) arr[i] = arr[i].split('\\')[arr[i].split('\\').length - 1];
                if (isPlayableFile(arr[i])) {
                    retArr.push(arr[i]);
                }
            }
        }
    }
    return retArr;
}

function updateDay() {
    var name = weekday[new Date().getDay()];
    today = {
        name: name,
        index: weekday.indexOf(name),
        dir: __dirname + '/uploads/' + name
    };
    return today;
}

function isEmptyScheduleTime(scheduleObject) {
    var prevIndex = (scheduleObject.startDayIndex - 1 + 7) % 7,
        nextIndex = (scheduleObject.startDayIndex + 1 + 7) % 7,
        t1, t2;
    if (schedules[prevIndex]) {
        if (schedules[prevIndex].endDayIndex === scheduleObject.startDayIndex) {
            t1 = parseInt(schedules[prevIndex].endTime.split(':')[0]) * 60 + parseInt(schedules[prevIndex].endTime.split(':')[1]);
            t2 = parseInt(scheduleObject.startTime.split(':')[0]) * 60 + parseInt(scheduleObject.startTime.split(':')[1]);
            if (t1 >= t2) return false;
        }
    }
    if (schedules[nextIndex]) {
        if (schedules[nextIndex].startDayIndex === scheduleObject.endDayIndex) {
            t1 = parseInt(schedules[nextIndex].startTime.split(':')[0]) * 60 + parseInt(schedules[nextIndex].startTime.split(':')[1]);
            t2 = parseInt(scheduleObject.endTime.split(':')[0]) * 60 + parseInt(scheduleObject.endTime.split(':')[1]);
            if (t1 <= t2) return false;
        }
    }
    return true;
}

function delSchedule(day) {
    if (isRealDayName(day)) {
        var ipt = getPlayingStartDay();
        if (ipt && ipt === day) stopPlay();
        var dayIndex = weekday.indexOf(day);
        if (schedules[dayIndex]) {
            schedules[dayIndex] = null;
            schedulesStartObject[dayIndex] = null;
            schedulesStart[dayIndex] = null;
            schedulesStopObject[dayIndex] = null;
            schedulesStop[dayIndex] = null;
            logAndPrint('pass', day + ' task deleted.');
            saveSchedules();
            schedulesGenres[dayIndex] = [];
            schedulesGenresSpliters[dayIndex] = [];
            saveSchedulesGenresAndSpliters();
            return true;
        } else {
            logAndPrint('fail', day + ' missing a task');
            return false;
        }
    } else if (isAllString(day)) {
        var haveSchedules = false;
        stopPlay();
        for (var i = 0; i < weekday.length; i++) {
            if (schedules[i]) {
                schedules[i] = null;
                schedulesStartObject[i] = null;
                schedulesStart[i] = null;
                schedulesStopObject[i] = null;
                schedulesStop[i] = null;
                logAndPrint('pass', weekday[i] + ' task deleted.');
                haveSchedules = true;
                schedulesGenres[i] = [];
                schedulesGenresSpliters[i] = [];
            }
        }
        if (!haveSchedules) {
            logAndPrint('fail', 'empty schedules list.');
            return false;
        } else {
            saveSchedules();
            saveSchedulesGenresAndSpliters();
            return true;
        }
    } else logAndPrint('fail', 'day is misspelled');
    return false;
}

function isCorrectStartEndTime(start, end) {
    var shr, sm, ehr, em;
    shr = parseInt(start.split(':')[0]);
    sm = parseInt(start.split(':')[1]);
    ehr = parseInt(end.split(':')[0]);
    em = parseInt(end.split(':')[1]);
    if (shr * 60 + sm < ehr * 60 + em) return true;
    return false;
}

function addSchedule() {
    var startDay, startDayIndex, endDayIndex, startTime, endDay, endTime, scheduleObject;
    if (!(arguments.length >= 3 && arguments.length <= 4)) {
        logAndPrint('fail', 'input must be 3 or 4 parameters.'.bold);
        return false;
    }
    if (isRealDayName(arguments[0])) {
        startDay = arguments[0];
        startDayIndex = weekday.indexOf(startDay)
    } else {
        logAndPrint('fail', 'start day is misspelled'.bold);
        return false;
    }
    if (isRealTime(arguments[1])) {
        startTime = arguments[1];
    } else {
        logAndPrint('fail', 'start time is misspelled, use HH:MM'.bold);
        return false;
    }
    if (arguments.length === 3) {
        endDayIndex = startDayIndex;
        endDay = startDay;
        if (isRealTime(arguments[2])) {
            endTime = arguments[2];
        } else {
            logAndPrint('fail', 'end time is misspelled, use HH:MM'.bold);
            return false;
        }
        if (!isCorrectStartEndTime(startTime, endTime)) {
            logAndPrint('fail', 'end time is lower than start time.'.bold);
            return false;
        }
    } else if (arguments.length === 4) {
        if (isRealDayName(arguments[2])) {
            endDay = arguments[2];
            endDayIndex = weekday.indexOf(endDay)
        } else {
            logAndPrint('fail', 'end day is misspelled'.bold);
            return false;
        }
        if (isRealTime(arguments[3])) {
            endTime = arguments[3];
        } else {
            logAndPrint('fail', 'end time is misspelled, use HH:MM'.bold);
            return false;
        }
    }
    if (!(endDayIndex - startDayIndex <= 1 && endDayIndex - startDayIndex >= 0 || endDayIndex - startDayIndex === -6)) {
        logAndPrint('fail', 'allowed set 1 day difference maximum'.bold);
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
    if (!isEmptyScheduleTime(scheduleObject)) {
        logAndPrint('fail', 'trying set task on other task time.'.bold);
        return false;
    }
    schedules[startDayIndex] = scheduleObject;
    saveSchedules();
    schedulesGenres[startDayIndex] = [];
    schedulesGenresSpliters[startDayIndex] = [];
    saveSchedulesGenresAndSpliters();
    logAndPrint('pass', 'task added: ' + schedules[startDayIndex].startDay + ' ' + schedules[startDayIndex].startTime + ' - ' + schedules[startDayIndex].endDay + ' ' + schedules[startDayIndex].endTime);
    if (isGenresMode()) logAndPrint('passInfo', 'use: set taskgenres ' + schedules[startDayIndex].startDay + ' GENRE or GENRE TIME GENRE... GENRE');
    if (isDaysMode()) runSchedules();
    return true;
}

function getUptime() {
    var seconds = os.uptime();
    return Math.floor(seconds / 86400) + ' days ' + Math.floor((seconds % 86400) / 3600) + ' hours ' + Math.floor(((seconds % 86400) % 3600) / 60) + ' minutes ' + Math.floor(((seconds % 86400) % 3600) % 60) + ' seconds';
}

function currentStatus() {
    updateDay();
    logAndPrint('pass', 'Ropongi_Stream v' + version + ' ' + passport.name + ' current status:');
    logAndPrint('pass', 'email ' + email.auth.user);
    logAndPrint('pass', 'output ' + configs.output);
    logAndPrint('pass', 'location ' + passport.place + ' at ' + passport.address);
    logAndPrint('pass', 'current time: ' + today.name + ' ' + getTime());
    logAndPrint('pass', 'uptime: ' + getUptime());
    logAndPrint('pass', 'local ip: ' + ip.address() + ' network ip: ' + networkInfo.networkIp);
    var wifiInfo = wifiCheck.status ? 'ON'.green + ' , interval: ' + wifiCheck.minutes + ' minutes' : 'OFF'.red;
    logAndPrint('pass', 'wifi check is ' + wifiInfo);
    var rtcInfo = rtc ? 'AVAILABLE'.green : 'MISSING'.red;
    logAndPrint('pass', 'RTC: ' + rtcInfo);
    var autoShutdownInfo = configs.autoShutdown ? 'ON'.green : 'OFF'.red;
    logAndPrint('pass', 'auto shutdown after task end ' + autoShutdownInfo);
    var logsInfo = configs.logs ? 'ON'.green : 'OFF'.red;
    logAndPrint('pass', 'logging logs is ' + logsInfo);
    logAndPrint('pass', 'tasks type is ' + configs.schedulesType);
    if (omx.isPlaying() || streaming) {
        var playIndex = (playlist.currentIndex - 1 + playlist.files.length) % playlist.files.length;
        logAndPrint('pass', 'stream is ' + 'ON'.green + ' task of ' + playlist.directory + ' - ' + playlist.files[playIndex]);
        logAndPrint('pass', 'stream index ' + playIndex + ' of ' + playlist.files.length);
    } else {
        logAndPrint('pass', 'stream is ' + 'OFF'.red);
    }
    exec('vcgencmd measure_temp', function(error, stdout, stderr) {
        if (stdout) {
            logAndPrint('pass', 'temp: ' + stdout.toString().replace(/\s+/g, " ").trim().split('=')[1]);
        }
    });
    exec('df / -h', function(error, stdout, stderr) {
        if (stdout) {
            var arr = stdout.toString().replace(/\s+/g, " ").trim().split(' ').slice(8);
            logAndPrint('pass', 'SD size: ' + arr[0] + ' used: ' + arr[1] + ' / ' + arr[3] + ' available: ' + arr[2]);
        }
    });
}

function getListOfGenresDirs() {
    var path = __dirname + '/uploads/genres',
        dirs = [],
        files = [];
    try {
        files = fs.readdirSync(path);
    } catch (err) {
        return dirs;
    }
    for (var i in files) {
        if (fs.statSync(path + '/' + files[i]).isDirectory()) dirs.push(files[i]);
    }
    return dirs;
}

function getLastGenresPlaysPlaylist(genre) {
    for (var i in lastGenresPlays)
        if (lastGenresPlays[i].directory === genre) return lastGenresPlays[i];
    return null;
}

function getLastGenresPlaysPlaylistIndex(genre) {
    for (var i in lastGenresPlays)
        if (lastGenresPlays[i].directory === genre) return i;
    return -1;
}

function updateLastGenresPlays(playlist) {
    var genre = playlist.directory;
    if (getLastGenresPlaysPlaylistIndex(genre) === -1) {
        lastGenresPlays.push(playlist);
        return true;
    }
    return false;
}

function delGenrePlaylist(genre) {
    for (var i in lastGenresPlays)
        if (lastGenresPlays[i].directory === genre) {
            lastGenresPlays.splice(i, 1);
            return true;
        }
    return false;
}

function printGenres() {
    logAndPrint('pass', 'genres list: ' + genres.length + ' genres');
    if (genres.length !== 0) {
        for (var i in genres) {
            var genrePlaylist = getLastGenresPlaysPlaylist(genres[i]),
                extraInfo = '';
            if (genrePlaylist) extraInfo = ' info: last index ' + genrePlaylist.currentIndex + ' of ' + genrePlaylist.files.length + ' tracks.'
            logAndPrint('pass', '|- ' + genres[i] + extraInfo);
        }
    } else logAndPrint('pass', '|- ' + 'empty'.red);
}

function isRealGenre(genre) {
    if (!genre || !_l.isString(genre) || genres.indexOf(genre) === -1) return false;
    return true;
}

function isCurrentType(type) {
    return configs.schedulesType === type;
}

function setSchedulesType(type) {
    if (isCurrentType(type)) {
        logAndPrint('passInfo', 'schedules type ' + type + ' already set.');
        return false;
    }
    stopPlay().then(function() {
        configs.schedulesType = type;
        logAndPrint('pass', 'schedules type set to ' + configs.schedulesType + '.');
        saveConfigs();
        playIfPlayTime();
    });
}

function delGenresPlayList(genre) {
    if (isRealGenre(genre)) {
        delGenrePlaylist(genre);
        saveLastGenresPlays();
        var playdir = __dirname + '/uploads/genres/' + genre;
        if (fs.existsSync(playdir + '/_playlist.m3u')) {
            fs.unlinkSync(playdir + '/_playlist.m3u');
            logAndPrint('pass', genre + ' playlist deleted.');
            return true;
        } else logAndPrint('fail', genre + ' is missing a playlist.');
    } else if (isAllString(genre)) {
        for (var i in genres) {
            delGenresPlayList(genres[i]);
        }
    } else logAndPrint('fail', 'genre folder is misspelled');
    return false;
}

function isGenresMode() {
    return configs.schedulesType === 'genres';
}

function isDaysMode() {
    return configs.schedulesType === 'days';
}

function createGenresPlayList(genre, random) {
    var i = 0,
        j, endi = 0,
        random = random ? random : false,
        genredir,
        files = [],
        genres = getListOfGenresDirs(),
        rNum, fileName;
    if (isRealGenre(genre)) {
        i = genres.indexOf(genre);
        endi = i + 1;
    } else if (isAllString(genre)) {
        i = 0;
        endi = genres.length;
    }
    for (i; i < endi; i++) {
        genredir = __dirname + '/uploads/genres/' + genres[i];
        if (fs.existsSync(genredir)) {
            files = getOnlyPlayFiles(fs.readdirSync(genredir + '/'));
            if (util.isArray(files)) {
                if (files.length === 0) logAndPrint('fail', 'no files exists in genre ' + genres[i]);
                else {
                    if (!fs.existsSync(genredir + '/_playlist.m3u')) {
                        if (random)
                            for (j = files.length - 1; j >= 0; j--) {
                                rNum = Math.floor(Math.random() * j);
                                fileName = files[rNum];
                                files[rNum] = files[j];
                                files[j] = fileName;
                            }
                        for (j = 0; j < files.length; j++) fs.appendFileSync(genredir + '/_playlist.m3u', files[j] + '\n');
                        if (fs.existsSync(genredir + '/_playlist.m3u')) logAndPrint('pass', 'new playlist created in ' + genres[i]);
                        var playlist = {
                            files: files,
                            currentIndex: 0,
                            directory: genres[i]
                        }
                        if (updateLastGenresPlays(playlist)) saveLastGenresPlays();
                    } else logAndPrint('fail', 'playlist already exists in ' + genres[i]);
                }
            }
        }
    }
}

function saveSchedulesGenresAndSpliters() {
    var obj = {
        genres: schedulesGenres,
        spliters: schedulesGenresSpliters
    }
    return !!fs.writeFileSync(__dirname + '/saves/tasksgenres.json', JSON.stringify(obj));
}

function loadSchedulesGenresAndSpliters() {
    if (fs.existsSync(__dirname + '/saves/tasksgenres.json')) {
        try {
            var obj = JSON.parse(fs.readFileSync(__dirname + '/saves/tasksgenres.json'));
            schedulesGenres = obj.genres;
            schedulesGenresSpliters = obj.spliters;
        } catch (err) {
            fs.unlinkSync(__dirname + '/saves/tasksgenres.json');
            logAndPrint('fail', 'tasksgenres.json damaged, and deleted.');
            return false;
        }
    }
    return true;
}

function setScheduleGenres(day, genresAndTimesArr) {
    if (!isRealDayName(day)) {
        logAndPrint('fail', day + ' day is misspelled.');
        return false;
    }
    if (!validateGenresAndTimes(genresAndTimesArr)) return false;
    var times = [];
    for (var i in genresAndTimesArr) {
        if (i % 2) times.push(genresAndTimesArr[i]);
    }
    if (genresAndTimesArr.length > 2 && !validateSceduleTimes(day, times)) return false;
    var dayIndex = weekday.indexOf(day);
    schedulesGenres[dayIndex] = [];
    schedulesGenresSpliters[dayIndex] = [];
    for (var i in genresAndTimesArr) {
        if (!(i % 2)) {
            schedulesGenres[dayIndex].push(genresAndTimesArr[i]);
        } else {
            schedulesGenresSpliters[dayIndex].push(genresAndTimesArr[i]);
        }
    }
    saveSchedulesGenresAndSpliters();
    logAndPrint('pass', day + ' timeline added: ' + buildTimeLineGenres(day));
    runSchedules();
    return true;
}

function buildTimeLineGenres(day) {
    if (!isRealDayName(day)) return '';
    var dayIndex = weekday.indexOf(day),
        timeline = '';
    if (schedulesGenres[dayIndex].length === 0) timeline += 'empty.'.red;
    else {
        timeline += schedules[dayIndex].startTime + ' ';
        for (var i in schedulesGenres[dayIndex]) {
            timeline += schedulesGenres[dayIndex][i] + ' ';
            if (i < schedulesGenresSpliters[dayIndex].length) {
                if (is48Hours(schedulesGenresSpliters[dayIndex][i])) {
                    timeline += '(' + schedules[dayIndex].endDay + ' ';
                    timeline += !is24Hours(schedulesGenresSpliters[dayIndex][i]) ? make24Hours(schedulesGenresSpliters[dayIndex][i]) : schedulesGenresSpliters[dayIndex][i];
                    timeline += ') ';
                } else timeline += !is24Hours(schedulesGenresSpliters[dayIndex][i]) ? make24Hours(schedulesGenresSpliters[dayIndex][i]) : schedulesGenresSpliters[dayIndex][i] + ' ';
            }
        }
        if (schedules[dayIndex].startDay !== schedules[dayIndex].endDay) timeline += '(' + schedules[dayIndex].endDay + ' ' + schedules[dayIndex].endTime + ')';
        else timeline += schedules[dayIndex].endTime;
    }
    return timeline.trim();
}

function validateGenresAndTimes(genresAndTimesArr) {
    if (!(genresAndTimesArr.length % 2)) {
        logAndPrint('fail', 'use GENRE TIME GENRE TIME GENRE etc.. or GENRE. (TIME is only for split between GENRES)');
        return false;
    }
    for (var i in genresAndTimesArr) {
        if (!(i % 2)) {
            if (!isRealGenre(genresAndTimesArr[i])) {
                logAndPrint('fail', genresAndTimesArr[i] + ' is not correct genre. use: genres');
                return false;
            }
        } else if (!isRealTime(!is24Hours(genresAndTimesArr[i]) ? make24Hours(genresAndTimesArr[i]) : genresAndTimesArr[i])) {
            logAndPrint('fail', genresAndTimesArr[i] + ' is not correct time.');
            return false;
        }
    }
    return true;
}

function make48Hours(time) {
    var h = parseInt(time.split(':')[0]) <= 24 ? parseInt(time.split(':')[0]) + 24 : parseInt(time.split(':')[0]),
        m = (parseInt(time.split(':')[1]) < 10) ? '0' + parseInt(time.split(':')[1]) : parseInt(time.split(':')[1]);
    return h + ':' + m;
}

function make24Hours(time) {
    var h = parseInt(time.split(':')[0]) >= 24 ? parseInt(time.split(':')[0]) - 24 : parseInt(time.split(':')[0]),
        m = (parseInt(time.split(':')[1]) < 10) ? '0' + parseInt(time.split(':')[1]) : parseInt(time.split(':')[1]);
    h = h < 10 ? '0' + h : h;
    return h + ':' + m;
}

function is48Hours(time) {
    return parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]) >= 1440
}

function is24Hours(time) {
    return parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]) < 1440
}

function getCurrentGenre(day) {
    var dayIndex = weekday.indexOf(day),
        currentTime = schedules[dayIndex].startDayIndex !== schedules[dayIndex].endDayIndex && schedules[dayIndex].endDayIndex === updateDay().index ? make48Hours(getTime()) : getTime(),
        genreIndex = 0,
        chr, cm, shr, sm;
    for (var i in schedulesGenresSpliters[dayIndex]) {
        chr = parseInt(currentTime.split(':')[0]);
        cm = parseInt(currentTime.split(':')[1]);
        shr = parseInt(schedulesGenresSpliters[dayIndex][i].split(':')[0]);
        sm = parseInt(schedulesGenresSpliters[dayIndex][i].split(':')[1]);
        if (shr * 60 + sm <= chr * 60 + cm) {
            genreIndex++;
        }
    }
    return schedulesGenres[dayIndex][genreIndex];
}

function validateSceduleTimes(day, times) {
    if (!isRealDayName(day)) return false;
    var dayIndex = weekday.indexOf(day),
        endTime = dayIndex !== schedules[dayIndex].endDayIndex ? make48Hours(schedules[dayIndex].endTime) : schedules[dayIndex].endTime,
        limitTime = schedules[dayIndex].startTime,
        lhr, lm, chr, cm, ehr, em;
    for (var i in times) {
        lhr = parseInt(limitTime.split(':')[0]);
        lm = parseInt(limitTime.split(':')[1]);
        chr = parseInt(times[i].split(':')[0]);
        cm = parseInt(times[i].split(':')[1]);
        ehr = parseInt(endTime.split(':')[0]);
        em = parseInt(endTime.split(':')[1]);
        if (lhr * 60 + lm < chr * 60 + cm && chr * 60 + cm < ehr * 60 + em) limitTime = times[i];
        else {
            logAndPrint('fail', times[i] + ' split time is wrong. (split must be greater than start time and less than endtime)');
            return false;
        }
    }
    return true;
}

function loadGenresPlayList(day) {
    playlist = {
        files: [],
        currentIndex: 0,
        path: '',
        directory: ''
    };
    if (!isRealDayName(day)) return false;
    var genre = getCurrentGenre(day);
    if (!genre) return false;
    playlist.directory = genre;
    playlist.path = __dirname + '/uploads/genres/' + playlist.directory;
    if (!fs.existsSync(playlist.path + '/_playlist.m3u')) {
        logAndPrint('info', 'creating playlist of ' + playlist.directory);
        createPlayListSwitch([playlist.directory], autoRandomMissingPlaylist, false);
    }
    if (fs.existsSync(playlist.path + '/_playlist.m3u')) {;
        var data = fs.readFileSync(playlist.path + '/_playlist.m3u', {
            encoding: 'utf8'
        });
        if (data) {
            logAndPrint('info', 'loading ' + playlist.directory + ' playlist.');
            playlist.files = getOnlyPlayFiles(data.split('\n'));
            loadLastPlay();
        } else {
            logAndPrint('warningInfo', playlist.directory + ' playlist is empty');
            playlist.files = [];
        }
    } else {
        logAndPrint('warningInfo', playlist.directory + ' folder is empty');
        playlist.files = [];
    }
}

function shutdownIfSet() {
    if (configs.autoShutdown) {
        logAndPrint('info', 'shuting down...');
        exec('shutdown -h now', function(error, stdout, stderr) {
            if (stderr) logAndPrint('warningInfo', 'stderr from auto shutdown: ' + stderr);
            if (error) logAndPrint('warningInfo', 'error from auto shutdown: ' + error);
        });
    }
}

function setAutoShutdown(status) {
    configs.autoShutdown = status;
    if (status) logAndPrint('pass', 'auto shutdown after task end set ' + 'ON'.green);
    else if (!status) logAndPrint('pass', 'auto shutdown after task end set ' + 'OFF'.red);
    saveConfigs();
}

function getMillis(stringData) {
    var ms,
        temp;
    if (isJsonObject(stringData)) {
        temp = JSON.parse(stringData);
        if (temp.hasOwnProperty('currentDateTime') && temp.ms.toString().length === 22) {
            ms = parse(temp.ms);
        }
    } else if (stringData.toString().length === 22) {
        ms = parse(stringData);
    }
    return ms;
}

function skipToNextMillisLink() {
    milisLinks.index = (milisLinks.index + 1) % milisLinks.links.length;
    if (milisLinks.index === 0 && milisLinks.links.length > 1) {
        milisLinks.fullCircle = true;
    } else if (milisLinks.links.length === 1) {
        milisLinks.fullCircle = true;
    }
    return milisLinks.fullCircle;
}

function mainStart() {
    makeMaindirs();
    makeDaydirs();
    chmodRAll();
    loadConfigs();
    loadPassport();
    loadEmail();
    loadWifiCheck();
    loadGenres();
    if (wifiCheck.status) checkWifi();
    eventEmitter.on('timeSet', initialize);
    eventEmitter.on('timeNotSet', function(err) {
        var fullCircle = skipToNextMillisLink();
        if (err.code === 0 && !fullCircle) {
            logAndPrint('fail', 'next timeset attempt in 10s')
            clearTimeout(setTimeTimeout);
            setTimeTimeout = setTimeout(setTime, 10 * 1000);
        } else if (err.code === 1 && !fullCircle) {
            logAndPrint('info', 'next timeset attempt in 10s')
            clearTimeout(setTimeTimeout);
            setTimeTimeout = setTimeout(setTime, 10 * 1000);
        } else if (fullCircle) {
            logAndPrint('info', 'next timeset attempt in 60s after attempting all servers')
            clearTimeout(setTimeTimeout);
            setTimeTimeout = setTimeout(setTime, 60 * 1000);
            milisLinks.fullCircle = false;
        }
    });
    enableRTC().then(setTime, setTime);
}

function initialize() {
    clearTimeout(setTimeTimeout);
    stopPlay().then(function(data) {
        loadLastGenresPlays();
        loadSchedules();
        loadSchedulesGenresAndSpliters();
        setTimeout(runSchedules, 5 * 1000);
    });
    sendMail();
    setInterval(function() {
        sendMailIfIpChange();
    }, 3600 * 1000);
    if (wifiCheck.status) wifiCheckIntervalObject = setInterval(function() {
        checkWifi();
    }, wifiCheck.minutes * 60 * 1000);
}
mainStart();
