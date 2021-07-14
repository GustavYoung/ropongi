"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ropongi_1 = require("./ropongi");
const ropongi = new ropongi_1.Ropongi();
process.on('exit', (code) => {
    ropongi.stopPlay().then(() => {
        ropongi.logAndPrint('info', 'ropongiStream exited: ' + code);
        console.trace();
    });
});
process.on('uncaughtException', (err) => {
    ropongi.logAndPrint('warningInfo', 'Caught exception message: ' + err.message);
    console.error(err);
    // Not standard code, can couse isues.
    // this.logAndPrint('warningInfo', 'Caught exception at line: ' + err.lineNumber);
});
ropongi.mainStart();
//# sourceMappingURL=new-index.js.map