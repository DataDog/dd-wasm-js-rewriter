"use strict";
// A comment to force everything in different lines
console.log(new Error('Error out of main'));
function main(arg) {
    console.log(new Error('Error in main' + arg));
    (() => {
        console.log(new Error('Error in unnamed arrow function' + arg));
    })();
    (function () {
        console.log(new Error('Error in unnamed function' + arg));
    })();
}
main('arg');
//# sourceMappingURL=error-typescript-append.js.map
