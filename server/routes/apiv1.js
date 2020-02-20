const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const config = require(__dirname + '/config.js');
const nodemailer = require('nodemailer');
const async = require('async');

// Use body parser to parse JSON body
router.use(bodyParser.json());
// const connAttrs = mysql.createConnection(config.connection);
const connAttrs = config.connection;

router.get('/', function (req, res) {
    res.sendfile('/')
});

/*********
 * login
 * confirmed working */ 
router.post('/signin', function (req, res) {

    let user1 = {
        username: req.body.username,
        password: req.body.password
    }
    if (!user1) {
        return res.status(400).send({
            error: true,
            message: 'Please provide login details'
        });
    }
    connection = mysql.createConnection(connAttrs);        

        connection.query("SELECT * FROM users where username=? ", user1.username, function (error, result) {
        if (error || result < 1) {
            res.set('Content-Type', 'application/json');
            var status = error ? 500 : 404;
            res.status(status).send(JSON.stringify({
                status: status,
                message: error ? "Error getting the that Username" : "Username you have entered is Incorrect. Kindly Try Again. or Contact systemadmin",
                detailed_message: error ? error.message : ""
            }));
            console.log('========= You have Got an error ================ for this User: ' + user1.username);
            return (error);
        } else {
            user = result[0];


            bcrypt.compare(req.body.password, user.user_password, function (error, pwMatch) {
                var payload;
                if (error) {
                    return (error);
                }
                if (!pwMatch) {
                    res.status(401).send({
                        message: 'Wrong Password. please Try Again .'
                    });
                    return;
                }
                payload = {
                    sub: user.email,
                    entity_id: user.user_id,
                    username: user.username
                };

                res.status(200).json({
                    user: {
                        username: user.username
                    },
                    token: jwt.sign(payload, config.jwtSecretKey, {
                        expiresIn: 60 * 60 * 24
                    }) //EXPIRES IN ONE DAY,
                });
            });
        }

    });
    connection.end(function (err) {
        if (err) {
            console.error(err);
        }
    });
});


/*******
 * onboarding a user --- confirmed working
 */
router.post('/register', function post(req, res, next) { //   

    connection = mysql.createConnection(connAttrs);

    var user = {
        username: req.body.username,
        email: req.body.email,
        user_type_id: req.body.user_type_id,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        user_details: req.body.user_details
    };
    var unhashedPassword = req.body.user_password;
    bcrypt.genSalt(10, function (err, salt) {
        if (err) {
            return next(err);
        }
        // console.log(password);
        bcrypt.hash(unhashedPassword, salt, null, function (err, hash) {
            if (err) {
                return next(err);
            }
            // console.log(hash);
            user.hashedPassword = hash;

            connection.query("SELECT * FROM users where email=?", user.email, function (error, result) {
                    if (error || result.length > 0) {
                        res.set('Content-Type', 'application/json');
                        var status = error ? 500 : 404;
                        res.status(status).send(JSON.stringify({
                            status: status,
                            message: error ? "Error getting the server" : "Email you have entered is already exist.",
                            detailed_message: error ? error.message : `Please use a different Email`
                        }));
                        console.log("error occored");
                        return (error);
                    }
                    console.log('Got It now');
                    connection.query("INSERT INTO users SET ? ", {
                        email: user.email,
                        username: user.username,
                        user_password: user.hashedPassword,
                        user_type_id: user.user_type_id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        user_status: 'Pending',
                        user_details: user.user_details
                    }, function (error, results) {
                        console.log('Its Here');
                        if (error) {
                            res.set('Content-Type', 'application/json');
                            res.status(500).send(JSON.stringify({
                                status: 500,
                                message: "Error Posting your details",
                                detailed_message: error.message
                            }));
                        } else {
                            console.log(`Account for ${user.username}, succesfully created on ${new Date()}`);
                            return res.contentType('application/json').status(201).send(JSON.stringify(results));
                        }
                    });
                });
        });
    });

});


/***
 * Add quiz to the system -- confirmed working
 */

router.post('/newQuiz', function (req, res) {
   


    var newQuiz = {
        quiz_name: req.body.quiz_name,
        quiz_subject: req.body.quiz_subject,
        quiz_class: req.body.quiz_class,
        quiz_pass_score: req.body.quiz_pass_score,
        quiz_reward: req.body.quiz_reward,
        quiz_duration: req.body.quiz_duration,
        quiz_dead_line: req.body.quiz_dead_line,
        quiz_teacher: req.body.quiz_teacher,
        quiz_status: req.body.quiz_status,
        quiz_details: req.body.quiz_details
    }
    // token
    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });
    // verifyning token
    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        connection.query(

            "SELECT * FROM quizes where quiz_name=? ", newQuiz.quiz_name, function (error, result) {
                if (error || result.length > 0) {
                    res.set('Content-Type', 'application/json');
                    var status = error ? 500 : 404;
                    res.status(status).send(JSON.stringify({
                        status: status,
                        message: error ? "Error getting the server" : `Quiz name you have entered was already captured`,
                        detailed_message: error ? error.message : `Please choose a different name`
                    }));
                    console.log("error occured");
                    return (error);
                }
                connection.query("INSERT INTO quizes SET ? ", {
                    quiz_name: newQuiz.quiz_name,
                    quiz_subject: newQuiz.quiz_subject,
                    quiz_class: newQuiz.quiz_class,
                    quiz_pass_score: newQuiz.quiz_pass_score,
                    quiz_reward: newQuiz.quiz_reward,
                    quiz_duration: newQuiz.quiz_duration,
                    quiz_dead_line: newQuiz.quiz_dead_line,
                    quiz_teacher: decoded.entity_id,
                    quiz_status: newQuiz.quiz_status,
                    quiz_details: newQuiz.quiz_details
                }, function (error, results) {
                    if (error) {
                        res.set('Content-Type', 'application/json');
                        res.status(500).send(JSON.stringify({
                            status: 500,
                            message: "Error Creating new Quiz",
                            detailed_message: error.message
                        }));
                    } else {
                        console.log(`${decoded.username}, succesfully added New Quiz: ${newQuiz.quiz_name} on ${new Date()}`);
                        return res.contentType('application/json').status(201).send(JSON.stringify(results));
                    }
                })
            })

    });
})



/***
 * creating Questions by teacher -- confirmed workinh
 */

router.post('/newQuestion', function (req, res) {


    var newQuestion = {
        quiz_id: req.body.quiz_id,
        question_narration: req.body.question_narration,
        question_points: req.body.question_points,
        question_multiiple_answe_yn: req.body.question_multiiple_answe_yn,
        question_details: req.body.question_details,
        question_number: req.body.question_number,
        question_passage: req.body.question_passage,
        requires_actual_answer_yn: req.body.requires_actual_answer_yn,
        requires_passage_answer_yn: req.body.requires_passage_answer_yn
    }

    // token
    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        connection.query("INSERT INTO questions SET ? ", {
            quiz_id: newQuestion.quiz_id,
            question_narration: newQuestion.question_narration,
            question_points: newQuestion.question_points,
            question_multiiple_answe_yn: newQuestion.question_multiiple_answe_yn,
            question_details: newQuestion.question_details,
            question_number: newQuestion.question_number,
            question_passage: newQuestion.question_passage,
            requires_actual_answer_yn: newQuestion.requires_actual_answer_yn,
            requires_passage_answer_yn: newQuestion.requires_passage_answer_yn
        }, function (error, results) {
            if (error) {
                res.set('Content-Type', 'application/json');
                res.status(500).send(JSON.stringify({
                    status: 500,
                    message: "Error Posting new Question ",
                    detailed_message: error.message
                }));
            } else {
                console.log(`${decoded.username}, succesfully added Question on ${new Date()}`);
                return res.contentType('application/json').status(201).send(JSON.stringify(results));
            }
        })


    });
})


/***
 * creating new answeres for questions --confirmed working
 */

router.post('/newAnswers', function (req, res) {

     var newAnswers = {
        answer_id: req.body.answer_id,
        question_id: req.body.question_id,
        answer_narration: req.body.answer_narration,
        answer_correct: req.body.answer_correct,
        answer_details: req.body.answer_details
    }
    // token
    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        connection.query("INSERT INTO answers SET ? ", {
            answer_id: newAnswers.answer_id,
            question_id: newAnswers.question_id,
            answer_narration: newAnswers.answer_narration,
            answer_correct: newAnswers.answer_correct,
            answer_details: newAnswers.answer_details           
        }, function (error, results) {
            if (error) {
                res.set('Content-Type', 'application/json');
                res.status(500).send(JSON.stringify({
                    status: 500,
                    message: "Error Posting new Answers",
                    detailed_message: error.message
                }));
            } else {
                console.log(`${decoded.username}, succesfully added Answer on ${new Date()}`);
                return res.contentType('application/json').status(201).send(JSON.stringify(results));
            }
        })


    });
})


/***
 * creating new pupil Group -- confirmed working
 */

router.post('/newGroup', function (req, res) {


    var newGroup = {       
        group_name: req.body.group_name,
        group_details: req.body.group_details
    }
    // token
    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }
        connection = mysql.createConnection(connAttrs);
        connection.query("INSERT INTO groups SET ? ", {           
            group_name: newGroup.group_name,
            group_details: newGroup.group_details
        }, function (error, results) {
            if (error) {
                res.set('Content-Type', 'application/json');
                res.status(500).send(JSON.stringify({
                    status: 500,
                    message: "Error Posting new Pupil Group",
                    detailed_message: error.message
                }));
            } else {
                console.log(`${decoded.username}, succesfully added a New Pupil Group on ${new Date()}`);
                return res.contentType('application/json').status(201).send(JSON.stringify(results));
            }
        })


    });
})


/****************
 * adding pupil to group --confirmed working
 */

router.post('/addToGroup', function (req, res) {

  
    var newGroup = {
        user_id: req.body.user_id,
        group_id: req.body.group_id
    }
    // token
    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }
        connection = mysql.createConnection(connAttrs);
        connection.query("INSERT INTO pupil_groups SET ? ", {
            user_id: newGroup.user_id,
            group_id: newGroup.group_id
        }, function (error, results) {
            if (error) {
                res.set('Content-Type', 'application/json');
                res.status(500).send(JSON.stringify({
                    status: 500,
                    message: "Error Posting new Pupil Group",
                    detailed_message: error.message
                }));
            } else {
                console.log(`${decoded.username}, succesfully added New Pupil to a Group on ${new Date()}`);
                return res.contentType('application/json').status(201).send(JSON.stringify(results));
            }
        })


    });
})


/*****
 * pulling list of usersTypes available --confirmed working
 */
router.post('/userType', function (req, res) {

   
    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM user_type";
        connection.query(sql, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No UserTypes found",
                    detailed_message: error ? error.message : "Sorry there are no usertypes set. Please consider setting"
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log(`All Usertype selection Released succesfullly by ${decoded.username} on ${new Date()}`);
        });
    });
})



/********
 * pulling list of all users available -- confirmed working
 */
router.post('/allUser', function (req, res) {

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM users";
        connection.query(sql, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Users found",
                    detailed_message: error ? error.message : "Sorry there are no Users set. Please consider adding Users"
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log(`All Users selection Released succesfullly by ${decoded.username} on ${new Date()}`);
        });
    })
});



/*************
 * pulling particular users of particular  Status -- confirmed working
 */
router.post('/userStatus', function (req, res) {
    var userStatus = req.body.status;

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM users where user_status=?";
        connection.query(sql, userStatus, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Users found",
                    detailed_message: error ? error.message : `Sorry there are no users found with status ${userStatus}.`
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log(`All User with Status ${userStatus} selection Released succesfullly by ${decoded.username} on ${new Date()}`);
        });
    })
});




/*************
 * pulling particular users of particular  userType -- confirmed working
 */
router.post('/users', function (req, res) {
    var userTypeId = req.body.user_type_id;

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM users where user_type_id=?";
        connection.query(sql, userTypeId, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Users found",
                    detailed_message: error ? error.message : `Sorry there are no users found. Please consider Adding`
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log(`Users with type ${userTypeId} selection Released succesfullly by ${decoded.username} on ${new Date()}`);
        });
    })
});


/***********
 * pulling list  groups -- confirmed working
 */

router.post('/groups', function (req, res) {

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM groups";
        connection.query(sql, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Pupil Groups found",
                    detailed_message: error ? error.message : `Sorry there are no groups found. Please consider Adding One`
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log('POST /groups released');
        });
    })
});



/***********
 * pulling list of pupils added to  groups --- confirmed working
 */

router.post('/groupsPupils', function (req, res) {

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM pupil_groups";
        connection.query(sql, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Pupil found",
                    detailed_message: error ? error.message : `Sorry there are no pupils found in any of the groups. Please consider Adding One`
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log('POST /groups released');
        });
    })
});





/******
  * pulling list of available quizes -- confirmed working
  */

router.post('/allQuizes', function (req, res) {

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }

        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT * FROM quizes";
        connection.query(sql, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Quiz found",
                    detailed_message: error ? error.message : `Sorry there are no Quiz found. Please consider setting`
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log(`All Quizes selection Released succesfullly by ${decoded.username} on ${new Date()}`);
        });
    })
});


/*******
 * pulling list of quizes with diffrent status --- confirmed working
 */
router.post('/quizeStatus', function (req, res) {
  
    connection = mysql.createConnection(connAttrs);    

    var quizStatus = req.body.quiz_status;

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }
       
        var sql = "SELECT * FROM quizes where quiz_status=?";
        connection.query(sql, quizStatus, function (error, results) {
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Quiz found",
                    detailed_message: error ? error.message : `Sorry there are no Quiz found. Please consider setting`
                }));
                return (error);
            }

            res.contentType('application/json').status(200).send(JSON.stringify(results));
            console.log(`All Quizes with status ${quizStatus} selection Released succesfullly by ${decoded.username} on ${new Date()}`);
        });
    })
    connection.end(function (err) {
        if (err) {
            console.error(err);
        }
    });
});


/*******
 * pulling Questions for particular quiz
 */

router.post('/questionsiquiz', function (req, res) {
    "use strict";

    var token = req.body.token;
    if (!token) return res.status(401).send({
        auth: false,
        message: 'No token provided.'
    });

    jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
            });
        }
        connection = mysql.createConnection(connAttrs);
        var sql = "SELECT quiz_id, quiz_name, quiz_subject, quiz_pass_score, quiz_reward, quiz_duration FROM quizes where quiz_id=?";
        connection.query(sql, req.body.quiz_id, function (error, results) {
            var sqheaders = {};
            if (error || results.length < 1) {
                res.set('Content-Type', 'application/json');
                var status = error ? 500 : 404;
                res.status(status).send(JSON.stringify({
                    status: status,
                    message: error ? "Error getting the server" : "No Quiz found",
                    detailed_message: error ? error.message : `Sorry there are no Quiz found. Please consider setting`
                }));
                return (error);
            }
            console.log('Quizresults', results);
            sqheaders.quizId = results[0].quiz_id;
            sqheaders.quizName = results[0].quiz_name;
            sqheaders.quizSubject = results[0].quiz_subject;
            sqheaders.quizPassScore = results[0].quiz_pass_score;
            sqheaders.quizReward = results[0].quiz_reward;
            sqheaders.quizDuration = results[0].quiz_duration;
            console.log('Quizresults', sqheaders);
            res.set('Content-Type', 'application/json');
            listquestions(sqheaders, connection, res);
            //getquestiondetails (sqheaders, connection,res);
            
        });
    })
});
   

function listquestions(sqheaders, connection, res) {
        console.log('Here');
    var sql = "SELECT question_id, question_number, question_passage, question_narration, question_points, requires_actual_answer_yn, requires_passage_answer_yn, question_multiiple_answe_yn, question_details FROM questions where quiz_id=?";
    connection.query(sql, sqheaders.quizId, function (error, results) {   
        console.log('Here again', sqheaders.quizId);     
        if (error || results.length < 1) {
            res.set('Content-Type', 'application/json');
            var status = error ? 500 : 404;
            res.status(status).send(JSON.stringify({
                status: status,
                message: error ? "Error getting the server" : "No Questions found",
                detailed_message: error ? error.message : `Sorry there are no Questions found.`
            }));
            return (error);
        }
            sqheaders.questions = [];
            console.log('Here Questions', results); 
            results.forEach(function (row) {
                console.log('row', row);
                var qlist = {};
                qlist.questionId = row.question_id;
                qlist.questionNumber = row.question_number;                
                qlist.passage = row.question_passage;
                qlist.questionNarration = row.question_narration;
                qlist.questionPoints = row.question_points;
                qlist.requireActualAnswer = row.requires_actual_answer_yn;
                qlist.requirePassageAnswer = row.requires_passage_answer_yn;
                qlist.requireMultipleAnswer = row.question_multiiple_answe_yn;
                qlist.questionDetails = row.question_details;
                console.log('Here Questions', qlist); 
                sqheaders.questions.push(qlist);
            });
            async.eachSeries(
                sqheaders.questions,
                function (qlist, cb) {
                    connection.query("SELECT answer_id, answer_narration, answer_correct, answer_details, question_id FROM answers WHERE question_id=?", qlist.questionId,
                        function (err, results) {
                            if (err) {
                                cb(err);
                                return;
                            }
                            qlist.options = [];
                            results.forEach(function (row) {
                                var qa = {};
                                qa.answerId = row.answer_id;
                                qa.AnswerNarration = row.answer_narration;
                                qa.isAnswer = row.answer_correct;
                                qa.answerDetails = row.answer_details;
                                qa.questionId = row.question_id
                                qlist.options.push(qa);
                            });
                            cb();
                        }
                    );
                },
                function (err) {
                    if (err) throw err;
                    //callback(null, JSON.stringify(department));
                    res.send(JSON.stringify(sqheaders));
                    connection.end(function (err) {
                        if (err) {
                            console.error(err);
                        }
                    });
                }
            );

            //res.send(JSON.stringify(sqheaders));

        }   ///function (err,results) 

    );
}


/**********//********
 */ 
/*** Assinging a quiz to pupil
 * 
*/
router.post('/assignToPupil', function (req, res) {

    var toAssign = {
        quiz_id: req.body.quiz_id,
        user_id: req.body.user_id,
        start_date: req.body.start_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        end_date: req.body.end_date,
        is_group: req.body.is_group
    }
   // token
   var token = req.body.token;
   if (!token) return res.status(401).send({
       auth: false,
       message: 'No token provided.'
   });

   jwt.verify(token, config.jwtSecretKey, function (err, decoded) {
       if (err) {
           return res.status(500).send({
               auth: false,
               message: 'Sorry Your Token is not genuine. Failed to authenticate token.'
           });
       }

       connection = mysql.createConnection(connAttrs);
       connection.query("INSERT INTO quiz_assignment SET ? ", {
           quiz_id: toAssign.quiz_id,
           user_id: toAssign.user_id,
           start_date: toAssign.start_date,
           start_time: toAssign.start_time,
           end_time: toAssign.end_time,
           end_date: toAssign.end_date,
           is_group: toAssign.is_group
       }, function (error, results) {
           if (error) {
               res.set('Content-Type', 'application/json');
               res.status(500).send(JSON.stringify({
                   status: 500,
                   message: "Error Assigning the quiz",
                   detailed_message: error.message
               }));
           } else {
               console.log(`${decoded.username}, succesfully assigned quiz at ${new Date()}`);
               return res.contentType('application/json').status(201).send(JSON.stringify(results));
           }
       })


   });
})

module.exports = router;