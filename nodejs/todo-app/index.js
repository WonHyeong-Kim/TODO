const express = require('express')
const bodyParser = require("body-parser");
const app = express()


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
app.use(bodyParser.urlencoded({extended: true}));

//signup////////////////////////////////////////////////////////
// 회원 가입
app.post('/signup', (req, res) => {
    console.log("/signup");
    let params1 = [req.body.user_id];
    let sql = 'SELECT id FROM todo.user WHERE user_id = ?';
    maria.query(sql, params1, function(err, rows, fields) {
        if(!err){
            console.log(rows.length);
            if(rows.length == 0){
                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(req.body.password, salt, function(err, hash) {
                        // Store hash in your password DB.
                        myPass = hash;
                        let insert_sql = "INSERT INTO todo.user (user_id, password) VALUES (?, ?)";
                        var params = [req.body.user_id, myPass];
                        console.log(params);
                        maria.query(insert_sql, params, function(err, rows, fields) {
                            if(!err){
                                console.log("success");
                                return res.status(200).json({
                                    msg : '회원가입에 성공하였습니다.'
                                    //,token : newUserToken 
                                });
                            } else{
                                console.log("err : ", err);
                                return res.status(400).json({msg : 'db failed'});
                            }
                            });
                        });
                });
            }else{
                return res.status(400).json({msg : '이미 같은 아이디가 존재합니다'});
            }
        }
        else {
            console.log(false);
            return res.status(400).json({msg : 'db failed'});
        }
      });

    
})
//signin////////////////////////////////////////////////////////
app.post('/signin', (req, res) => {
    console.log("/signin");
    const {user_id, password} = req.body;
    sel_sql = "select * from user where user_id = ?";
    params = [user_id];
    maria.query(sel_sql, params, function(err, rows, fileds) {
        if(!err){
            if(rows != undefined) {
                if(rows[0] == undefined) {
                    res.send(null)
                } else {
                    // Load hash from your password DB.
                    bcrypt.compare(password, rows[0].password, async function(err, result) {
                        // result == true
                        if(result == true) {
                            user = {
                                id: rows[0].user_id
                            }
                            const accessToken = jwt.sign(user);
                            const refreshToken = jwt.refresh();
                            
                            // 발급한 refresh token을 redis에 key를 user의 id로 하여 저장합니다.
                            try{
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
            
        }else{
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
    if(verifyResult.ok){
        req.user = user
        next();
    }else{
        res.sendStatus(401);
    }
  }

// To-Do 항목을 읽기
app.get('/api/v1/todo/readTodo', authenticateToken, (req, res) => {
    console.log("readTodo");
    maria.query('SELECT id, title, contains, complete FROM todo.todo_list WHERE deleted_at is null', function(err, rows, fields) {
        let result = {"status": 200};
        if(!err){
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
    let result = {"status": 200};
    let insert_sql = "INSERT INTO todo.todo_list (title, contains, complete, created_at, updated_at, deleted_at) VALUES (?, ?, ?, now(), null, null)";
    var params = [req.body.title, req.body.contains, req.body.complete];
    console.log(params);
    if(typeof req.body.title != "string"){
        result["status"] = 400;
        result["error"] = "title is not string";
        res.send(result);
        return;
    }
    if(typeof req.body.contains != "string"){
        result["status"] = 400;
        result["error"] = "contains is not string";
        res.send(result);
        return;
    }
    if(typeof req.body.complete != "number"){
        result["status"] = 400;
        result["error"] = "complete is not number";
        res.send(result);
        return;
    }
    if(req.body.complete != 0 && req.body.complete != 1){
        result["status"] = 400;
        result["error"] = "complete out of range";
        res.send(result);
        return;
    }
    
    maria.query(insert_sql, params, function(err, rows, fields) {
        if(!err){
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["result"] = true;
            
            res.send(result);
        } else{
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
    let result = {"status": 200};
    let update_sql = "UPDATE todo.todo_list SET title = ?, contains = ?, complete = ? WHERE id = ?";
    var params = [req.body.title, req.body.contains, req.body.complete, req.body.id];
    console.log(params);
    if(typeof req.body.title != "string"){
        result["status"] = 400;
        result["error"] = "title is not string";
        res.send(result);
        return;
    }
    if(typeof req.body.contains != "string"){
        result["status"] = 400;
        result["error"] = "contains is not string";
        res.send(result);
        return;
    }
    if(typeof req.body.complete != "number"){
        result["status"] = 400;
        result["error"] = "complete is not number";
        res.send(result);
        return;
    }
    if(req.body.complete != 0 && req.body.complete != 1){
        result["status"] = 400;
        result["error"] = "complete out of range";
        res.send(result);
        return;
    }
    if(typeof req.body.id != "number"){
        result["status"] = 400;
        result["error"] = "id is not number";
        res.send(result);
        return;
    }

    maria.query(update_sql, params, function(err, rows, fields) {
        if(!err){
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["result"] = true;
            
            res.send(result);
        } else{
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
    
    let result = {"status": 200};
    console.log(req.body.id);
    if(typeof req.body.id != "number"){
        result["status"] = 400;
        result["error"] = "type is not number";
        res.send(result);
        return;
    }

    var params = [req.body.id];
    let delete_sql = "UPDATE todo.todo_list SET deleted_at = now() WHERE id = ?";
    maria.query(delete_sql, params, function(err, rows, fields) {
        // let result = {"status": 200};
        if(!err){
            console.log("success");
            console.log(rows);
            result["status"] = 200;
            result["result"] = true;

            res.send(result);
        } else{
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
