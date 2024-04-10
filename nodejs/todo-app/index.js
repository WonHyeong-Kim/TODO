const express = require('express')
const bodyParser = require("body-parser");
const app = express()

// db
const maria = require('./database/connect/maria');
maria.connect();
const port = 3000;

// boby parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.send('Hello')
})
// To-Do 항목을 읽기
app.get('/api/v1/todo/readTodo', (req, res) => {
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
app.put('/api/v1/todo/createTodo', (req, res) => {
    // 입력 값 체크
    console.log("createTodo");
    let insert_sql = "INSERT INTO todo.todo_list (title, contains, complete, created_at, updated_at, deleted_at) VALUES (?, ?, ?, now(), null, null)";
    var params = [req.body.title, req.body.contains, req.body.complete];
    console.log(params);
    maria.query(insert_sql, params, function(err, rows, fields) {
        let result = {"status": 200};
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
app.post('/api/v1/todo/updateTodo', (req, res) => {
    console.log("updateTodo");
    let update_sql = "UPDATE todo.todo_list SET title = ?, contains = ?, complete = ? WHERE id = ?";
    var params = [req.body.title, req.body.contains, req.body.complete, req.body.id];
    console.log(params);
    maria.query(update_sql, params, function(err, rows, fields) {
        let result = {"status": 200};
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
app.delete('/api/v1/todo/deleteTodo', (req, res) => {
    console.log("deleteTodo");
    let delete_sql = "UPDATE todo.todo_list SET deleted_at = now() WHERE id = ?";
    console.log(req.body.id);
    var params = [req.body.id];
    maria.query(delete_sql, params, function(err, rows, fields) {
        let result = {"status": 200};
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
