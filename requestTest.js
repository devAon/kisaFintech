
// var request = require('request');
// request('https://movie.naver.com/', function (error, response, body) {
//   console.log('error:', error); // Print the error if one occurred
//   console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//   console.log('body:', body); // Print the HTML for the Google homepage.
// });


var request = require('request');
var parseString = require('xml2js').parseString;

request('http://www.weather.go.kr/weather/forecast/mid-term-rss3.jsp?stnld=109', function (err, response, body) {

    parseString(body, function (err, jsonData) {
        //console.log(body)
        //console.log(jsonData)
        
        console.log(jsonData.rss.channel[0].item[0].description[0].header[0].wf[0]);
    })

})