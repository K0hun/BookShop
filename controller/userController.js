const conn = require('../mariadb'); // db 모듈
const { StatusCodes } = require('http-status-codes'); // status code 모듈
const jwt = require('jsonwebtoken'); // jwt 모듈
const crypto = require('crypto'); // crypto 모듈 : 암호화
const dotenv = require('dotenv'); // dotenv 모듈
dotenv.config();

const join = (req, res) => {
    const { email, password } = req.body;

    const salt = crypto.randomBytes(10).toString('base64');
    const hashPassword = crypto.pbkdf2Sync(password, salt, 10000, 10, 'sha512').toString('base64');

    let sql = 'insert into users (email, password, salt) values (?, ?, ?)';
    let values = [email, hashPassword, salt];
    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }
        return res.status(StatusCodes.CREATED).json(results);
    });
};

const login = (req, res) => {
    const { email, password } = req.body;

    let sql = 'select * from users where email = ?';
    conn.query(sql, email, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }

        const loginUser = results[0];

        const hashPassword = crypto.pbkdf2Sync(password, loginUser.salt, 10000, 10, 'sha512').toString('base64');

        if (loginUser && loginUser.password == hashPassword) {
            const token = jwt.sign({
                id : loginUser.id,
                email: loginUser.email
            }, process.env.PRIVATE_KEY, {
                expiresIn: '5m',
                issuer: 'hoon'
            });

            res.cookie('token', token, {
                httpOnly: true
            });
            console.log(token);

            return res.status(StatusCodes.OK).json(results);
        } else {
            return res.status(StatusCodes.UNAUTHORIZED);
        }
    });
};

const passwordResetRequest = (req, res) => {
    const { email } = req.body;

    let sql = 'select * from users where email = ?';
    conn.query(sql, email, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }
        const user = results[0];
        if (user) {
            return res.status(StatusCodes.OK).json({
                email: email
            });
        } else {
            return res.status(StatusCodes.UNAUTHORIZED).end();
        }
    });
};

const passwordReset = (req, res) => {
    const { email, password } = req.body;

    const salt = crypto.randomBytes(10).toString('base64');
    const hashPassword = crypto.pbkdf2Sync(password, salt, 10000, 10, 'sha512').toString('base64');

    let sql = 'update users set password = ?, salt = ? where email = ?';
    let values = [hashPassword, salt, email];
    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }
        if (results.affectedRows == 0) {
            return res.status(StatusCodes.BAD_REQUEST).end();
        } else {
            return res.status(StatusCodes.OK).json(results);
        }
    });
};

module.exports = {
    join,
    login,
    passwordResetRequest,
    passwordReset
};