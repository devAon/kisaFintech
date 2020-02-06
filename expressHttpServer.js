const express = require('express')
const app = express()
var request = require('request')
var mysql = require('mysql');
var jwt = require('jsonwebtoken');
var auth = require('./lib/auth');
var connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'thfxkfbb46',
    database: 'fintech'
});
var tokenKey = "fintech202020!#abcd"
connection.connect();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/signup', function (req, res) {
    res.render('signup');
})

app.get('/login', function (req, res) {
    res.render('login');
})

app.get('/main', function (req, res) {
    res.render('main');
})

app.get('/balance', function (req, res) {
    res.render('balance');
})

app.get('/qrcode', function (req, res) {
    res.render('qrcode');
})

app.get('/qrReader', function (req, res) {
    res.render('qrReader')
})

app.get('/authResult', function (req, res) {
    var authCode = req.query.code;
    console.log(authCode);
    var option = {
        method: "POST",
        url: "https://testapi.openbanking.or.kr/oauth/2.0/token",
        headers: {
            'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8"
        },
        form: {
            code: authCode,
            client_id: 'Ibu8y6lTQk9mgTmUIVhJkwwPD0ZM1axx9Uej73dD',
            client_secret: 'iFFXU0RYWyzWeUwkPwG4bHQbST2uA4RCQ5IAlY6R',
            redirect_uri: 'http://localhost:3000/authResult',
            grant_type: 'authorization_code'
        }
    }
    request(option, function (error, response, body) {
        var parseData = JSON.parse(body);
        res.render('resultChild', { data: parseData })
    });
})

app.post('/signup', function (req, res) {
    var userName = req.body.userName
    var userEmail = req.body.userEmail
    var userPassword = req.body.userPassword
    var userAccessToken = req.body.userAccessToken
    var userRefreshToken = req.body.userRefreshToken
    var userSeqNo = req.body.userSeqNo
    var sql = "INSERT INTO user (email, password, name, accesstoken, refreshtoken, userseqno) VALUES (?,?,?,?,?,?)"
    connection.query(sql, [userEmail, userPassword, userName, userAccessToken, userRefreshToken, userSeqNo], function (err, results, fields) {
        if (err) {
            console.error(err);
            throw err;
        }
        else {
            res.json(1);
        }
    });
})

app.post('/login', function (req, res) {
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var sql = "SELECT * FROM user WHERE email = ?"
    connection.query(sql, [userEmail], function (err, results) {
        if (err) {
            console.error(err);
            throw err;
        }
        else {
            if (results.length == 0) {
                res.json("미등록 회원")
            }
            else {
                if (userPassword == results[0].password) {
                    jwt.sign(
                        {
                            userName: results[0].name,
                            userId: results[0].id,
                            userEmail: results[0].email
                        },
                        tokenKey,
                        {
                            expiresIn: '10d',
                            issuer: 'fintech.admin',
                            subject: 'user.login.info'
                        },
                        function (err, token) {
                            console.log('로그인 성공', token)
                            res.json(token)
                        }
                    )
                }
                else {
                    res.json("비밀번호 불일치")
                }
            }
        }
    })
})

app.get('/authTest', auth, function (req, res) {
    console.log(req.decoded);
    res.json("메인 컨텐츠")
})

app.post('/list', auth, function (req, res) {
    var user = req.decoded;
    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [user.userId], function (err, results, fields) {
        if (err) {
            console.error(err);
            throw err;
        }
        else {
            console.log(results);
            var option = {
                method: "GET",
                url: "https://testapi.openbanking.or.kr/v2.0/user/me",
                headers: {
                    'Authorization': "Bearer " + results[0].accesstoken
                },
                qs: {
                    user_seq_no: results[0].userseqno
                }
            }
            request(option, function (error, response, body) {
                var parseData = JSON.parse(body);
                res.json(parseData);
            });
        }
    });
})

app.post('/balance', auth, function (req, res) {
    var user = req.decoded;
    console.log(user.userName + "접속하여 잔액조회를 합니다.");
    var finusenum = req.body.fin_use_num
    console.log("fin_use_num : " + finusenum);

    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991608770U" + countnum;
    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [user.userId], function (err, results, fields) {
        var option = {
            method: "GET",
            url: "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
            headers: {
                'Authorization': "Bearer " + results[0].accesstoken
            },
            qs: {
                bank_tran_id: transId,
                fintech_use_num: finusenum,
                tran_dtime: "20200205172120"
            }
        };
        request(option, function (error, response, body) {
            var parseData = JSON.parse(body);
            res.json(parseData);
        });
    });
})


app.post('/transaction', auth, function (req, res) {
    console.log("hello transaction");


    var user = req.decoded;
    console.log(user.userName + "접속하여 거래내역을 조회합니다.");

    //핀테크이용번호
    var finusenum = req.body.fintech_use_num
    console.log("fin_use_num : " + finusenum);

    //은행거래고유번호
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991608770U" + countnum;

    //token으로 사용자 확인
    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [user.userId], function (err, results, fields) {
        var option = {
            method: "GET",
            url: "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
            headers: {
                'Authorization': "Bearer " + results[0].accesstoken
            },
            qs: {
                bank_tran_id: transId,
                fintech_use_num: finusenum,
                inquiry_type: "A",
                inquiry_base: "D",
                from_date: "20190101",
                to_date: "20190101",
                sort_order: "D",
                tran_dtime: "20200205172120"
            }
        };
        request(option, function (error, response, body) {
            var parseData = JSON.parse(body);
            res.json(parseData);
        });
    });
})



// app.post('/withdraw', auth, function (req, res) {
//     console.log("hello withdraw");

//     var user = req.decoded;
//     console.log(user.userName + "접속하여 출금이체합니다.");

//     // var bank_tran_id = req.body.bank_tran_id
//     // console.log("fin_use_num : " + bank_tran_id);

//     // var cntr_account_type = req.body.cntr_account_type
//     // console.log("fin_use_num : " + cntr_account_type);

//     // var cntr_account_num = req.body.cntr_account_num
//     // console.log("fin_use_num : " + cntr_account_num);

//     // var dps_print_content = req.body.dps_print_content
//     // console.log("fin_use_num : " + dps_print_content);

//     // var fintech_use_num = req.body.fintech_use_num
//     // console.log("fin_use_num : " + fintech_use_num);

//     // var tran_amt = req.body.tran_amt
//     // console.log("fin_use_num : " + tran_amt);

//     // var tran_dtime = req.body.tran_dtime
//     // console.log("fin_use_num : " + tran_dtime);

//     // var req_client_name = req.body.req_client_name
//     // console.log("fin_use_num : " + req_client_name);

//     // var req_client_num = req.body.req_client_num
//     // console.log("fin_use_num : " + req_client_num);

//     // var transfer_purpose = req.body.transfer_purpose
//     // console.log("fin_use_num : " + transfer_purpose);

//     //token으로 사용자 확인
//     var sql = "SELECT * FROM user WHERE id = ?"
//     connection.query(sql, [user.userId], function (err, results, fields) {
//         var option = {
//             method: "POST",
//             url: "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
//             headers: {
//                 'Authorization': "Bearer " + results[0].accesstoken
//             },
//             qs: {
//                 "bank_tran_id": req.body.bank_tran_id,
//                 "cntr_account_type": req.body.cntr_account_type,
//                 "cntr_account_num": req.body.cntr_account_num,
//                 "dps_print_content": req.body.dps_print_content,
//                 "fintech_use_num": req.body.fintech_use_num,
//                 "tran_amt": req.body.tran_amt,
//                 "tran_dtime": req.body.tran_dtime,
//                 "req_client_name": req.body.req_client_name,
//                 "req_client_num": req.body.req_client_num,
//                 "transfer_purpose": req.body.transfer_purpose
//             }
//         };
//         request(option, function (error, response, body) {
//             var parseData = JSON.parse(body);
//             res.json(parseData);
//         });
//     });
// })


app.post('/withdrawQr',auth, function(req, res){
    var finusenum = req.body.qrFin;
    var userId = req.decoded.userId
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991608770U" + countnum;
    connection.query('SELECT * FROM user WHERE id = ?', [userId], function (error, results, fields) {
        if (error) throw error;
        var option = {
            method : "post",
            url : "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
            headers : {
                Authorization : "Bearer " + results[0].accesstoken
            },
            json : {
                "bank_tran_id": transId,
                "cntr_account_type": "N",
                "cntr_account_num": "9177326590",
                "dps_print_content": "쇼핑몰환불",
                "fintech_use_num": "199159919057870978715901",
                "wd_print_content": "쇼핑몰환불",
                "tran_amt": "1000",
                "req_client_fintech_use_num" : "199160877057881837130301",
                "tran_dtime": "20200205172120",
                "req_client_name": "최예원",
                "req_client_num" : "9177326590",
                "transfer_purpose" : "TR",
                "recv_client_name": "최예원",
                "recv_client_bank_code": "023",
                "recv_client_account_num": "9177326590"
            }
        }
        request(option, function (error, response, body) {
            console.log(body);
            var resultObject = body;
            if(resultObject.rsp_code == "A0000"){
                res.json(1);
            } 
            else {
                res.json(resultObject.rsp_code)
            }

        });
    });
}) 


app.listen(3000)