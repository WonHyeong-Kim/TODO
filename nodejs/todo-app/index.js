const express = require('express')
const bodyParser = require("body-parser");
const app = express()
const fs = require("fs");
const readline = require("readline");
const google = require("googleapis");


const dotenv = require("dotenv");
dotenv.config();

//jwt
const jwt = require('./utils/jwt-util');

// bcrypt
const bcrypt = require('bcrypt');

// db
const maria = require('./database/connect/maria');
maria.connect();
const port = 3000;

// redis
const redis = require('redis');
const redisClient = redis.createClient(process.env.REDIS_PORT);


const authJwt = require('./authJWT');
const router = express.Router();

const refresh = require('./refresh');

// boby parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 직접 설정할 변수
const MY_CALENDAR =
    "https://calendar.google.com/calendar/embed?src=vbvbfgfg%40gmail.com&ctz=Asia%2FSeoul";
const COLOR_ID = 2; // 이벤트 색 (1: '#a4bdfc', 2: '#7ae7bf', 3: '#dbadff', 4: '#ff887c', 5: '#fbd75b', 6: '#ffb878', 7: '#46d6db', 8: '#e1e1e1', 9: '#5484ed', 10: '#51b749', 11: '#dc2127')

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// 구글 캘린더 저장
// 1. Post /todoWithGoogleCalendar
app.post('/todoWithGoogleCalendar', (req, res) => {
    console.log("/todoWithGoogleCalendar");
    const { start, end, summary, description } = req.body;

    // 2. 해당 API를 호출하면 새로운 일정이 로컬 Database에 저장됨과 동시에 구글 캘린더에 추가됩니다.
    // db 저장
    const startDateTime = new Date(start);//.toISOString().slice(0, 19).replace('T', ' ');
    const endDateTime = new Date(end);//.toISOString().slice(0, 19).replace('T', ' ')
    let insert_sql = "INSERT INTO todo.calendar (start, end, summary, description) VALUES (?, ?, ?, ?)";
    var params = [startDateTime, endDateTime, summary, description];
    console.log(params);

    maria.query(insert_sql, params, function (err, rows, fields) {
        if (err) {
            console.log("err : ", err);
            result["status"] = 400;
            result["error"] = err;
            res.send(result);
        }
    });
    // Load client secrets from a local file.
    fs.readFile("client_secret_922503223866-7jkal8a32ka73cqo8u5vdlg8t1qr3sqd.apps.googleusercontent.com.json", (err, content) => {
        if (err) return console.log("Error loading client secret file:", err);
        // Authorize a client with credentials, then call the Google Calendar API.
        authorize(JSON.parse(content), createEvent, req.body);
    });
    res.send('ok');
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

// 3. - Google OAuth 2.0 을 사용하여 인증, 인가 하세요.
function authorize(credentials, callback, body) {
    console.log("authorize");
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );
    console.log(TOKEN_PATH);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client, body);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback, body) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error("Error retrieving access token", err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log("Token stored to", TOKEN_PATH);
            });
            callback(oAuth2Client, body);
        });
    });
}

/**
 * Create an event on Couch Coding calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function createEvent(auth, body) {
    console.log('createEvent');

    const startDateTime = body.start;
    const startTimeUTC = new Date(startDateTime);
    const endDateTime = body.end;
    const endTimeUTC = new Date(endDateTime);

    const event = {
        summary: body.summary,
        description: body.description,
        start: { dateTime: startTimeUTC, timeZone: "Asia/Seoul" },
        end: { dateTime: endTimeUTC, timeZone: "Asia/Seoul" },
        colorId: COLOR_ID,
    };
    const calendar = google.calendar({ version: "v3", auth });
    calendar.events.insert(
        {
            calendarId: MY_CALENDAR,
            resource: event,
        },
        (err, res) => {
            if (err) return console.log("The API returned an error: " + err);
            console.log("Event created: %s", res.data);
        }
    );
}
// 구글 계정 선택 화면에서 계정 선택 후 redirect 된 주소
// 아까 등록한 GOOGLE_REDIRECT_URI와 일치해야 함
// 우리가 http://localhost:3000/login/redirect를
// 구글에 redirect_uri로 등록했고,
// 위 url을 만들 때도 redirect_uri로 등록했기 때문
app.get('/saveCalendar', (req, res) => {
    const { code } = req.query;
    console.log(`${code}`);
    // console.log(`code: ${code}`);
    res.send('ok');
});
//signup////////////////////////////////////////////////////////
// 회원 가입
app.post('/signup', (req, res) => {
    console.log("/signup");
    let params1 = [req.body.user_id];
    let sql = 'SELECT id FROM todo.user WHERE user_id = ?';
    maria.query(sql, params1, function (err, rows, fields) {
        if (!err) {
            console.log(rows.length);
            if (rows.length == 0) {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(req.body.password, salt, function (err, hash) {
                        // Store hash in your password DB.
                        myPass = hash;
                        let insert_sql = "INSERT INTO todo.user (user_id, password) VALUES (?, ?)";
                        var params = [req.body.user_id, myPass];
                        console.log(params);
                        maria.query(insert_sql, params, function (err, rows, fields) {
                            if (!err) {
                                console.log("success");
                                return res.status(200).json({
                                    msg: '회원가입에 성공하였습니다.'
                                    //,token : newUserToken 
                                });
                            } else {
                                console.log("err : ", err);
                                return res.status(400).json({ msg: 'db failed' });
                            }
                        });
                    });
                });
            } else {
                return res.status(400).json({ msg: '이미 같은 아이디가 존재합니다' });
            }
        }
        else {
            console.log(false);
            return res.status(400).json({ msg: 'db failed' });
        }
    });


})
//signin////////////////////////////////////////////////////////
app.post('/signin', (req, res) => {
    console.log("/signin");
    const { user_id, password } = req.body;
    sel_sql = "select * from user where user_id = ?";
    params = [user_id];
    maria.query(sel_sql, params, function (err, rows, fileds) {
        if (!err) {
            if (rows != undefined) {
                if (rows[0] == undefined) {
                    res.send(null)
                } else {
                    // Load hash from your password DB.
                    bcrypt.compare(password, rows[0].password, async function (err, result) {
                        // result == true
                        if (result == true) {
                            user = {
                                id: rows[0].user_id
                            }
                            const accessToken = jwt.sign(user);
                            const refreshToken = jwt.refresh();

                            // 발급한 refresh token을 redis에 key를 user의 id로 하여 저장합니다.
                            try {
                                await redisClient.connect();
                                await redisClient.set(user.id, refreshToken);
                            } catch (e) {
                                console.error(e);
                            }


                            res.status(200).send({ // client에게 토큰 모두를 반환합니다.
                                ok: true,
                                data: {
                                    accessToken,
                                    refreshToken,
                                },
                            });
                        } else {
                            res.send('실패')
                        }
                    });
                }
            } else {
                res.send('실패')
            }

        } else {
            res.send('실패')
        }
    })
});

//refresh///////////////////////////////////////////////////////////////
// JWT 만료 시 새로운 JWT 발행
app.post('/refresh', refresh)

app.get('/', (req, res) => {
    res.send('Hello')
})

//check token///////////////////////////////////////////////////////////////
function authenticateToken(req, res, next) {
    console.log("authenticateToken");
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    console.log(token);
    //token 검증
    verifyResult = jwt.verify(token);
    console.log(verifyResult);
    if (verifyResult.ok) {
        req.user = user
        next();
    } else {
        res.sendStatus(401);
    }
}

// To-Do 항목을 읽기
app.get('/api/v1/todo/readTodo', authenticateToken, (req, res) => {
    console.log("readTodo");
    maria.query('SELECT id, title, contains, complete FROM todo.todo_list WHERE deleted_at is null', function (err, rows, fields) {
        let result = { "status": 200 };
        if (!err) {
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["data"] = rows;
            res.send(result);
        }
        else {
            console.log("err : ", err);
            result["status"] = 400;
            result["error"] = err;
            res.send(result);
        }
    });
})

// To-Do 항목을 생성
app.put('/api/v1/todo/createTodo', authenticateToken, (req, res) => {
    // 입력 값 체크
    console.log("createTodo");
    let result = { "status": 200 };
    let insert_sql = "INSERT INTO todo.todo_list (title, contains, complete, created_at, updated_at, deleted_at) VALUES (?, ?, ?, now(), null, null)";
    var params = [req.body.title, req.body.contains, req.body.complete];
    console.log(params);
    if (typeof req.body.title != "string") {
        result["status"] = 400;
        result["error"] = "title is not string";
        res.send(result);
        return;
    }
    if (typeof req.body.contains != "string") {
        result["status"] = 400;
        result["error"] = "contains is not string";
        res.send(result);
        return;
    }
    if (typeof req.body.complete != "number") {
        result["status"] = 400;
        result["error"] = "complete is not number";
        res.send(result);
        return;
    }
    if (req.body.complete != 0 && req.body.complete != 1) {
        result["status"] = 400;
        result["error"] = "complete out of range";
        res.send(result);
        return;
    }

    maria.query(insert_sql, params, function (err, rows, fields) {
        if (!err) {
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["result"] = true;

            res.send(result);
        } else {
            console.log("err : ", err);
            result["status"] = 400;
            result["error"] = err;
            res.send(result);
        }
    });

})

// To-Do 항목을 업데이트
app.post('/api/v1/todo/updateTodo', authenticateToken, (req, res) => {
    console.log("updateTodo");
    let result = { "status": 200 };
    let update_sql = "UPDATE todo.todo_list SET title = ?, contains = ?, complete = ? WHERE id = ?";
    var params = [req.body.title, req.body.contains, req.body.complete, req.body.id];
    console.log(params);
    if (typeof req.body.title != "string") {
        result["status"] = 400;
        result["error"] = "title is not string";
        res.send(result);
        return;
    }
    if (typeof req.body.contains != "string") {
        result["status"] = 400;
        result["error"] = "contains is not string";
        res.send(result);
        return;
    }
    if (typeof req.body.complete != "number") {
        result["status"] = 400;
        result["error"] = "complete is not number";
        res.send(result);
        return;
    }
    if (req.body.complete != 0 && req.body.complete != 1) {
        result["status"] = 400;
        result["error"] = "complete out of range";
        res.send(result);
        return;
    }
    if (typeof req.body.id != "number") {
        result["status"] = 400;
        result["error"] = "id is not number";
        res.send(result);
        return;
    }

    maria.query(update_sql, params, function (err, rows, fields) {
        if (!err) {
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["result"] = true;

            res.send(result);
        } else {
            console.log("err : ", err);
            result["status"] = 400;
            result["error"] = err;
            res.send(result);
        }
    });
})

// To-Do 항목을 삭제
app.delete('/api/v1/todo/deleteTodo', authenticateToken, (req, res) => {
    console.log("deleteTodo");

    let result = { "status": 200 };
    console.log(req.body.id);
    if (typeof req.body.id != "number") {
        result["status"] = 400;
        result["error"] = "type is not number";
        res.send(result);
        return;
    }

    var params = [req.body.id];
    let delete_sql = "UPDATE todo.todo_list SET deleted_at = now() WHERE id = ?";
    maria.query(delete_sql, params, function (err, rows, fields) {
        // let result = {"status": 200};
        if (!err) {
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["result"] = true;

            res.send(result);
        } else {
            console.log("err : ", err);
            result["status"] = 400;
            result["error"] = err;
            res.send(result);
        }
    });


})

app.listen(port, () => {
    console.log("Open todo list API server on port " + port);
})
