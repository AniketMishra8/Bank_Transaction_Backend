const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
 * User Registration Controller
 * POST /api/auth/register
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>} Returns JSON with created user details and JWT token
 */
async function userRegisterController(req, res) {
    try {
        const { email, password, name } = req.body

        // Input sanitization
        const trimmedName = typeof name === "string" ? name.trim() : ""
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
        const userPassword = typeof password === "string" ? password : ""

        // Field-level validation
        const errors = []
        if (!trimmedName || trimmedName.length < 2) {
            errors.push("Name is required and must be at least 2 characters long")
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            errors.push("A valid email address is required (e.g. user@example.com)")
        }

        if (!userPassword || userPassword.length < 6) {
            errors.push("Password is required and must be at least 6 characters long")
        }

        if (errors.length > 0) {
            return res.status(400).json({
                status: "failed",
                message: "Validation failed",
                errors
            })
        }

        const isExists = await userModel.findOne({
            email: normalizedEmail
        })

        if (isExists) {
            return res.status(422).json({
                status: "failed",
                message: "User already exists with this email address."
            })
        }

        const user = await userModel.create({
            email: normalizedEmail,
            password: userPassword,
            name: trimmedName
        })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        })

        res.status(201).json({
            status: "success",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        })

        // Fire-and-forget: asynchronous email dispatch without blocking API response
        emailService.sendRegistrationEmail(user.email, user.name).catch(err => {
            console.error("Failed to send registration email:", err.message)
        })
    } catch (err) {
        return res.status(500).json({
            status: "failed",
            message: err.message || "Internal server error"
        })
    }
}

/**
 * User Login Controller
 * POST /api/auth/login
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>} Returns JSON with authenticated user details and JWT token
 */
async function userLoginController(req, res) {
    try {
        const { email, password } = req.body

        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
        const userPassword = typeof password === "string" ? password : ""

        if (!normalizedEmail || !userPassword) {
            return res.status(400).json({
                status: "failed",
                message: "Email and password are required"
            })
        }

        const user = await userModel.findOne({ email: normalizedEmail }).select("+password")

        if (!user) {
            return res.status(401).json({
                status: "failed",
                message: "Email or password is INVALID"
            })
        }

        const isValidPassword = await user.comparePassword(userPassword)

        if (!isValidPassword) {
            return res.status(401).json({
                status: "failed",
                message: "Email or password is INVALID"
            })
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        })

        res.status(200).json({
            status: "success",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        })
    } catch (err) {
        return res.status(500).json({
            status: "failed",
            message: err.message || "Internal server error"
        })
    }
}


/**
 * User Logout Controller
 * POST /api/auth/logout
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>} Returns JSON confirmation of logout
 */
async function userLogoutController(req, res) {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

        if (!token) {
            return res.status(200).json({
                status: "success",
                message: "User logged out successfully"
            })
        }

        await tokenBlackListModel.create({
            token: token
        })

        res.clearCookie("token")

        res.status(200).json({
            status: "success",
            message: "User logged out successfully"
        })
    } catch (err) {
        return res.status(500).json({
            status: "failed",
            message: err.message || "Internal server error"
        })
    }
}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}