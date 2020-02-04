var fs = require('fs');

console.log("첫 번째 기능입니다.")

function callbackFunc(callback) {
    fs.readFile('example/test.txt', 'utf8', function (err, result) {
        if (err) {
            console.error(err);
            throw err;
        }
        else {
            console.error("두 번째 기능인데 시간이 좀 걸려요");
            callback(result);
        }
    });
}
console.log("마지막 기능입니다");

console.log('A')

callbackFunc(function(data){
    console.log(data)
    console.log('C')
})