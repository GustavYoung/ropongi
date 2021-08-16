import { Ropongi } from './ropongi';

const ropongi = new Ropongi();

process.on('exit', (code) => {
    ropongi.stopPlay().then(() => {
        ropongi.logAndPrint('info', 'ropongiStream exited: ' + code);
        console.trace();
    });
});

process.on('uncaughtException', (err:Error) => {
    ropongi.logAndPrint('warningInfo', 'Caught exception message: ' + err.message);
    console.error(err);
    // Not standard code, can couse isues.
    // this.logAndPrint('warningInfo', 'Caught exception at line: ' + err.lineNumber);
});

ropongi.mainStart();