# TODO  
  
# 환경  
Ubuntu 20.04  
MariaDB  
  
# 설치  
cd nodejs/todo-app  
apt-get install -y nodejs  
apt install npm  
npm install express  
npm install mysql --save  
  
# 테이블  
CREATE TABLE todo.todo_list  
(  
    id bigint(20) PRIMARY KEY NOT NULL AUTO_INCREMENT,  
    title varchar(100),  
    contains varchar(200),  
    complete int(11) DEFAULT 0 COMMENT '완료:1, 미완료:0',  
    created_at datetime(3) NOT NULL,  
    updated_at datetime(3),  
    deleted_at datetime(3)  
);  
  
  
# 테스트 예제  
# To-Do 읽기  
curl -XGET http://localhost:3000/api/v1/todo/readTodo  
# To-Do 생성  
curl -XPUT http://localhost:3000/api/v1/todo/createTodo -H "Content-Type: application/json" -d '{"title": "오늘할일", "contains" : "일하기", "complete" : 0}'  
# To-Do 업데이트  
curl -XPOST http://localhost:3000/api/v1/todo/updateTodo -H "Content-Type: application/json" -d '{"id" : 5, "title" : "오늘할일", "contains" : "산책하기", "complete" : 1}'  
# To-Do 삭제  
curl -XDELETE http://localhost:3000/api/v1/todo/deleteTodo -H "Content-Type: application/json" -d '{"id" : 7}'  