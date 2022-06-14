const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
var isValid = require("date-fns/isValid");

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validation = (request, response, next) => {
  //   response.send(request.method);
  if (request.method === "GET") {
    const { priority = "", category = "", status = "" } = request.query;
    if (["HIGH", "MEDIUM", "LOW", ""].includes(priority)) {
      if (["TO DO", "IN PROGRESS", "DONE", ""].includes(status)) {
        if (["WORK", "HOME", "LEARNING", ""].includes(category)) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    const { priority = "", category = "", status = "" } = request.body;
    if (["HIGH", "MEDIUM", "LOW", ""].includes(priority)) {
      if (["TO DO", "IN PROGRESS", "DONE", ""].includes(status)) {
        if (["WORK", "HOME", "LEARNING", ""].includes(category)) {
          next();
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }
};

const outPutResult = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

// API 1

app.get("/todos/", validation, async (request, response) => {
  const {
    offset = 0,
    limit = 10,
    order = "ASC",
    order_by = "id",
    search_q = "",
    priority = "",
    category = "",
    status = "",
  } = request.query;

  const getTodoQuery = `
    SELECT
      *
    FROM
     todo
    WHERE
     todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' AND status LIKE '%${status}%' AND category LIKE '%${category}%'
    ORDER BY ${order_by} ${order}
    LIMIT ${limit} OFFSET ${offset};`;
  const todo_result = await database.all(getTodoQuery);
  response.send(todo_result.map((eachItem) => outPutResult(eachItem)));
});

// API 2
app.get("/todos/:todoId/", validation, async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(outPutResult(todo));
});

// API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const requestQuery = `select * from todo where due_date='${newDate}';`;
    const responseResult = await database.all(requestQuery);
    response.send(responseResult.map((eachItem) => outPutResult(eachItem)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// API 4

app.post("/todos/", validation, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (isMatch(dueDate, "yyyy-MM-dd")) {
    const postNewDueDate = format(new Date(dueDate), "yyyy-MM-dd");
    const postTodoQuery = `
  INSERT INTO
    todo (id, todo, category,priority, status, due_date)
  VALUES
    (${id}, '${todo}', '${category}','${priority}', '${status}', '${postNewDueDate}');`;
    await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// API 5

app.put("/todos/:todoId/", validation, async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);
  //   response.send(previousTodo);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;
  if (isMatch(dueDate, "yyyy-MM-dd")) {
    const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// API 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
